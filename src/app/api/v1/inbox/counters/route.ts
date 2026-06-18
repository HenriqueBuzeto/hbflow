import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';

export async function GET() {
  try {
    const authUser = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('conversations.read');

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: {
        role: true,
        userDepartments: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const roleName = user.role?.name || 'Atendente';
    const deptIds = user.userDepartments.map((ud) => ud.departmentId);

    let total = 0;
    let newCount = 0;
    let mine = 0;
    let unassigned = 0;
    let resolved = 0;
    let waiting = 0;

    // Build role/department scoping constraints for queries
    const deptFilter: any = {};
    if (roleName !== 'Admin' && roleName !== 'Gestor') {
      if (deptIds.length > 0) {
        deptFilter.departmentId = { in: deptIds };
      } else {
        // If no departments, they can only see their own assigned chats
        deptFilter.assignedUserId = user.id;
      }
    }

    // 1. total = visíveis para ele conforme departamento/fila e não deletadas
    total = await prisma.conversation.count({
      where: {
        tenantId,
        ...deptFilter,
        deletedAt: null
      }
    });

    // 2. new = não atribuídas, status new
    newCount = await prisma.conversation.count({
      where: {
        tenantId,
        ...deptFilter,
        status: 'new',
        assignedUserId: null,
        deletedAt: null
      }
    });

    // 3. mine = atribuídas ao usuário logado, status open/pending (não resolvidas)
    mine = await prisma.conversation.count({
      where: {
        tenantId,
        assignedUserId: user.id,
        status: { in: ['open', 'pending'] },
        deletedAt: null
      }
    });

    // 4. unassigned = total sem atendente atribuído
    unassigned = await prisma.conversation.count({
      where: {
        tenantId,
        ...deptFilter,
        assignedUserId: null,
        deletedAt: null
      }
    });

    // 5. resolved = status closed
    resolved = await prisma.conversation.count({
      where: {
        tenantId,
        ...deptFilter,
        status: 'closed',
        deletedAt: null
      }
    });

    // 6. waiting = status pending (aguardando retorno/cliente)
    waiting = await prisma.conversation.count({
      where: {
        tenantId,
        ...deptFilter,
        status: 'pending',
        deletedAt: null
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        total,
        new: newCount,
        mine,
        unassigned,
        resolved,
        waiting
      }
    });

  } catch (error: any) {
    console.error('Error calculating inbox counters:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
