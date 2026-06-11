import { NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { BillingService } from '@/server/services/billing/billing.service';

export async function GET() {
  try {
    // Permitimos ler o status mesmo se a conta estiver expirada
    const tenantId = await requireTenant();
    const status = await BillingService.checkBillingStatus(tenantId);

    return NextResponse.json(status, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching billing status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
