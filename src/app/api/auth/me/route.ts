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
        tenant: true,
      },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Obter permissões usando o PermissionService
    const permissions = await PermissionService.getUserPermissions(user.userId);

    // Remover senha hash da resposta
    const { passwordHash, ...userWithoutPassword } = fullUser;

    return NextResponse.json({
      user: userWithoutPassword,
      permissions,
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
