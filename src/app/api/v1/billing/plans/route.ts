import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

export async function GET() {
  try {
    // Garantir que os planos principais existam com os preços e nomes corretos no banco
    await prisma.plan.upsert({
      where: { slug: 'starter' },
      update: {
        name: 'Plano Starter',
        priceCents: 9990, // R$ 99.90
        isActive: true,
        deletedAt: null
      },
      create: {
        name: 'Plano Starter',
        slug: 'starter',
        priceCents: 9990,
        billingCycle: 'monthly',
        isActive: true
      }
    });

    await prisma.plan.upsert({
      where: { slug: 'pro' },
      update: {
        name: 'Plano Pro',
        priceCents: 18990, // R$ 189.90
        isActive: true,
        deletedAt: null
      },
      create: {
        name: 'Plano Pro',
        slug: 'pro',
        priceCents: 18990,
        billingCycle: 'monthly',
        isActive: true
      }
    });

    await prisma.plan.upsert({
      where: { slug: 'enterprise' },
      update: {
        name: 'Plano Enterprise',
        priceCents: 0, // A combinar / Negociável
        isActive: true,
        deletedAt: null
      },
      create: {
        name: 'Plano Enterprise',
        slug: 'enterprise',
        priceCents: 0,
        billingCycle: 'monthly',
        isActive: true
      }
    });

    const plans = await prisma.plan.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { priceCents: 'asc' }
    });

    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
