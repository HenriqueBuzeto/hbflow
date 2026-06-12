import { prisma } from '../db/prisma';

export class RBACBootstrapService {
  // Permissões padrão para um tenant recém-criado
  private static readonly DEFAULT_PERMISSIONS = [
    'contacts.read',
    'contacts.create',
    'contacts.update',
    'contacts.delete',
    'conversations.read',
    'conversations.create',
    'conversations.update',
    'conversations.delete',
    'messages.read',
    'messages.create',
    'messages.update',
    'messages.delete',
    'deals.read',
    'deals.create',
    'deals.update',
    'deals.delete',
    'tasks.read',
    'tasks.create',
    'tasks.update',
    'tasks.delete',
    'dashboard.read',
    'settings.read',
    'users.read',
    'users.create',
    'users.update',
    'feature_flags.read',
    'health.read',
    'whatsapp.connection.manage',
  ];

  /**
   * Cria permissões padrão para um tenant e vincula ao role Admin
   * Esta função é idempotente - pode ser chamada múltiplas vezes sem criar duplicatas
   */
  static async bootstrapTenantRBAC(tenantId: string, adminRoleId: string): Promise<void> {
    try {
      // 1. Criar permissões padrão para o tenant (se não existirem)
      const createdPermissions = await this.createDefaultPermissions(tenantId);

      // 2. Vincular todas as permissões ao role Admin
      await this.linkPermissionsToRole(adminRoleId, createdPermissions);

      console.log(`✅ RBAC bootstrap completed for tenant ${tenantId}`);
    } catch (error) {
      console.error(`❌ RBAC bootstrap failed for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Cria permissões padrão para o tenant de forma idempotente
   */
  private static async createDefaultPermissions(tenantId: string): Promise<Array<{ id: string; name: string }>> {
    const permissions: Array<{ id: string; name: string }> = [];

    for (const permissionName of this.DEFAULT_PERMISSIONS) {
      // Upsert para evitar duplicatas
      const permission = await prisma.permission.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: permissionName,
          },
        },
        create: {
          tenantId,
          name: permissionName,
          description: `${permissionName} permission`,
        },
        update: {}, // Não atualiza se já existir
      });

      permissions.push({
        id: permission.id,
        name: permission.name,
      });
    }

    return permissions;
  }

  /**
   * Vincula permissões ao role de forma idempotente
   */
  private static async linkPermissionsToRole(
    roleId: string,
    permissions: Array<{ id: string; name: string }>
  ): Promise<void> {
    for (const permission of permissions) {
      // Upsert para evitar duplicatas
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permission.id,
          },
        },
        create: {
          roleId,
          permissionId: permission.id,
        },
        update: {}, // Não atualiza se já existir
      });
    }
  }

  /**
   * Verifica se o RBAC foi inicializado para o tenant
   */
  static async isRBACInitialized(tenantId: string): Promise<boolean> {
    const permissionCount = await prisma.permission.count({
      where: {
        tenantId,
      },
    });

    return permissionCount >= this.DEFAULT_PERMISSIONS.length;
  }

  /**
   * Retorna todas as permissões de um usuário (via role e diretas)
   */
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
    }

    // Adicionar permissões diretas do usuário
    user.permissions.forEach((up) => {
      permissions.add(up.permission.name);
    });

    return Array.from(permissions);
  }
}
