import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireFeature } from '@/server/middleware/feature.middleware';
import { WhatsAppMessageService } from '@/server/services/whatsapp/whatsapp-message.service';

/**
 * GET - Listar fila de agendamentos e histórico de envios
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireFeature('after_sales_enabled');

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || undefined; // pending, sent, failed, cancelled
    const limit = Number(searchParams.get('limit')) || 50;

    const messages = await prisma.scheduledMessage.findMany({
      where: {
        tenantId,
        status: statusFilter,
        deletedAt: null
      },
      include: {
        contact: {
          select: { name: true, phone: true }
        },
        journey: {
          select: { name: true }
        },
        step: {
          select: { name: true }
        }
      },
      orderBy: { scheduledAt: statusFilter === 'pending' ? 'asc' : 'desc' },
      take: limit
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    if (error.message === 'FEATURE_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'Módulo indisponível para o seu plano.' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST - Cancelar ou Forçar Envio Imediato de um agendamento
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireFeature('after_sales_enabled');
    const body = await request.json();

    const { action, messageId } = body;

    if (!action || !messageId) {
      return NextResponse.json({ error: 'Ação e ID da mensagem são obrigatórios.' }, { status: 400 });
    }

    const message = await prisma.scheduledMessage.findFirst({
      where: { id: messageId, tenantId, deletedAt: null }
    });

    if (!message) {
      return NextResponse.json({ error: 'Mensagem agendada não encontrada.' }, { status: 404 });
    }

    if (action === 'cancel') {
      if (message.status !== 'pending') {
        return NextResponse.json({ error: 'Apenas mensagens pendentes podem ser canceladas.' }, { status: 400 });
      }

      await prisma.scheduledMessage.update({
        where: { id: messageId },
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      });

      // Auditoria
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'message.cancelled',
          entity: 'scheduled_message',
          entityId: messageId,
          metadata: {
            cancelledManually: true
          }
        }
      });

      return NextResponse.json({ success: true, message: 'Agendamento cancelado.' });
    }

    if (action === 'fire_now') {
      if (message.status !== 'pending' && message.status !== 'failed') {
        return NextResponse.json({ error: 'Apenas mensagens pendentes ou falhadas podem ser enviadas imediatamente.' }, { status: 400 });
      }

      // Localizar conexão ativa de WhatsApp para o tenant
      const activeConnection = await prisma.whatsappConnection.findFirst({
        where: { tenantId, status: 'connected', deletedAt: null }
      });

      if (!activeConnection) {
        return NextResponse.json({ error: 'Nenhuma conexão ativa do WhatsApp disponível.' }, { status: 400 });
      }

      // Executar disparo
      try {
        const result = await WhatsAppMessageService.sendTextMessage(
          tenantId,
          activeConnection.id,
          message.contactId ? (await prisma.contact.findUnique({ where: { id: message.contactId } }))?.phone || '' : '',
          message.content
        );

        if (result.status === 'sent') {
          await prisma.scheduledMessage.update({
            where: { id: messageId },
            data: {
              status: 'sent',
              sentAt: new Date(),
              updatedAt: new Date()
            }
          });

          // Registrar na auditoria
          await prisma.auditLog.create({
            data: {
              tenantId,
              action: 'message.sent',
              entity: 'scheduled_message',
              entityId: messageId,
              metadata: {
                forcedManual: true,
                messageId: result.messageId
              }
            }
          });

          return NextResponse.json({ success: true, message: 'Mensagem disparada com sucesso!' });
        } else {
          throw new Error(result.errorText || 'Erro no envio do WhatsApp');
        }
      } catch (sendErr: any) {
        await prisma.scheduledMessage.update({
          where: { id: messageId },
          data: {
            status: 'failed',
            errorMessage: sendErr.message || 'Erro de disparo',
            updatedAt: new Date()
          }
        });

        // Registrar falha na auditoria
        await prisma.auditLog.create({
          data: {
            tenantId,
            action: 'message.failed',
            entity: 'scheduled_message',
            entityId: messageId,
            metadata: {
              error: sendErr.message
            }
          }
        });

        return NextResponse.json({ error: `Falha no envio: ${sendErr.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling scheduled message action:', error);
    if (error.message === 'FEATURE_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'Módulo indisponível para o seu plano.' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
