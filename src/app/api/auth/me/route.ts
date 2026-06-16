import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';
import { PermissionService } from '@/server/auth/permission.service';

export async function GET() {
  try {
    const user = await requireAuth();
    await requireTenant();

    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        tenant: {
          include: {
            subscriptions: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        role: true,
        userDepartments: {
          include: { department: true }
        }
      },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isSuperAdmin = 
      fullUser.email === 'henrique@hbflow.com' ||
      (fullUser.role?.name === 'Admin' && fullUser.tenant?.slug === 'hbflow');

    let isBlocked = false;
    let blockError: string | undefined = undefined;

    if (!isSuperAdmin && fullUser.tenant) {
      isBlocked = fullUser.tenant.isBlocked;
      if (isBlocked) {
        blockError = 'SUBSCRIPTION_REQUIRED';
      }
    }

    // Obter permissões usando o PermissionService
    const permissions = await PermissionService.getUserPermissions(user.userId);

    // Obter workload de conversas ativas em tempo real
    const workloadCount = await prisma.conversation.count({
      where: {
        tenantId: fullUser.tenantId,
        assignedUserId: fullUser.id,
        status: 'open',
        deletedAt: null
      }
    });

    // Obter presença em tempo real
    const userPresence = await prisma.userPresence.findUnique({
      where: { userId: fullUser.id }
    });

    // Remover senha hash da resposta e injetar valores calculados em tempo real
    const { passwordHash, ...userWithoutPassword } = {
      ...fullUser,
      workload: workloadCount,
      presence: userPresence?.presence || 'offline'
    };

    // Obter todas as empresas (tenants) vinculadas ao e-mail do usuário
    const userTenants = await prisma.user.findMany({
      where: {
        email: fullUser.email,
        isActive: true,
        tenant: { isActive: true }
      },
      include: {
        tenant: {
          include: {
            subscriptions: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    const tenantsList = userTenants.map((ut: any) => ut.tenant).filter(Boolean);

    return NextResponse.json({
      user: userWithoutPassword,
      permissions,
      isBlocked,
      error: blockError,
      tenants: tenantsList
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
