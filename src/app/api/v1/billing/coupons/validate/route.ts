import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';
import { BillingCalculatorService } from '@/server/services/billing/billing-calculator.service';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ success: false, error: 'Código do cupom é obrigatório' }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Assinatura ativa não encontrada' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    try {
      const calculation = await BillingCalculatorService.calculate(
        tenantId,
        subscription.planId,
        cleanCode
      );

      const coupon = await prisma.coupon.findUnique({
        where: { code: cleanCode }
      });

      return NextResponse.json({
        success: true,
        valid: true,
        reason: null,
        appliesToPlan: coupon?.appliesToPlanSlug || null,
        discountPreview: {
          subtotalCents: calculation.baseAmountCents,
          discountCents: calculation.discountCents,
          totalCents: calculation.totalCents
        }
      });
    } catch (calcError: any) {
      return NextResponse.json({
        success: true,
        valid: false,
        reason: calcError.message || 'Cupom inválido ou expirado',
        appliesToPlan: null,
        discountPreview: null
      });
    }
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
