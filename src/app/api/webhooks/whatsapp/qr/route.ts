import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppMessageService } from '@/server/services/whatsapp/whatsapp-message.service';
import { prisma } from '@/server/db/prisma';
import { AuditService } from '@/server/audit/audit.service';

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    let bodyJson: any;

    try {
      bodyJson = JSON.parse(bodyText);
    } catch (e) {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const instanceName = bodyJson.instance || bodyJson.instanceName;
    if (!instanceName) {
      return NextResponse.json({ error: 'Instância não identificada' }, { status: 400 });
    }

    // Buscar conexão ativa correspondente
    const connection = await prisma.whatsappConnection.findFirst({
      where: { instanceName, deletedAt: null }
    });

    if (!connection) {
      return NextResponse.json({ error: 'Conexão correspondente não encontrada' }, { status: 404 });
    }

    const event = bodyJson.event || '';

    // 1. Validar webhook secret/auth se enviado ou configurado
    const authHeader = headers['webhook-authorization'] || headers['apikey'] || headers['authorization'];
    const expectedToken = connection.verifyToken || process.env.WHATSAPP_QR_GATEWAY_WEBHOOK_SECRET || 'hbflow_qr_webhook_secret';
    if (authHeader && expectedToken) {
      const cleanHeader = authHeader.replace(/^Bearer\s+/i, '');
      if (cleanHeader !== expectedToken) {
        return NextResponse.json({ error: 'Webhook não autorizado' }, { status: 401 });
      }
    }

    // 2. Tratar eventos específicos do QR Gateway
    if (event === 'qrcode.updated') {
      const qrCode = bodyJson.data?.qrcode?.base64 || bodyJson.data?.qrcode;
      if (qrCode) {
        await prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: {
            qrCode,
            lastQrAt: new Date(),
            status: 'connecting' // update status when a qr code is displayed/renewed
          }
        });

        await AuditService.log({
          tenantId: connection.tenantId,
          action: 'whatsapp.connection.qr_updated',
          entity: 'connection',
          entityId: connection.id,
          metadata: { instanceName }
        });
      }
    } else if (event === 'connection.update') {
      const state = bodyJson.data?.state || bodyJson.data?.status || '';
      const stateStr = String(state).toLowerCase();
      let status = connection.status;

      if (stateStr === 'open' || stateStr === 'connected') {
        status = 'connected';
        await prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: {
            status,
            connectedAt: new Date(),
            phoneNumber: bodyJson.data?.phoneNumber || connection.phoneNumber
          }
        });
      } else if (
        stateStr === 'close' ||
        stateStr === 'disconnected' ||
        stateStr === 'refused' ||
        stateStr === 'refused_connection' ||
        stateStr === 'logout'
      ) {
        status = 'disconnected';
        await prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: {
            status,
            disconnectedAt: new Date(),
            qrCode: null,
            lastQrAt: null
          }
        });
      }

      await AuditService.log({
        tenantId: connection.tenantId,
        action: 'whatsapp.connection.status_updated',
        entity: 'connection',
        entityId: connection.id,
        metadata: { instanceName, state, status }
      });
    }

    // 3. Processar mensagens recebidas (messages.upsert)
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const result = await WhatsAppMessageService.handleWebhook(headers, bodyText, bodyJson);
      
      // Registrar log de webhook
      await prisma.whatsappWebhookEvent.create({
        data: {
          connectionId: connection.id,
          providerEventId: bodyJson.id || bodyJson.eventId || `qr_wh_${Date.now()}`,
          eventType: event,
          payloadJson: JSON.stringify(bodyJson),
          processedAt: new Date(),
          status: result.success ? 'success' : 'failed'
        }
      });

      return NextResponse.json({ success: result.success, processedCount: result.processedCount }, { status: 200 });
    }

    // Outros eventos (logout/disconnect, etc)
    return NextResponse.json({ success: true, message: 'Evento recebido' }, { status: 200 });
  } catch (error: any) {
    console.error('Error handling QR webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
