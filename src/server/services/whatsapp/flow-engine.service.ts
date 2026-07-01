import { randomUUID } from 'crypto';
import { prisma } from '../../db/prisma';
import { WhatsAppMessageService } from './whatsapp-message.service';

interface FlowNodeConfig {
  messageText?: string;
  questionOptions?: string[];
  departmentId?: string;
  tagName?: string;
}

interface FlowEdgeCondition {
  conditionValue?: string;
}

export class FlowEngineService {
  /**
   * Executa a inicialização do fluxo padrão do inquilino (Welcome Flow)
   * caso ele ainda não tenha nenhum fluxo no banco.
   */
  static async bootstrapDefaultFlow(tenantId: string) {
    // Por padrão do sistema, não criamos nenhum fluxo/chatbot inicial automaticamente.
    // O cliente deve cadastrar seus fluxos de chatbot manualmente.
    return null;
  }

  /**
   * Processa uma mensagem recebida de um cliente. Verifica se existe uma sessão ativa
   * de chatbot e avança os nós de fluxo correspondentes.
   */
  static async processMessage(
    tenantId: string,
    conversationId: string,
    contactId: string,
    body: string,
    channelId: string
  ): Promise<void> {
    try {
      const cleanBody = body.trim();
      if (!cleanBody) return;

      // 1. Verificar se um atendente humano já enviou alguma mensagem nesta conversa.
      // Se sim, o chatbot não deve interferir para evitar triagens indevidas após atendimento humano iniciado.
      const hasUserMsg = await prisma.message.findFirst({
        where: {
          conversationId,
          senderType: 'user',
          deletedAt: null
        }
      });
      if (hasUserMsg) {
        console.log(`[FlowEngine] Bot disabled because conversation ${conversationId} has human messages.`);
        return;
      }

      // 2. Buscar fluxo ativo do tenant
      let flow = await prisma.flow.findFirst({
        where: { tenantId, isActive: true, deletedAt: null },
        include: { nodes: true, edges: true }
      });



      if (!flow || flow.nodes.length === 0) {
        console.log(`[FlowEngine] No active flow found for tenant: ${tenantId}`);
        return;
      }

      // 3. Buscar ou criar a sessão de fluxo atual para esta conversa
      let session = await prisma.flowSession.findFirst({
        where: {
          conversationId,
          status: 'active',
          tenantId
        }
      });

      if (!session) {
        // Se a conversa for nova e não tiver sessões anteriores, iniciar o fluxo
        console.log(`[FlowEngine] Creating a new Flow Session for conversation ${conversationId}`);
        
        // Encontrar o nó inicial real (o nó que não tem nenhuma aresta entrando nele)
        const targetNodeIds = new Set(flow.edges.map(e => e.targetNodeId));
        const startNode = flow.nodes.find(n => !targetNodeIds.has(n.id)) || flow.nodes[0];
        const startNodeId = startNode ? startNode.id : 'node-start';

        session = await prisma.flowSession.create({
          data: {
            tenantId,
            flowId: flow.id,
            conversationId,
            contactId,
            currentNodeId: startNodeId,
            status: 'active',
            contextJson: '{}'
          }
        });

        // Executar o nó inicial
        await this.executeNode(tenantId, session.id, conversationId, contactId, flow, startNodeId, channelId);
      } else {
        // Sessão já ativa: processar a resposta do cliente
        const currentNode = flow.nodes.find(n => n.id === session!.currentNodeId);
        if (!currentNode) {
          console.warn(`[FlowEngine] Current session node not found in flow: ${session.currentNodeId}`);
          return;
        }

        // Se o nó atual for do tipo 'question' (menu/pergunta), checar se a resposta coincide com as arestas
        if (currentNode.type === 'question') {
          const edges = flow.edges.filter(e => e.sourceNodeId === currentNode.id);
          let matchedEdge = null;

          for (const edge of edges) {
            try {
              const cond: FlowEdgeCondition = JSON.parse(edge.conditionJson);
              if (cond.conditionValue && cond.conditionValue.trim().toLowerCase() === cleanBody.toLowerCase()) {
                matchedEdge = edge;
                break;
              }
            } catch (e) {
              console.error('[FlowEngine] Error parsing edge conditionJson:', e);
            }
          }

          if (matchedEdge) {
            console.log(`[FlowEngine] Matched option "${cleanBody}". Advancing flow from ${currentNode.id} to ${matchedEdge.targetNodeId}`);
            
            // Avançar a sessão para o novo nó
            session = await prisma.flowSession.update({
              where: { id: session.id },
              data: { currentNodeId: matchedEdge.targetNodeId }
            });

            // Executar o novo nó
            await this.executeNode(tenantId, session.id, conversationId, contactId, flow, matchedEdge.targetNodeId, channelId);
          } else {
            // Se a opção for inválida, repetir a mensagem ou emitir aviso
            console.log(`[FlowEngine] Invalid option "${cleanBody}" in question node ${currentNode.id}`);
            await this.sendAutomationMessage(
              tenantId,
              conversationId,
              contactId,
              'Opção inválida. Por favor, responda com uma das opções válidas do menu acima.',
              channelId
            );
          }
        }
      }
    } catch (error) {
      console.error('[FlowEngine] Error processing flow message:', error);
    }
  }

