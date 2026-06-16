import { prisma } from '@/server/db/prisma';
import { WhatsAppProviderFactory } from './whatsapp-provider.factory';
import { SendMessageResult, WebhookMessagePayload } from './whatsapp-provider.interface';

export class WhatsAppMessageService {
  /**
   * Envia uma mensagem de texto de saída, passando pelo provedor ativo da conexão do tenant.
   */
  static async sendTextMessage(
    tenantId: string,
    connectionId: string,
    toPhone: string,
    bodyText: string
  ): Promise<SendMessageResult> {
    const startTime = Date.now();
    let errorMsg: string | undefined;
    let statusCode = 200;
    let success = false;
    let messageId = '';

    // 1. Localizar a conexão do WhatsApp
    const connection = await prisma.whatsappConnection.findFirst({
      where: { id: connectionId, tenantId, deletedAt: null }
    });

    if (!connection) {
      throw new Error('Conexão de WhatsApp não encontrada para este inquilino.');
    }

    try {
      // 2. Resolver o provider ativo
      const provider = await WhatsAppProviderFactory.getProvider(connection.provider, tenantId);

      // 3. Enviar mensagem pelo provider
      const result = await provider.sendMessage(toPhone, bodyText, connection);
      
      messageId = result.messageId;
      success = result.status === 'sent';
      errorMsg = result.errorText;

      if (!success) {
        statusCode = 400;
      }

      return result;
    } catch (err: any) {
      errorMsg = err.message || 'Erro inesperado no serviço de envio de mensagem';
      statusCode = 500;
      return {
        messageId: '',
        status: 'failed',
        errorText: errorMsg
      };
    } finally {
      const durationMs = Date.now() - startTime;

      // 4. Salvar logs de auditoria e API
      await prisma.whatsappApiLog.create({
        data: {
          connectionId: connection.id,
          endpoint: `/message/sendText (${connection.provider})`,
          method: 'POST',
          requestJson: JSON.stringify({ to: toPhone, body: bodyText }),
          responseJson: JSON.stringify({ messageId, success, errorText: errorMsg }),
          statusCode,
          durationMs,
          success,
          errorMessage: errorMsg
        }
      });

      if (success) {
        await prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: { lastMessageSentAt: new Date() }
        });
      }

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'whatsapp.message.send',
          entity: 'message',
          entityId: messageId || 'error',
          metadata: {
            provider: connection.provider,
            to: toPhone,
            success,
            durationMs
          }
        }
      });
    }
  }

  /**
   * Envia uma mensagem de mídia de saída, passando pelo provedor ativo da conexão do tenant.
   */
  static async sendMediaMessage(
    tenantId: string,
    connectionId: string,
    toPhone: string,
    mediaUrl: string,
    mimeType: string,
    mediaType: string,
    fileName: string,
    caption: string
  ): Promise<SendMessageResult> {
    const startTime = Date.now();
    let errorMsg: string | undefined;
    let statusCode = 200;
    let success = false;
    let messageId = '';

    // 1. Localizar a conexão do WhatsApp
    const connection = await prisma.whatsappConnection.findFirst({
      where: { id: connectionId, tenantId, deletedAt: null }
    });

    if (!connection) {
      throw new Error('Conexão de WhatsApp não encontrada para este inquilino.');
    }

    try {
      // 2. Resolver o provider ativo
      const provider = await WhatsAppProviderFactory.getProvider(connection.provider, tenantId);

      // 3. Enviar mídia pelo provider se ele suportar
      let result: SendMessageResult;
      if (provider.sendMedia) {
        result = await provider.sendMedia(
          toPhone,
          mediaUrl,
          mimeType,
          mediaType,
          fileName,
          caption,
          connection
        );
      } else {
        // Fallback para envio de texto contendo menção à mídia
        result = await provider.sendMessage(toPhone, `[${mediaType}] ${caption}`, connection);
      }
      
      messageId = result.messageId;
      success = result.status === 'sent';
      errorMsg = result.errorText;

      if (!success) {
        statusCode = 400;
      }

      return result;
    } catch (err: any) {
      errorMsg = err.message || 'Erro inesperado no serviço de envio de mídia';
      statusCode = 500;
      return {
        messageId: '',
        status: 'failed',
        errorText: errorMsg
      };
    } finally {
      const durationMs = Date.now() - startTime;

      // 4. Salvar logs de auditoria e API
      await prisma.whatsappApiLog.create({
        data: {
          connectionId: connection.id,
          endpoint: `/message/sendMedia (${connection.provider})`,
          method: 'POST',
          requestJson: JSON.stringify({ to: toPhone, mediaType, fileName, hasMedia: !!mediaUrl }),
          responseJson: JSON.stringify({ messageId, success, errorText: errorMsg }),
          statusCode,
          durationMs,
          success,
          errorMessage: errorMsg
        }
      });

      if (success) {
        await prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: { lastMessageSentAt: new Date() }
        });
      }

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'whatsapp.message.send_media',
          entity: 'message',
          entityId: messageId || 'error',
          metadata: {
            provider: connection.provider,
            to: toPhone,
            success,
            durationMs,
            mediaType
          }
        }
      });
    }
  }

  /**
   * Processa Webhooks genéricos recebidos, identificando a instância/telefone correspondente,
   * validando assinaturas e inserindo as mensagens e contatos no banco de dados.
   */
  static async handleWebhook(
    headers: Record<string, string>,
    bodyText: string,
    bodyJson: any
  ): Promise<{ success: boolean; processedCount: number; message?: string }> {
    
    // 1. Tentar identificar a conexão associada (Cloud API envia ID no metadata, Evolution envia no instanceName)
    let extractedPhoneId: string | undefined;
    let extractedInstanceName: string | undefined;

    // Detecção de Cloud API Oficial
    if (bodyJson?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id) {
      extractedPhoneId = bodyJson.entry[0].changes[0].value.metadata.phone_number_id;
    }
    
    // Detecção de QR Gateway (Evolution API)
    if (bodyJson?.instance) {
      extractedInstanceName = bodyJson.instance;
    }

    if (!extractedPhoneId && !extractedInstanceName) {
      return { success: false, processedCount: 0, message: 'Payload do webhook não identificado (Cloud API ou Evolution API)' };
    }

    // 2. Buscar conexão ativa correspondente
    const connection = await prisma.whatsappConnection.findFirst({
      where: {
        OR: [
          { phoneNumberId: extractedPhoneId },
          { instanceName: extractedInstanceName }
        ],
        deletedAt: null
      }
    });

    if (!connection) {
      return { success: false, processedCount: 0, message: 'Conexão ativa do WhatsApp não mapeada no banco de dados' };
    }

    try {
      // 3. Resolver o provider
      const provider = await WhatsAppProviderFactory.getProvider(connection.provider, connection.tenantId);

      // 4. Validar segurança/assinatura do webhook
      const isValid = await provider.validateWebhook(headers, bodyText, connection);
      if (!isValid) {
        return { success: false, processedCount: 0, message: 'Assinatura ou token do webhook inválido' };
      }

      // Atualizar timestamp da última atividade de webhook
      await prisma.whatsappConnection.update({
        where: { id: connection.id },
        data: { 
          lastWebhookAt: new Date(),
          lastWebhookReceivedAt: new Date()
        }
      });

      // 5. Processar as mensagens recebidas
      const payloads = await provider.processWebhook(bodyJson, connection);
      if (!payloads || payloads.length === 0) {
        return { success: true, processedCount: 0, message: 'Webhook processado (sem novas mensagens entrantes)' };
      }

      let processedCount = 0;
      for (const payload of payloads) {
        let contactId: string | null = null;
        let conversationId: string | null = null;

        // Enforce Transaction to map Contact + Conversation + Message
        await prisma.$transaction(async (tx) => {
          const normalizedPhone = payload.senderPhone.replace(/\D/g, '');

          // 5.1 Encontrar ou criar o contato
          let contact = await tx.contact.findFirst({
            where: { tenantId: connection.tenantId, normalizedPhone }
          });

          if (!contact) {
            contact = await tx.contact.create({
              data: {
                tenantId: connection.tenantId,
                name: payload.senderName,
                phone: payload.senderPhone,
                normalizedPhone,
                source: 'whatsapp',
                status: 'lead'
              }
            });
          }

          contactId = contact.id;

          // 5.2 Encontrar ou criar conversa ativa
          let conversation = await tx.conversation.findFirst({
            where: {
              tenantId: connection.tenantId,
              contactId: contact.id,
              status: { in: ['new', 'open', 'pending'] }
            }
          });

          if (!conversation) {
            conversation = await tx.conversation.create({
              data: {
                tenantId: connection.tenantId,
                contactId: contact.id,
                channelId: connection.id,
                status: 'new',
                subject: `Mensagem via WhatsApp - ${contact.name}`
              }
            });
          }

          conversationId = conversation.id;

          // 5.2.1 Verificar se a mensagem já existe para evitar duplicados (ex: quando enviada do próprio sistema)
          if (payload.providerMessageId) {
            const existingMessage = await tx.message.findFirst({
              where: {
                tenantId: connection.tenantId,
                channelMessageId: payload.providerMessageId
              }
            });
            if (existingMessage) {
              processedCount++;
              return;
            }
          }

          const isFromMe = !!payload.fromMe;
          const senderType = isFromMe ? 'user' : 'contact';
          const senderName = isFromMe ? (payload.senderName || 'Você') : contact.name;

          // 5.3 Registrar a mensagem
          await tx.message.create({
            data: {
              tenantId: connection.tenantId,
              conversationId: conversation.id,
              senderType,
              senderName,
              body: payload.body,
              type: payload.messageType,
              mediaUrl: payload.mediaUrl,
              mimeType: payload.mimeType,
              channelMessageId: payload.providerMessageId,
              provider: connection.provider,
              status: 'delivered',
              isRead: isFromMe
            }
          });

          // 5.4 Atualizar estatísticas da conversa
          await tx.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: new Date(),
              ...(!isFromMe ? {
                lastCustomerMessageAt: new Date(),
                unreadCount: { increment: 1 }
              } : {})
            }
          });

          // Atualizar telemetria de mensagens na conexão
          await tx.whatsappConnection.update({
            where: { id: connection.id },
            data: {
              [isFromMe ? 'lastMessageSentAt' : 'lastMessageReceivedAt']: new Date(),
              lastWebhookReceivedAt: new Date()
            }
          });

          processedCount++;
        });

        // Opt-Out and Chatbot Flow Engine checking for incoming text messages from contacts
        if (!payload.fromMe && payload.body && contactId) {
          try {
            const { OptOutHandler } = await import('./optout-handler');
            const wasOptOut = await OptOutHandler.handleIncomingMessage(
              connection.tenantId,
              contactId,
              payload.body
            );

            // Se a mensagem não foi um pedido de cancelamento (opt-out), processa pelo fluxo/chatbot de triagem
            if (!wasOptOut && conversationId) {
              const { FlowEngineService } = await import('./flow-engine.service');
              await FlowEngineService.processMessage(
                connection.tenantId,
                conversationId,
                contactId,
                payload.body,
                connection.id
              );
            }
          } catch (optErr) {
            console.error('Error in OptOutHandler/FlowEngine checking:', optErr);
          }
        }
      }

      // 6. Registrar logs
      await prisma.whatsappWebhookEvent.create({
        data: {
          connectionId: connection.id,
          providerEventId: bodyJson.id || bodyJson.eventId || `wh_${Date.now()}_${Math.random().toString(36).substring(4)}`,
          eventType: bodyJson.event || 'message_received',
          payloadJson: JSON.stringify(bodyJson),
          processedAt: new Date(),
          status: 'success'
        }
      });

      return { success: true, processedCount };
    } catch (error: any) {
      console.error('Falha ao processar webhook coordenado:', error);
      
      // Registrar erro na conexão
      try {
        await prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: { lastError: error.message || 'Erro ao processar webhook' }
        });
      } catch (dbErr) {
        console.error('Erro ao registrar erro na conexão:', dbErr);
      }
      
      // Registrar falha no evento
      await prisma.whatsappWebhookEvent.create({
        data: {
          connectionId: connection.id,
          providerEventId: `err_${Date.now()}`,
          eventType: 'error',
          payloadJson: JSON.stringify(bodyJson),
          status: 'failed'
        }
      });

      return { success: false, processedCount: 0, message: error.message };
    }
  }
}
