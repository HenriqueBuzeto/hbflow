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
      return NextResponse.json({ success: false, error: 'Apenas administradores podem ativar assinaturas' }, { status: 403 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ success: false, error: 'planId é obrigatório' }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano não encontrado' }, { status: 404 });
    }

    const now = new Date();
    const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriodEnd
      }
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'active', plan: plan.slug }
    });

    await AuditService.log({
      tenantId,
      userId: user.userId,
      action: 'SUBSCRIPTION_ACTIVATED',
      entity: 'subscription',
      entityId: subscription.id,
      metadata: { planId, source: 'manual_admin' }
    });

    await AuditService.logSystemEvent({
      tenantId,
      eventType: 'SUBSCRIPTION_ACTIVATED',
      severity: 'info',
      message: `Assinatura do inquilino para plano ${plan.name} ativada manualmente pelo administrador.`,
      metadata: { subscriptionId: subscription.id }
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error('Error activating subscription:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
