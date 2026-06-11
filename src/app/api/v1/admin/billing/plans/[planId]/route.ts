import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { updatePlanSchema } from '@/server/validators/billing.validator';
import { AuditService } from '@/server/audit/audit.service';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ planId: string }> }
) {
  const params = await props.params;
  const { planId } = params;
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem atualizar planos' }, { status: 403 });
    }

    const body = await request.json();
    const data = updatePlanSchema.parse(body);

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: {
        name: data.name,
        slug: data.slug,
        priceCents: data.priceCents,
        billingCycle: data.billingCycle,
        featuresJson: data.featuresJson,
        isActive: data.isActive
      }
    });

    await AuditService.log({
      tenantId: user.tenantId || '',
      userId: user.userId,
      action: 'PLAN_UPDATED',
      entity: 'plan',
      entityId: plan.id,
      metadata: { planId, priceCents: plan.priceCents }
    });

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
