import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    value: 73.67, // Para fazer R$ 189,90 virar exatamente R$ 50,00
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

async function seedOfficialCoupons() {
  console.log('=== SEEDING OFFICIAL PROMOTIONAL COUPONS ===\n');

  for (const couponData of OFFICIAL_COUPONS) {
    try {
      const existing = await prisma.coupon.findUnique({
        where: { code: couponData.code }
      });

      if (existing) {
        // Upsert/Update to ensure correct attributes
        const updated = await prisma.coupon.update({
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
        console.log(`✅ Updated official coupon "${updated.code}"`);
      } else {
        const created = await prisma.coupon.create({
          data: couponData
        });
        console.log(`✅ Created official coupon "${created.code}"`);
      }
    } catch (error) {
      console.error(`❌ Failed to seed coupon "${couponData.code}":`, error);
    }
  }

  console.log('\n=== OFFICIAL COUPONS SEEDING COMPLETE ===');
}

seedOfficialCoupons()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding coupons:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
