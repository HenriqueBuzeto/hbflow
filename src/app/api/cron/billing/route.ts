import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { SubscriptionAccessService } from '@/server/services/billing/subscription-access.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET || 'super-cron-secret-token';

    if (secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null }
    });

    const results = [];

    for (const tenant of tenants) {
      const access = await SubscriptionAccessService.checkAccess(tenant.id);
      
      const isBlocked = !access.hasAccess;
      const subscriptionStatus = access.status;

      // Update DB only if there are changes to prevent unnecessary writes
      if (tenant.isBlocked !== isBlocked || tenant.subscriptionStatus !== subscriptionStatus) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            isBlocked,
            subscriptionStatus
          }
        });
        results.push({ tenantId: tenant.id, name: tenant.name, isBlocked, subscriptionStatus, updated: true });
      } else {
        results.push({ tenantId: tenant.id, name: tenant.name, isBlocked, subscriptionStatus, updated: false });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processedCount: tenants.length, 
      details: results 
    });
  } catch (error: any) {
    console.error('Error running billing cron job:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
