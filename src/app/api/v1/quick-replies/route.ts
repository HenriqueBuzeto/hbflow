import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();

    const quickReplies = await prisma.quickReply.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        shortcut: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: quickReplies,
    });
  } catch (error: any) {
    console.error('Error fetching quick replies:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();

    const body = await request.json();
    const { shortcut, message, title, category, departmentId } = body;

    if (!shortcut || !message) {
      return NextResponse.json(
        { error: 'Shortcut and message fields are required' },
        { status: 400 }
      );
    }

    // Clean shortcut formatting (ensure it has a prefix like / or ! if the user didn't enter one, or let it be flexible)
    let formattedShortcut = shortcut.trim().toLowerCase();
    if (!formattedShortcut.startsWith('/') && !formattedShortcut.startsWith('!')) {
      formattedShortcut = '/' + formattedShortcut;
    }

    // Check for duplicate shortcut
    const existing = await prisma.quickReply.findFirst({
      where: {
        tenantId,
        shortcut: formattedShortcut,
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A quick reply with the shortcut '${formattedShortcut}' already exists.` },
        { status: 400 }
      );
    }

    const quickReply = await prisma.quickReply.create({
      data: {
        tenantId,
        shortcut: formattedShortcut,
        message: message.trim(),
        title: title ? title.trim() : null,
        category: category ? category.trim() : null,
        departmentId: departmentId || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: quickReply,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quick reply:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
