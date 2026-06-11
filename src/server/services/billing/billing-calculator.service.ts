import { prisma } from '../../db/prisma';

export interface BillingCalculationResult {
  baseAmountCents: number;
  discountCents: number;
  totalCents: number;
  appliedCouponId?: string | null;
  appliedTenantDiscountId?: string | null;
  metadata: Record<string, any>;
}

export class BillingCalculatorService {
  /**
   * Calcula o preço final para um tenant baseado no plano e cupons/descontos
   */
  static async calculate(
    tenantId: string,
    planId: string,
    couponCode?: string
  ): Promise<BillingCalculationResult> {
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan || !plan.isActive || plan.deletedAt) {
      throw new Error('PLAN_NOT_FOUND_OR_INACTIVE');
    }

    const baseAmountCents = plan.priceCents;
    let discountCents = 0;
    let appliedCouponId: string | null = null;
    let appliedTenantDiscountId: string | null = null;
    let isFreeAccess = false;

    const metadata: Record<string, any> = {
      baseAmountCents,
      calculations: []
    };

    const now = new Date();

    // 1. Processar desconto manual por Tenant (TenantDiscount)
    const activeDiscounts = await prisma.tenantDiscount.findMany({
      where: {
        tenantId,
        isActive: true,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } }
        ],
        deletedAt: null
      }
    });

    // Pega o desconto mais vantajoso (ou primeiro ativo)
    if (activeDiscounts.length > 0) {
      const discount = activeDiscounts[0]; // Simplificado para pegar o primeiro ativo
      appliedTenantDiscountId = discount.id;
      
      metadata.calculations.push({
        type: 'tenant_discount',
        discountId: discount.id,
        discountType: discount.type,
        value: discount.value,
        reason: discount.reason
      });

      if (discount.type === 'free_access') {
        isFreeAccess = true;
        discountCents = baseAmountCents;
      } else if (discount.type === 'percentage') {
        const pct = Math.min(100, Math.max(0, discount.value));
        discountCents += Math.round(baseAmountCents * (pct / 100));
      } else if (discount.type === 'fixed_amount') {
        discountCents += Math.round(discount.value); // em centavos
      }
    }

    // 2. Processar cupom manual se fornecido
    if (couponCode && !isFreeAccess) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code: cleanCode }
      });

      if (coupon && coupon.isActive && !coupon.deletedAt) {
        const isStarted = !coupon.validFrom || coupon.validFrom <= now;
        const isNotExpired = !coupon.validUntil || coupon.validUntil >= now;
        const hasRedemptionsLeft = coupon.maxRedemptions === null || coupon.redeemedCount < coupon.maxRedemptions;

        if (isStarted && isNotExpired && hasRedemptionsLeft) {
          appliedCouponId = coupon.id;
          
          metadata.calculations.push({
            type: 'coupon',
            couponId: coupon.id,
            code: coupon.code,
            couponType: coupon.type,
            value: coupon.value
          });

          if (coupon.type === 'free_access') {
            isFreeAccess = true;
            discountCents = baseAmountCents;
          } else if (coupon.type === 'percentage') {
            const pct = Math.min(100, Math.max(0, coupon.value));
            discountCents += Math.round(baseAmountCents * (pct / 100));
          } else if (coupon.type === 'fixed_amount') {
            discountCents += Math.round(coupon.value); // em centavos
          }
        } else {
          metadata.couponError = 'Cupom expirado ou limite de uso atingido';
        }
      } else {
        metadata.couponError = 'Cupom não encontrado ou inativo';
      }
    }

    // Capping do desconto para não ser negativo ou superior ao preço base
    discountCents = Math.min(baseAmountCents, Math.max(0, discountCents));
    const totalCents = isFreeAccess ? 0 : (baseAmountCents - discountCents);

    metadata.finalAmountCents = totalCents;
    metadata.discountCents = discountCents;
    metadata.isFreeAccess = isFreeAccess;

    return {
      baseAmountCents,
      discountCents,
      totalCents,
      appliedCouponId,
      appliedTenantDiscountId,
      metadata
    };
  }
}
