import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';
import { prisma } from '@/server/db/prisma';
import { WhatsAppQrGatewayProvider } from '@/server/services/whatsapp/whatsapp-qr-gateway.provider';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ connectionId: string }> }
) {
  try {
    // 1. Authenticate and enforce permission
    await requirePermission('whatsapp.connection.manage');
    
    // 2. Enforce active subscription and obtain tenantId
    const tenantId = await requireActiveSubscription();

    const params = await props.params;
    const { connectionId } = params;

    // 3. Find and validate connection belongs to the tenant and is qr_gateway
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

    // 4. Call Evolution API to get QR
    const qrProvider = new WhatsAppQrGatewayProvider();
    const result = await qrProvider.getQrCode(connection.instanceName);

    // Save qrCode and lastQrAt in DB if generated successfully
    const base64 = result.qrcode?.base64 || result.base64 || null;
    if (base64) {
      await prisma.whatsappConnection.update({
        where: { id: connectionId },
        data: {
          qrCode: base64,
          lastQrAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true, qrcode: base64, result });
  } catch (error: any) {
    console.error('Error fetching/generating QR Code:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
