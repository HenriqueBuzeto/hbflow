import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';
import { prisma } from '@/server/db/prisma';
import { WhatsAppQrGatewayProvider } from '@/server/services/whatsapp/whatsapp-qr-gateway.provider';

export async function GET(
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
    const result = await qrProvider.getStatus(connection.instanceName);

    // Evolution API status can return state in result.state or result.instance?.state
    const state = result.state || result.instance?.state || 'disconnected';

    let localStatus = 'disconnected';
    let phoneNumber = connection.phoneNumber;
    let displayName = connection.displayName;
    let connectedAt = connection.connectedAt;
    let disconnectedAt = connection.disconnectedAt;

    if (state === 'open' || state === 'connected' || result.status === 'CONNECTED') {
      localStatus = 'connected';
      connectedAt = connectedAt || new Date();
      // Extract phone/pushname if returned by Evolution API
      phoneNumber = result.instance?.number || result.number || connection.phoneNumber || null;
      displayName = result.instance?.pushname || result.pushname || connection.displayName || null;
    } else if (state === 'connecting') {
      localStatus = 'connecting';
    } else {
      localStatus = 'disconnected';
      disconnectedAt = new Date();
    }

    const updated = await prisma.whatsappConnection.update({
      where: { id: connectionId },
      data: {
        status: localStatus,
        phoneNumber,
        displayName,
        connectedAt,
        disconnectedAt
      }
    });

    return NextResponse.json({ success: true, connection: updated, gatewayState: result });
  } catch (error: any) {
    console.error('Error fetching QR connection status:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
