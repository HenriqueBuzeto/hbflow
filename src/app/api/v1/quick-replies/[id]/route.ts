import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    const { id } = await params;

    const body = await request.json();
    const { shortcut, message, title, category, departmentId, isActive } = body;

    // Verify ownership
    const quickReply = await prisma.quickReply.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!quickReply) {
      return NextResponse.json(
        { error: 'Quick reply not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (shortcut !== undefined) {
      let formattedShortcut = shortcut.trim().toLowerCase();
      if (!formattedShortcut.startsWith('/') && !formattedShortcut.startsWith('!')) {
        formattedShortcut = '/' + formattedShortcut;
      }

      // Check if duplicate shortcut exists on another record
      const existing = await prisma.quickReply.findFirst({
        where: {
          tenantId,
          shortcut: formattedShortcut,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `A quick reply with the shortcut '${formattedShortcut}' already exists.` },
          { status: 400 }
        );
      }
      updateData.shortcut = formattedShortcut;
    }

    if (message !== undefined) updateData.message = message.trim();
    if (title !== undefined) updateData.title = title ? title.trim() : null;
    if (category !== undefined) updateData.category = category ? category.trim() : null;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const updated = await prisma.quickReply.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating quick reply:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    const { id } = await params;

    // Verify ownership
    const quickReply = await prisma.quickReply.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!quickReply) {
      return NextResponse.json(
        { error: 'Quick reply not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.quickReply.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Quick reply deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting quick reply:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
