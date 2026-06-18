import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { WhatsAppMessageService } from '@/server/services/whatsapp/whatsapp-message.service';
import { SubscriptionAccessService } from '@/server/services/billing/subscription-access.service';

/**
 * GET/POST - Rota de cron executada periodicamente para enviar mensagens de jornadas vencidas.
 * Pode ser acionada por um resolvedor externo ou agendador local.
 */
export async function GET(request: NextRequest) {
  return handleCron();
}

export async function POST(request: NextRequest) {
  return handleCron();
}

async function handleCron() {
  const startTime = Date.now();
  console.log('[Cron After-Sales] Iniciando processamento de fila de agendamentos pós-venda...');

  try {
    const now = new Date();

    // 1. Encontrar todas as mensagens pendentes vencidas (data agendada menor ou igual a agora)
    const pendingMessages = await prisma.scheduledMessage.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: now },
        deletedAt: null
      },
      include: {
        contact: true
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100 // Processar em blocos de até 100 por execução de cron
    });

    if (pendingMessages.length === 0) {
      return NextResponse.json({
        success: true,
        processedCount: 0,
        message: 'Nenhum agendamento pendente vencido encontrado.'
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const msg of pendingMessages) {
      // 1.5 Verificar se o inquilino possui assinatura ativa. Se não, pula sem marcar como falha para poder reativar depois.
      const access = await SubscriptionAccessService.checkAccess(msg.tenantId);
      if (!access.allowed) {
        console.log(`[Cron After-Sales] Ignorando agendamento ${msg.id}: Tenant ${msg.tenantId} com assinatura expirada/bloqueada.`);
        continue;
      }

      // 2. Verificar se o contato não solicitou Opt-Out enquanto a mensagem estava na fila
      if (msg.contact?.marketingOptOut) {
        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: {
            status: 'cancelled',
            updatedAt: new Date()
          }
        });
        
        if (msg.contactJourneyId) {
          await prisma.contactJourney.update({
            where: { id: msg.contactJourneyId },
            data: {
              status: 'cancelled',
              updatedAt: new Date()
            }
          });
        }
        continue;
      }

      // 3. Localizar conexão ativa de WhatsApp para o inquilino
      const activeConnection = await prisma.whatsappConnection.findFirst({
        where: {
          tenantId: msg.tenantId,
          status: 'connected',
          deletedAt: null
        }
      });

      if (!activeConnection) {
        console.warn(`[Cron After-Sales] Ignorando mensagem ${msg.id}: Nenhuma conexão ativa do WhatsApp para o inquilino ${msg.tenantId}`);
        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: {
            status: 'failed',
            errorMessage: 'Nenhuma conexão ativa de WhatsApp disponível.',
            updatedAt: new Date()
          }
        });
        failedCount++;
        continue;
      }

      // 4. Executar o disparo via WhatsApp
      const toPhone = msg.contact?.phone || '';
      
      try {
        const result = await WhatsAppMessageService.sendTextMessage(
          msg.tenantId,
          activeConnection.id,
          toPhone,
          msg.content
        );

        if (result.status === 'sent') {
          // Atualiza para enviado
          await prisma.scheduledMessage.update({
            where: { id: msg.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
              updatedAt: new Date()
            }
          });

          // Registrar na auditoria
          await prisma.auditLog.create({
            data: {
              tenantId: msg.tenantId,
              action: 'message.sent',
              entity: 'scheduled_message',
              entityId: msg.id,
              metadata: {
                cronAuto: true,
                messageId: result.messageId
              }
            }
          });

          // Registrar logs de eventos da jornada no banco
          if (msg.journeyId) {
            await prisma.journeyEventLog.create({
              data: {
                tenantId: msg.tenantId,
                journeyId: msg.journeyId,
                contactId: msg.contactId,
                action: 'message.sent',
                metadata: JSON.stringify({
                  scheduledMessageId: msg.id,
                  stepId: msg.stepId
                })
              }
            });
          }

          // 5. Verificar se a jornada foi concluída (se era a última etapa pendente do ContactJourney)
          if (msg.contactJourneyId) {
            const remainingPending = await prisma.scheduledMessage.count({
              where: {
                contactJourneyId: msg.contactJourneyId,
                status: 'pending',
                deletedAt: null
              }
            });

            if (remainingPending === 0) {
              await prisma.contactJourney.update({
                where: { id: msg.contactJourneyId },
                data: {
                  status: 'completed',
                  completedAt: new Date(),
                  updatedAt: new Date()
                }
              });

              // Registrar auditoria de conclusão de jornada
              if (msg.journeyId) {
                await prisma.auditLog.create({
                  data: {
                    tenantId: msg.tenantId,
                    action: 'journey.completed',
                    entity: 'journey',
                    entityId: msg.journeyId,
                    metadata: {
                      contactId: msg.contactId,
                      contactJourneyId: msg.contactJourneyId
                    }
                  }
                });

                await prisma.journeyEventLog.create({
                  data: {
                    tenantId: msg.tenantId,
                    journeyId: msg.journeyId,
                    contactId: msg.contactId,
                    action: 'journey.completed',
                    metadata: JSON.stringify({
                      contactJourneyId: msg.contactJourneyId
                    })
                  }
                });
              }
            }
          }

          sentCount++;
        } else {
          throw new Error(result.errorText || 'Erro desconhecido no envio da mensagem.');
        }
      } catch (sendErr: any) {
        console.error(`[Cron After-Sales] Erro ao enviar agendamento ${msg.id}:`, sendErr.message);
        
        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: {
            status: 'failed',
            errorMessage: sendErr.message || 'Erro de rede ou autenticação no gateway',
            updatedAt: new Date()
          }
        });

        // Registrar falha na auditoria
        await prisma.auditLog.create({
          data: {
            tenantId: msg.tenantId,
            action: 'message.failed',
            entity: 'scheduled_message',
            entityId: msg.id,
            metadata: {
              error: sendErr.message
            }
          }
        });

        // Registrar logs de falha na jornada
        if (msg.journeyId) {
          await prisma.journeyEventLog.create({
            data: {
              tenantId: msg.tenantId,
              journeyId: msg.journeyId,
              contactId: msg.contactId,
              action: 'message.failed',
              metadata: JSON.stringify({
                scheduledMessageId: msg.id,
                error: sendErr.message
              })
            }
          });
        }

        failedCount++;
      }
    }

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      processedCount: pendingMessages.length,
      sentCount,
      failedCount,
      durationMs,
      message: 'Fila de agendamento de pós-venda inteligente executada.'
    });

  } catch (error: any) {
    console.error('[Cron After-Sales Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Cron error execution'
    }, { status: 500 });
  }
}
