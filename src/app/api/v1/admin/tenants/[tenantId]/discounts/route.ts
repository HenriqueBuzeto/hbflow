import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { applyTenantDiscountSchema } from '@/server/validators/billing.validator';
import { AuditService } from '@/server/audit/audit.service';

export async function GET(
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
      return NextResponse.json({ success: false, error: 'Apenas administradores podem ver descontos de inquilino' }, { status: 403 });
    }

    const discounts = await prisma.tenantDiscount.findMany({
      where: { tenantId, deletedAt: null },
      include: { coupon: true, createdBy: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, discounts });
  } catch (error: any) {
    console.error('Error listing tenant discounts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ success: false, error: 'Apenas administradores podem aplicar descontos de inquilino' }, { status: 403 });
    }

    const body = await request.json();
    const data = applyTenantDiscountSchema.parse(body);

    const discount = await prisma.tenantDiscount.create({
      data: {
        tenantId,
        couponId: data.couponId || null,
        type: data.type,
        value: data.value,
        reason: data.reason,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive,
        createdByUserId: user.userId
      }
    });

    await AuditService.log({
      tenantId,
      userId: user.userId,
      action: 'TENANT_DISCOUNT_APPLIED',
      entity: 'tenant_discount',
      entityId: discount.id,
      metadata: { type: discount.type, value: discount.value, reason: discount.reason }
    });

    await AuditService.logSystemEvent({
      tenantId,
      eventType: 'TENANT_DISCOUNT_APPLIED',
      severity: 'info',
      message: `Desconto manual do tipo ${discount.type} de ${discount.value} aplicado ao inquilino.`,
      metadata: { tenantDiscountId: discount.id }
    });

    return NextResponse.json({ success: true, discount });
  } catch (error: any) {
    console.error('Error applying tenant discount:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
