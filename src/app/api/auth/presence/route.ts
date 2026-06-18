import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();

    const body = await request.json();
    const { presence } = body;

    const allowedPresences = ['online', 'away', 'lunch', 'meeting', 'break', 'offline'];
    if (!presence || !allowedPresences.includes(presence)) {
      return NextResponse.json(
        { error: 'Invalid presence status' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update UserPresence in database (upsert to handle missing records)
    await prisma.userPresence.upsert({
      where: { userId: user.userId },
      update: { presence, lastSeen: now },
      create: {
        userId: user.userId,
        tenantId,
        presence,
        lastSeen: now,
      },
    });

    // Update isOnline boolean on the User model
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        isOnline: presence !== 'offline',
      },
    });

    return NextResponse.json({
      success: true,
      presence,
    });
  } catch (error: any) {
    console.error('Error updating presence status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
