import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';

const OFFICIAL_COUPONS = [
  {
    code: 'HBSTUDIO100',
    type: 'percentage',
    value: 100.0,
    duration: 'forever',
    durationMonths: null,
    maxRedemptions: null,
    isActive: true,
    appliesToPlanSlug: null,
    maxRedemptionsPerTenant: null,
    isSystemCoupon: true,
    metadataJson: JSON.stringify({ description: 'Cortesia/Uso Interno 100% Permanente' })
  },
  {
    code: 'OTICAPRO50',
    type: 'percentage',
    value: 73.67,
    duration: 'forever',
    durationMonths: null,
    maxRedemptions: null,
    isActive: true,
    appliesToPlanSlug: 'pro',
    maxRedemptionsPerTenant: null,
    isSystemCoupon: true,
    metadataJson: JSON.stringify({ fixedFinalPriceCents: 5000, description: 'Desconto permanente Plano Pro para R$ 50,00' })
  },
  {
    code: 'BEMVINDO40',
    type: 'percentage',
    value: 40.0,
    duration: 'once',
    durationMonths: null,
    maxRedemptions: null,
    isActive: true,
    appliesToPlanSlug: null,
    maxRedemptionsPerTenant: 1,
    isSystemCoupon: true,
    metadataJson: JSON.stringify({ description: 'Cupom de Boas-vindas 40% Primeira Mensalidade' })
  }
];

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem executar esta ação' }, { status: 403 });
    }

    for (const couponData of OFFICIAL_COUPONS) {
      const existing = await prisma.coupon.findUnique({
        where: { code: couponData.code }
      });

      if (existing) {
        await prisma.coupon.update({
          where: { id: existing.id },
          data: {
            type: couponData.type,
            value: couponData.value,
            duration: couponData.duration,
            appliesToPlanSlug: couponData.appliesToPlanSlug,
            maxRedemptionsPerTenant: couponData.maxRedemptionsPerTenant,
            isSystemCoupon: couponData.isSystemCoupon,
            metadataJson: couponData.metadataJson,
            isActive: couponData.isActive
          }
        });
      } else {
        await prisma.coupon.create({
          data: couponData
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Cupons oficiais semeados com sucesso' });
  } catch (error: any) {
    console.error('Error seeding official coupons:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
