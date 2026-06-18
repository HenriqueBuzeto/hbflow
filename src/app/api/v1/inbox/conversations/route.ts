import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'all';

    // Build base query
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    // Role-based department scoping for non-admins
    const deptFilter: any = {};
    if (roleName !== 'Admin' && roleName !== 'Gestor') {
      if (deptIds.length > 0) {
        deptFilter.departmentId = { in: deptIds };
      } else {
        // If no departments, they can only see their own assigned chats
        deptFilter.assignedUserId = user.id;
      }
    }

    // Apply view specific rules
    if (view === 'new') {
      // unassigned conversations
      where.assignedUserId = null;
      where.status = 'new';
      Object.assign(where, deptFilter);
    } else if (view === 'mine') {
      // assigned to the current user
      where.assignedUserId = user.id;
      where.status = { in: ['open', 'pending'] };
    } else if (view === 'team' || view === 'sector') {
      // supervisor/gestor views department/team
      if (roleName !== 'Admin' && roleName !== 'Gestor' && roleName !== 'Supervisor') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (deptIds.length > 0) {
        where.departmentId = { in: deptIds };
      }
      where.status = { in: ['open', 'pending'] };
    } else if (view === 'pending') {
      where.status = 'pending';
      Object.assign(where, deptFilter);
    } else if (view === 'closed') {
      where.status = 'closed';
      Object.assign(where, deptFilter);
    } else if (view === 'all') {
      // only Admin/Gestor/Supervisor with permission
      if (roleName !== 'Admin' && roleName !== 'Gestor' && roleName !== 'Supervisor') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        items: conversations
      }
    });

  } catch (error: any) {
    console.error('Error fetching inbox conversations:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
