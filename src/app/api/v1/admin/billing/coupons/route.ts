import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { createCouponSchema } from '@/server/validators/billing.validator';
import { AuditService } from '@/server/audit/audit.service';

export async function GET() {
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem listar cupons' }, { status: 403 });
    }

    const coupons = await prisma.coupon.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, coupons });
  } catch (error: any) {
    console.error('Error listing coupons:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem criar cupons' }, { status: 403 });
    }

    const body = await request.json();
    const data = createCouponSchema.parse(body);

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        duration: data.duration,
        durationMonths: data.durationMonths,
        maxRedemptions: data.maxRedemptions,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        isActive: data.isActive
      }
    });

    await AuditService.log({
      tenantId: user.tenantId || '',
      userId: user.userId,
      action: 'COUPON_CREATED',
      entity: 'coupon',
      entityId: coupon.id,
      metadata: { code: coupon.code, value: coupon.value }
    });

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
