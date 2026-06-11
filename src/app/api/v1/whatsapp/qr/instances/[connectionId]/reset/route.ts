import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';
import { prisma } from '@/server/db/prisma';
import { WhatsAppQrGatewayProvider } from '@/server/services/whatsapp/whatsapp-qr-gateway.provider';
import { AuditService } from '@/server/audit/audit.service';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ connectionId: string }> }
) {
  try {
    await requirePermission('whatsapp.connection.manage');
    const tenantId = await requireActiveSubscription();

    const params = await props.params;
    const { connectionId } = params;

    const connection = await prisma.whatsappConnection.findFirst({
      where: { id: connectionId, tenantId, deletedAt: null }
    });

    if (!connection) {
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    if (connection.provider !== 'qr_gateway') {
      return NextResponse.json({ error: 'Provedor incorreto' }, { status: 400 });
    }

    if (!connection.instanceName) {
      return NextResponse.json({ error: 'Nome de instância ausente na conexão' }, { status: 400 });
    }

    const qrProvider = new WhatsAppQrGatewayProvider();
    
    // reset deletes the instance on the gateway
    const result = await qrProvider.reset(connection.instanceName).catch(() => null);

    const updated = await prisma.whatsappConnection.update({
      where: { id: connectionId },
      data: {
        status: 'disconnected',
        qrCode: null,
        lastQrAt: null,
        phoneNumber: null,
        displayName: null,
        connectedAt: null,
        disconnectedAt: new Date()
      }
    });

    // Re-create the instance on Evolution API so it's clean and ready to get a new QR code
    await qrProvider.createInstance(connection.instanceName);

    await AuditService.log({
      tenantId,
      action: 'whatsapp.connection.reset',
      entity: 'connection',
      entityId: connectionId,
      metadata: { instanceName: connection.instanceName }
    });

    return NextResponse.json({ success: true, connection: updated, result });
  } catch (error: any) {
    console.error('Error resetting QR connection instance:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
