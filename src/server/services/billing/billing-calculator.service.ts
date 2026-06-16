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
    let finalCouponCode: string | null = null;
    let couponType: string | null = null;
    let couponDuration: string | null = null;
    let discountPercentage: number | null = null;

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
      },
      include: {
        coupon: true
      }
    });

    // Pega o desconto ativo mais vantajoso/recente
    if (activeDiscounts.length > 0) {
      const discount = activeDiscounts[0];
      
      // Se for desconto vinculado a cupom, valida as regras do cupom
      if (discount.coupon) {
        const coupon = discount.coupon;
        if (coupon.isActive && !coupon.deletedAt) {
          // Validar data de validade do cupom
          const isStarted = !coupon.validFrom || coupon.validFrom <= now;
          const isNotExpired = !coupon.validUntil || coupon.validUntil >= now;
          if (isStarted && isNotExpired) {
            // Validar plano
            if (coupon.appliesToPlanSlug && plan.slug !== coupon.appliesToPlanSlug) {
              // Cupom permanente vinculado não é aplicado se o plano mudar e não bater
            } else {
              appliedCouponId = coupon.id;
              appliedTenantDiscountId = discount.id;
              finalCouponCode = coupon.code;
              couponType = coupon.type;
              couponDuration = coupon.duration;
              
              metadata.calculations.push({
                type: 'coupon_via_discount',
                couponId: coupon.id,
                code: coupon.code,
                couponType: coupon.type,
                value: coupon.value
              });

              if (coupon.type === 'free_access') {
                isFreeAccess = true;
                discountCents = baseAmountCents;
              } else if (coupon.type === 'percentage') {
                discountPercentage = coupon.value;
                if (coupon.code === 'OTICAPRO50' && plan.slug === 'pro') {
                  // Regra especial para garantir exatamente R$ 50,00 final
                  discountCents = Math.max(0, baseAmountCents - 5000);
                } else {
                  const pct = Math.min(100, Math.max(0, coupon.value));
                  discountCents = Math.round(baseAmountCents * (pct / 100));
                }
              } else if (coupon.type === 'fixed_amount') {
                discountCents = Math.round(coupon.value);
              }
            }
          }
        }
      } else {
        // Desconto manual sem cupom
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
          discountCents = Math.round(baseAmountCents * (pct / 100));
        } else if (discount.type === 'fixed_amount') {
          discountCents = Math.round(discount.value);
        }
      }
    }

    // 2. Processar cupom manual se fornecido (sobrescreve desconto do tenant se aplicável)
    if (couponCode && !isFreeAccess) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code: cleanCode }
      });

      if (!coupon || !coupon.isActive || coupon.deletedAt) {
        throw new Error('CUPON_NOT_FOUND_OR_INACTIVE');
      }

      const isStarted = !coupon.validFrom || coupon.validFrom <= now;
      const isNotExpired = !coupon.validUntil || coupon.validUntil >= now;
      if (!isStarted || !isNotExpired) {
        throw new Error('CUPON_EXPIRED');
      }

      // Validar plano
      if (coupon.appliesToPlanSlug && plan.slug !== coupon.appliesToPlanSlug) {
        throw new Error('CUPON_NOT_VALID_FOR_PLAN');
      }

      // Validar limite de resgates por tenant
      if (coupon.maxRedemptionsPerTenant !== null) {
        const redemptionsCount = await prisma.couponRedemption.count({
          where: {
            tenantId,
            couponId: coupon.id
          }
        });
        if (redemptionsCount >= coupon.maxRedemptionsPerTenant) {
          throw new Error('CUPON_LIMIT_REACHED_FOR_TENANT');
        }
      }

      // Validar limite global de resgates
      if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
        throw new Error('CUPON_MAX_REDEMPTIONS_REACHED');
      }

      // Se passou nas validações, aplica o cupom manual (substitui o anterior do cálculo atual)
      appliedCouponId = coupon.id;
      finalCouponCode = coupon.code;
      couponType = coupon.type;
      couponDuration = coupon.duration;
      discountCents = 0; // reseta descontos anteriores para aplicar o cupom manual
      isFreeAccess = false;

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
        discountPercentage = coupon.value;
        if (coupon.code === 'OTICAPRO50' && plan.slug === 'pro') {
          // Regra especial para garantir exatamente R$ 50,00 final
          discountCents = Math.max(0, baseAmountCents - 5000);
        } else {
          const pct = Math.min(100, Math.max(0, coupon.value));
          discountCents = Math.round(baseAmountCents * (pct / 100));
        }
      } else if (coupon.type === 'fixed_amount') {
        discountCents = Math.round(coupon.value);
      }
    }

    // Capping do desconto para não ser negativo ou superior ao preço base
    discountCents = Math.min(baseAmountCents, Math.max(0, discountCents));
    const totalCents = isFreeAccess ? 0 : (baseAmountCents - discountCents);

    // Injetar dados formatados no metadata
    metadata.couponCode = finalCouponCode;
    metadata.couponId = appliedCouponId;
    metadata.couponType = couponType;
    metadata.couponDuration = couponDuration;
    metadata.discountPercentage = discountPercentage;
    metadata.discountCents = discountCents;
    metadata.originalAmountCents = baseAmountCents;
    metadata.finalAmountCents = totalCents;
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
