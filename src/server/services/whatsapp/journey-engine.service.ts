import { prisma } from '../../db/prisma';

export class JourneyEngineService {
  /**
   * Compila um template de mensagem substituindo marcadores de variáveis dinamicamente.
   */
  static compileMessage(template: string, contact: any, context?: any): string {
    if (!template) return '';
    let text = template;

    const firstName = contact.name ? contact.name.trim().split(' ')[0] : 'Cliente';

    // Variáveis de Contato
    text = text.replace(/{nome}/gi, contact.name || 'Cliente');
    text = text.replace(/{primeiroNome}/gi, firstName);
    text = text.replace(/{telefone}/gi, contact.phone || '');
    text = text.replace(/{email}/gi, contact.email || '');
    text = text.replace(/{cidade}/gi, contact.city || '');
    text = text.replace(/{estado}/gi, contact.state || '');

    // Variáveis de Contexto (Vendas, Transações, Atendimento)
    text = text.replace(/{empresa}/gi, context?.companyName || context?.tenantName || 'HBFlow');
    text = text.replace(/{produto}/gi, context?.productName || context?.dealProduct || 'produto');
    
    let formattedValue = '';
    if (context?.value !== undefined && context?.value !== null) {
      formattedValue = Number(context.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else if (context?.dealValue !== undefined) {
      formattedValue = Number(context.dealValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    text = text.replace(/{valor}/gi, formattedValue);

    let formattedDate = '';
    const dateVal = context?.purchaseDate || context?.createdAt || context?.closedAt;
    if (dateVal) {
      formattedDate = new Date(dateVal).toLocaleDateString('pt-BR');
    } else {
      formattedDate = new Date().toLocaleDateString('pt-BR');
    }
    text = text.replace(/{dataCompra}/gi, formattedDate);
    text = text.replace(/{atendente}/gi, context?.operatorName || context?.assignedUserName || 'Equipe');
    text = text.replace(/{loja}/gi, context?.storeName || 'Loja');

    return text;
  }

  /**
   * Calcula a data futura de agendamento somando o atraso definido à data base.
   */
  static calculateScheduledDate(baseDate: Date, value: number, unit: string): Date {
    const date = new Date(baseDate.getTime());
    switch (unit.toLowerCase()) {
      case 'minutes':
      case 'minute':
        date.setMinutes(date.getMinutes() + value);
        break;
      case 'hours':
      case 'hour':
        date.setHours(date.getHours() + value);
        break;
      case 'days':
      case 'day':
        date.setDate(date.getDate() + value);
        break;
      case 'weeks':
      case 'week':
        date.setDate(date.getDate() + value * 7);
        break;
      case 'months':
      case 'month':
        date.setMonth(date.getMonth() + value);
        break;
      case 'years':
      case 'year':
        date.setFullYear(date.getFullYear() + value);
        break;
      default:
        // Padrão de segurança: dias
        date.setDate(date.getDate() + value);
    }
    return date;
  }

  /**
   * Dispara uma jornada para um contato com base em um gatilho.
   * Filtra por tenant e apenas inicia se o contato não estiver em Opt-Out.
   */
  static async triggerJourneyForContact(
    tenantId: string,
    contactId: string,
    triggerType: string,
    contextData?: any
  ): Promise<boolean> {
    // 1. Validar se o contato existe e não está em opt-out
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact || contact.tenantId !== tenantId || contact.marketingOptOut) {
      return false; // Bloqueado por Opt-Out ou inexistente
    }

    // 2. Encontrar todas as jornadas ativas deste tenant para este gatilho
    const journeys = await prisma.journey.findMany({
      where: {
        tenantId,
        trigger: triggerType,
        isActive: true,
        deletedAt: null
      },
      include: {
        steps: {
          where: { isActive: true, deletedAt: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (journeys.length === 0) return false;

    let triggeredCount = 0;

    for (const journey of journeys) {
      // Validar filtros específicos de gatilho (ex: se for tag_added, checar a tag correspondente)
      if (triggerType === 'tag_added' && journey.triggerConfig) {
        try {
          const config = JSON.parse(journey.triggerConfig);
          const targetTag = config.tagId || config.tagName;
          const currentTag = contextData?.tagId || contextData?.tagName;
          if (targetTag && currentTag && targetTag !== currentTag) {
            continue; // Tag não bate com o filtro configurado
          }
        } catch (e) {
          console.error('Error parsing triggerConfig for journey:', journey.id, e);
        }
      }

      // 3. Criar a instância de ContactJourney
      const contactJourney = await prisma.contactJourney.create({
        data: {
          tenantId,
          contactId,
          journeyId: journey.id,
          status: 'active',
          startedAt: new Date()
        }
      });

      // Registrar Auditoria do início da jornada
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'journey.started',
          entity: 'journey',
          entityId: journey.id,
          metadata: {
            contactId,
            contactJourneyId: contactJourney.id,
            triggerType
          }
        }
      });

      // 4. Agendar todas as etapas ativas da jornada
      let lastBaseDate = new Date();
      
      for (const step of journey.steps) {
        // Calcula a data de agendamento somando o delay acumulado
        const scheduledTime = this.calculateScheduledDate(lastBaseDate, step.delayValue, step.delayUnit);
        
        // Resolve o template da mensagem
        const compiledMsg = this.compileMessage(step.message, contact, contextData);

        await prisma.scheduledMessage.create({
          data: {
            tenantId,
            contactId,
            journeyId: journey.id,
            stepId: step.id,
            contactJourneyId: contactJourney.id,
            content: compiledMsg,
            scheduledAt: scheduledTime,
            status: 'pending'
          }
        });

        // Registrar agendamento no log de auditoria
        await prisma.auditLog.create({
          data: {
            tenantId,
            action: 'message.scheduled',
            entity: 'scheduled_message',
            metadata: {
              journeyId: journey.id,
              stepId: step.id,
              contactJourneyId: contactJourney.id,
              scheduledAt: scheduledTime.toISOString()
            }
          }
        });

        // Registrar logs de eventos da jornada no banco
        await prisma.journeyEventLog.create({
          data: {
            tenantId,
            journeyId: journey.id,
            contactId,
            action: 'message.scheduled',
            metadata: JSON.stringify({
              stepId: step.id,
              scheduledAt: scheduledTime.toISOString()
            })
          }
        });
      }

      triggeredCount++;
    }

    return triggeredCount > 0;
  }

  /**
   * Cancela todas as jornadas e mensagens agendadas de um contato (Opt-Out).
   */
  static async cancelAllForContact(tenantId: string, contactId: string): Promise<void> {
    // Cancelar jornadas ativas
    await prisma.contactJourney.updateMany({
      where: {
        tenantId,
        contactId,
        status: 'active',
        deletedAt: null
      },
      data: {
        status: 'cancelled',
        updatedAt: new Date()
      }
    });

    // Cancelar mensagens pendentes de envio
    await prisma.scheduledMessage.updateMany({
      where: {
        tenantId,
        contactId,
        status: 'pending',
        deletedAt: null
      },
      data: {
        status: 'cancelled',
        updatedAt: new Date()
      }
    });
  }
}
