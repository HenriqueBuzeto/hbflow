import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();

    const messages = await prisma.internalMessage.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('Error fetching internal messages:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 550 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();

    const body = await request.json();
    const { receiverId, body: messageBody } = body;

    if (!receiverId || !messageBody) {
      return NextResponse.json(
        { error: 'Fields receiverId and body are required' },
        { status: 400 }
      );
    }

    const message = await prisma.internalMessage.create({
      data: {
        tenantId,
        senderId: user.userId,
        receiverId,
        body: messageBody.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Error creating internal message:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 550 }
    );
  }
}
