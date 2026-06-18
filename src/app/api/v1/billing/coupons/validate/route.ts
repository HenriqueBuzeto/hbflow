import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';
import { BillingCalculatorService } from '@/server/services/billing/billing-calculator.service';

export async function GET(request: NextRequest) {
  try {
    let isAuthenticated = false;
    let tenantId: string | null = null;
    
    try {
      await requireAuth();
      tenantId = await requireTenant();
      isAuthenticated = !!tenantId;
    } catch (authError) {
      // Ignore auth error for public validation (guest)
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ success: false, error: 'Código do cupom é obrigatório' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const now = new Date();

    // Buscar cupom ativo
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: cleanCode,
        isActive: true,
        deletedAt: null,
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } }
        ]
      }
    });

    if (!coupon) {
      return NextResponse.json({
        success: true,
        valid: false,
        reason: 'Cupom inválido ou expirado',
        appliesToPlan: null,
        discountPreview: null
      });
    }

    // Validar limites
    if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
      return NextResponse.json({
        success: true,
        valid: false,
        reason: 'Este cupom já atingiu o limite de usos',
        appliesToPlan: null,
        discountPreview: null
      });
    }

    // Se estiver autenticado, tenta calcular preview dos valores
    if (isAuthenticated && tenantId) {
      const subscription = await prisma.subscription.findFirst({
        where: { tenantId, deletedAt: null },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      });

      if (subscription) {
        try {
          const calculation = await BillingCalculatorService.calculate(
            tenantId,
            subscription.planId,
            cleanCode
          );

          return NextResponse.json({
            success: true,
            valid: true,
            reason: null,
            appliesToPlan: coupon.appliesToPlanSlug || null,
            discountPreview: {
              subtotalCents: calculation.baseAmountCents,
              discountCents: calculation.discountCents,
              totalCents: calculation.totalCents
            }
          });
        } catch (calcError: any) {
          // Ignora erro de calculo e retorna validade basica do cupom
        }
      }
    }

    return NextResponse.json({
      success: true,
      valid: true,
      reason: null,
      appliesToPlan: coupon.appliesToPlanSlug || null,
      discountPreview: null
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
