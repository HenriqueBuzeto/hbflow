import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { AuditService } from '@/server/audit/audit.service';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ tenantId: string }> }
) {
  const params = await props.params;
  const { tenantId } = params;
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem suspender assinaturas' }, { status: 403 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Assinatura não encontrada' }, { status: 404 });
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'suspended' }
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'suspended' }
    });

    await AuditService.log({
      tenantId,
      userId: user.userId,
      action: 'SUBSCRIPTION_SUSPENDED',
      entity: 'subscription',
      entityId: subscription.id,
      metadata: { source: 'manual_admin' }
    });

    await AuditService.logSystemEvent({
      tenantId,
      eventType: 'SUBSCRIPTION_SUSPENDED',
      severity: 'warning',
      message: `Assinatura suspensa manualmente pelo administrador.`,
      metadata: { subscriptionId: subscription.id }
    });

    return NextResponse.json({ success: true, subscription: updated });
  } catch (error: any) {
    console.error('Error suspending subscription:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
