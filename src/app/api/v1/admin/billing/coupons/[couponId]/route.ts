import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { updateCouponSchema } from '@/server/validators/billing.validator';
import { AuditService } from '@/server/audit/audit.service';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ couponId: string }> }
) {
  const params = await props.params;
  const { couponId } = params;
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem atualizar cupons' }, { status: 403 });
    }

    const body = await request.json();
    const data = updateCouponSchema.parse(body);

    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        duration: data.duration,
        durationMonths: data.durationMonths,
        maxRedemptions: data.maxRedemptions,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        isActive: data.isActive
      }
    });

    await AuditService.log({
      tenantId: user.tenantId || '',
      userId: user.userId,
      action: 'COUPON_UPDATED',
      entity: 'coupon',
      entityId: coupon.id,
      metadata: { code: coupon.code }
    });

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ couponId: string }> }
) {
  const params = await props.params;
  const { couponId } = params;
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem excluir cupons' }, { status: 403 });
    }

    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    await AuditService.log({
      tenantId: user.tenantId || '',
      userId: user.userId,
      action: 'COUPON_DELETED',
      entity: 'coupon',
      entityId: coupon.id,
      metadata: { code: coupon.code }
    });

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
