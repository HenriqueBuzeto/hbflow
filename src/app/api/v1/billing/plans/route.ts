import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

export async function GET() {
  try {
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
