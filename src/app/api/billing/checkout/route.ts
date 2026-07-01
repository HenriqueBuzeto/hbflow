import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { BillingService } from '@/server/services/billing/billing.service';
import { prisma } from '@/server/db/prisma';
import { InvoiceService } from '@/server/services/billing/invoice.service';
import { InfinitePayProvider } from '@/server/services/billing/providers/infinitepay.provider';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenant();
    const body = await request.json();
    const { plan, couponCode } = body;

    if (!plan || (plan !== 'starter' && plan !== 'pro')) {
      return NextResponse.json({ error: 'Plano inválido (escolha starter ou pro)' }, { status: 400 });
    }

    const priceDetails = await BillingService.calculatePrice(tenantId, plan, couponCode);

    // Se o valor final for zero, ativa imediatamente a assinatura
    if (priceDetails.finalAmount === 0) {
      await BillingService.activateSubscription(tenantId, plan);
      return NextResponse.json({
        baseAmount: priceCalculationFormatted(priceDetails.baseAmount),
        discountAmount: priceCalculationFormatted(priceDetails.discountAmount),
        finalAmount: 0,
        appliedCoupon: priceDetails.appliedCoupon,
        companyDiscountPercentage: priceDetails.companyDiscountPercentage,
        couponDiscountPercentage: priceDetails.couponDiscountPercentage,
        pixPayload: '',
        pixQrCode: '',
        instantActive: true
      }, { status: 200 });
    }

    // Obter ou criar a assinatura ativa do tenant
    let subscription = await prisma.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      const planRecord = await prisma.plan.findFirst({
        where: { slug: plan, isActive: true }
      });
      if (!planRecord) {
        throw new Error('Plano não configurado no sistema');
      }
      subscription = await prisma.subscription.create({
        data: {
          tenantId,
          planId: planRecord.id,
          status: 'pending',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

    // Gerar fatura mensal real
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    const invoice = await InvoiceService.generateMonthlyInvoice(
      tenantId,
      subscription.id,
      start,
      end,
      couponCode
    );

    // Gerar o link do checkout InfinitePay
    const result = await InfinitePayProvider.createCheckoutLink(invoice.id);

    return NextResponse.json({
      baseAmount: priceCalculationFormatted(priceDetails.baseAmount),
      discountAmount: priceCalculationFormatted(priceDetails.discountAmount),
      finalAmount: priceCalculationFormatted(priceDetails.finalAmount),
      appliedCoupon: priceDetails.appliedCoupon,
      companyDiscountPercentage: priceDetails.companyDiscountPercentage,
      couponDiscountPercentage: priceDetails.couponDiscountPercentage,
      pixPayload: '',
      pixQrCode: '',
      checkoutUrl: result.checkoutUrl,
      instantActive: false
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
