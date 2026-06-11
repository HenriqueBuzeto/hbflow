import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';
import { prisma } from '@/server/db/prisma';
import { WhatsAppMessageService } from '@/server/services/whatsapp/whatsapp-message.service';

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

    const body = await request.json().catch(() => ({}));
    const { to, text } = body;

    if (!to || !text) {
      return NextResponse.json({ error: 'Os campos "to" e "text" são obrigatórios' }, { status: 400 });
    }

    // Dispatch message via WhatsAppMessageService (handles routing, audit, and API logs)
    const result = await WhatsAppMessageService.sendTextMessage(
      tenantId,
      connectionId,
      to,
      text
    );

    return NextResponse.json({ success: result.status === 'sent', result });
  } catch (error: any) {
    console.error('Error sending test message via QR:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
