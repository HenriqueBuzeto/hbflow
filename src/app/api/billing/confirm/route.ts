import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { BillingService } from '@/server/services/billing/billing.service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenant();
    const body = await request.json();
    const { plan } = body;

    if (!plan || (plan !== 'starter' && plan !== 'pro')) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const activation = await BillingService.activateSubscription(tenantId, plan);

    return NextResponse.json(activation, { status: 200 });
  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao confirmar pagamento' },
      { status: 400 }
    );
  }
}
