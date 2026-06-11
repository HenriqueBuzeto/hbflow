import { NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';
import { SubscriptionAccessService } from '@/server/services/billing/subscription-access.service';

export async function GET() {
  try {
    const tenantId = await requireTenant();

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    const access = await SubscriptionAccessService.checkAccess(tenantId);

    return NextResponse.json({
      success: true,
      subscription,
      access
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
