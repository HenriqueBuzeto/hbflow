import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { BillingService } from '@/server/services/billing/billing.service';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenant();
    const body = await request.json();
    const { plan, couponCode } = body;

    if (!plan || (plan !== 'starter' && plan !== 'pro')) {
      return NextResponse.json({ error: 'Plano inválido (escolha starter ou pro)' }, { status: 400 });
    }

    const priceDetails = await BillingService.calculatePrice(tenantId, plan, couponCode);
    const charge = await BillingService.generatePixCharge(tenantId, plan, couponCode);

    return NextResponse.json({
      baseAmount: priceCalculationFormatted(priceDetails.baseAmount),
      discountAmount: priceCalculationFormatted(priceDetails.discountAmount),
      finalAmount: priceCalculationFormatted(priceDetails.finalAmount),
      appliedCoupon: priceDetails.appliedCoupon,
      companyDiscountPercentage: priceDetails.companyDiscountPercentage,
      couponDiscountPercentage: priceDetails.couponDiscountPercentage,
      pixPayload: charge.pixPayload,
      pixQrCode: charge.pixQrCode,
      instantActive: charge.instantActive
    }, { status: 200 });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar faturamento' },
      { status: 400 }
    );
  }
}

function priceCalculationFormatted(val: number) {
  return Number(val.toFixed(2));
}
