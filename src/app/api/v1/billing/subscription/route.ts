import { NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { SubscriptionAccessService } from '@/server/services/billing/subscription-access.service';

export async function GET() {
  try {
    const tenantId = await requireTenant();
    await requirePermission('billing.read');

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    const access = await SubscriptionAccessService.checkAccess(tenantId);

    // Fetch active tenant discount and related coupon
    const activeDiscount = await prisma.tenantDiscount.findFirst({
      where: {
        tenantId,
        isActive: true,
        startsAt: { lte: new Date() },
        OR: [
          { endsAt: null },
          { endsAt: { gte: new Date() } }
        ],
        deletedAt: null
      },
      include: { coupon: true },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch last paid payment to determine payment method used
    const lastPayment = await prisma.payment.findFirst({
      where: {
        tenantId,
        status: 'paid'
      },
      orderBy: { paidAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      subscription,
      access,
      activeDiscount,
      lastPayment
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