  /**
   * Executa a lógica associada a um nó específico e atualiza a sessão.
   */
  private static async executeNode(
    tenantId: string,
    sessionId: string,
    conversationId: string,
    contactId: string,
    flow: any,
    nodeId: string,
    channelId: string
  ): Promise<void> {
    const node = flow.nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      console.warn(`[FlowEngine] Node not found to execute: ${nodeId}`);
      return;
    }

    let config: FlowNodeConfig = {};
    try {
      config = JSON.parse(node.configJson);
    } catch (e) {
      console.error('[FlowEngine] Error parsing node configJson:', e);
    }

    // Registrar a execução do nó para auditoria
    await prisma.flowNodeExecution.create({
      data: {
        sessionId,
        nodeId,
        nodeType: node.type,
        inputJson: '{}',
        outputJson: node.configJson,
        status: 'success'
      }
    });

    if (node.type === 'message') {
      const text = config.messageText || '';
      if (text) {
        await this.sendAutomationMessage(tenantId, conversationId, contactId, text, channelId);
      }

      // Procurar se há uma aresta de saída direta
      const edge = flow.edges.find((e: any) => e.sourceNodeId === node.id);
      if (edge) {
        // Avançar sessão e executar o próximo nó
        await prisma.flowSession.update({
          where: { id: sessionId },
          data: { currentNodeId: edge.targetNodeId }
        });
        await this.executeNode(tenantId, sessionId, conversationId, contactId, flow, edge.targetNodeId, channelId);
      } else {
        // Fim de fluxo normal
        await prisma.flowSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            currentNodeId: null,
            finishedAt: new Date()
          }
        });
      }
    } else if (node.type === 'question') {
      const text = config.messageText || 'Por favor escolha uma das opções:';
      const options = config.questionOptions || [];
      if (options.length > 0 && options.length <= 3) {
        await this.sendAutomationButtons(tenantId, conversationId, contactId, text, options, channelId);
      } else {
        await this.sendAutomationMessage(tenantId, conversationId, contactId, text, channelId);
      }
      // Fica travado no nó aguardando resposta
    } else if (node.type === 'route_department') {
      const deptId = config.departmentId;
      if (deptId) {
        const dept = await prisma.department.findUnique({
          where: { id: deptId }
        });

        // 1. Atualizar o departamento da conversa
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            departmentId: deptId,
            status: 'new' // Coloca a conversa como "new" (Fila do Setor)
          }
        });

        // 2. Registrar log de roteamento do sistema
        await prisma.routingLog.create({
          data: {
            tenantId,
            conversationId,
            departmentId: deptId,
            routingReason: `Encaminhado ao setor ${dept?.name || 'Vendas'} pelo menu de opções do chatbot.`,
            distributionMode: dept?.distributionMode || 'manual'
          }
        });

        // 3. Registrar a mensagem do sistema na conversa
        await prisma.message.create({
          data: {
            tenantId,
            conversationId,
            senderType: 'system',
            senderName: 'Roteamento Automático',
            body: `Conversa direcionada ao setor ${dept?.name || 'Vendas'} pelo menu de opções.`,
            type: 'text',
            status: 'delivered',
            isRead: true
          }
        });

        // 4. Encerrar a sessão de chatbot como 'transferred'
        await prisma.flowSession.update({
          where: { id: sessionId },
          data: {
            status: 'transferred',
            currentNodeId: null,
            finishedAt: new Date()
          }
        });

        // 5. Enviar mensagem de saudação do departamento se houver
        if (dept?.greetingMessage) {
          // Atraso de 800ms para parecer humano
          await new Promise(resolve => setTimeout(resolve, 800));
          await this.sendAutomationMessage(tenantId, conversationId, contactId, dept.greetingMessage, channelId);
        }
      }
    } else if (node.type === 'tag_add') {
      const tagName = config.tagName;
      if (tagName) {
        // Encontrar o contato para carregar as tags existentes
        const contact = await prisma.contact.findUnique({
          where: { id: contactId }
        });

        // Nota: O relacionamento de tags no banco usa ContactTag.
        // No banco de dados real, a coluna tags no schema é um relacionamento N-N.
        // Vamos checar se a tag já existe no banco, se não cria, e associa.
        let tag = await prisma.tag.findFirst({
          where: { name: tagName }
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: tagName, color: '#7C3AED' }
          });
        }

        const existingLink = await prisma.contactTag.findFirst({
          where: { contactId, tagId: tag.id }
        });

        if (!existingLink) {
          await prisma.contactTag.create({
            data: { contactId, tagId: tag.id }
          });
        }
      }

      // Seguir para o próximo nó se houver
      const edge = flow.edges.find((e: any) => e.sourceNodeId === node.id);
      if (edge) {
        await prisma.flowSession.update({
          where: { id: sessionId },
          data: { currentNodeId: edge.targetNodeId }
        });
        await this.executeNode(tenantId, sessionId, conversationId, contactId, flow, edge.targetNodeId, channelId);
      } else {
        await prisma.flowSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            currentNodeId: null,
            finishedAt: new Date()
          }
        });
      }
    }
  }

  /**
   * Helper para persistir e despachar mensagens automatizadas pelo WhatsApp.
   */
  private static async sendAutomationMessage(
    tenantId: string,
    conversationId: string,
    contactId: string,
    text: string,
    channelId: string
  ): Promise<void> {
    try {
      // 1. Criar o registro da mensagem no banco
      const message = await prisma.message.create({
        data: {
          tenantId,
          conversationId,
          senderType: 'automation',
          senderName: 'Atendente HBFlow',
          body: text,
          type: 'text',
          status: 'pending',
          isRead: true
        }
      });

      // 2. Atualizar timestamps da conversa
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastUserMessageAt: new Date()
        }
      });

      // 3. Buscar telefone do contato
      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      });

      if (!contact) {
        throw new Error('Contact not found to send automation message');
      }

      // 4. Enviar mensagem de texto pelo provedor
      WhatsAppMessageService.sendTextMessage(
        tenantId,
        channelId,
        contact.phone,
        text
      ).then(async (result) => {
        if (result.status === 'sent' && result.messageId) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              channelMessageId: result.messageId,
              status: 'sent'
            }
          });
        } else {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: 'failed',
              errorText: result.errorText || 'Failed to send automated message'
            }
          });
        }
      }).catch(err => {
        console.error('[FlowEngineOutbound] Background delivery promise failed:', err);
      });
    } catch (error) {
      console.error('[FlowEngine] Error sending automation message:', error);
    }
  }

  /**
   * Helper para persistir e despachar mensagens com botões interativos pelo WhatsApp.
   */
  private static async sendAutomationButtons(
    tenantId: string,
    conversationId: string,
    contactId: string,
    text: string,
    buttons: string[],
    channelId: string
  ): Promise<void> {
    try {
      const message = await prisma.message.create({
        data: {
          tenantId,
          conversationId,
          senderType: 'automation',
          senderName: 'Atendente HBFlow',
          body: text + "\n\nOpções: " + buttons.join(", "),
          type: 'text',
          status: 'pending',
          isRead: true
        }
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastUserMessageAt: new Date()
        }
      });

      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      });

      if (!contact) {
        throw new Error('Contact not found to send automation buttons');
      }

      WhatsAppMessageService.sendButtonsMessage(
        tenantId,
        channelId,
        contact.phone,
        text,
        buttons
      ).then(async (result) => {
        if (result.status === 'sent' && result.messageId) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              channelMessageId: result.messageId,
              status: 'sent'
            }
          });
        } else {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: 'failed',
              errorText: result.errorText || 'Failed to send automated buttons'
            }
          });
        }
      }).catch(err => {
        console.error('[FlowEngineOutbound] Background button delivery promise failed:', err);
      });
    } catch (error) {
      console.error('[FlowEngine] Error sending automation buttons:', error);
    }
  }
}
