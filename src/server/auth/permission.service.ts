import { prisma } from '../db/prisma';

export class PermissionService {
  static async getUserPermissions(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    const permissions = new Set<string>();

    // Adicionar permissões do role
    if (user.role) {
      user.role.rolePermissions.forEach((rp) => {
        permissions.add(rp.permission.name);
      });
      if (user.role.name === 'Admin') {
        permissions.add('billing.read');
      }
    }

    // Adicionar permissões diretas do usuário
    user.permissions.forEach((up) => {
      permissions.add(up.permission.name);
    });

    return Array.from(permissions);
  }

  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  static async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some((p) => userPermissions.includes(p));
  }

  static async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every((p) => userPermissions.includes(p));
  }

  static async grantPermission(userId: string, permissionName: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Buscar ou criar a permissão
    let permission = await prisma.permission.findFirst({
      where: {
        tenantId: user.tenantId,
        name: permissionName,
      },
    });

    if (!permission) {
      permission = await prisma.permission.create({
        data: {
          tenantId: user.tenantId,
          name: permissionName,
        },
      });
    }

    // Conceder permissão ao usuário
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
      create: {
        userId,
        permissionId: permission.id,
      },
      update: {},
    });
  }

  static async revokePermission(userId: string, permissionName: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const permission = await prisma.permission.findFirst({
      where: {
        tenantId: user.tenantId,
        name: permissionName,
      },
    });

    if (!permission) {
      throw new Error('Permission not found');
    }

    await prisma.userPermission.deleteMany({
      where: {
        userId,
        permissionId: permission.id,
      },
    });
  }
}
