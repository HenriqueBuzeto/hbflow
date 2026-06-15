import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { PasswordService } from '@/server/auth/password.service';
import { AuditService } from '@/server/audit/audit.service';

// Helper to get or create a Department dynamically inside transaction
async function getOrCreateDepartmentTx(tx: any, tenantId: string, deptName: string) {
  const normalized = deptName.trim();
  let dept = await tx.department.findFirst({
    where: {
      tenantId,
      name: {
        equals: normalized,
        mode: 'insensitive'
      }
    }
  });

  if (!dept) {
    dept = await tx.department.create({
      data: {
        tenantId,
        name: normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase(),
        description: `Setor de ${normalized}`,
        color: '#7C3AED',
        icon: 'Shield',
        greetingMessage: `Olá! Você está no setor de ${normalized}.`,
        awayMessage: `Olá! Nosso setor de ${normalized} está offline.`
      }
    });
  }
  return dept;
}

// Helper to get or create a Role dynamically inside transaction
async function getOrCreateRoleTx(tx: any, tenantId: string, roleName: string) {
  let role = await tx.role.findFirst({
    where: { tenantId, name: roleName, deletedAt: null }
  });
  if (role) return role;

  role = await tx.role.create({
    data: {
      tenantId,
      name: roleName,
      description: `Perfil de ${roleName} criado automaticamente`
    }
  });

  // Fetch tenant permissions to map basic ones
  const permissionsList = await tx.permission.findMany({
    where: { tenantId }
  });

  let allowedNames: string[] = [];
  if (roleName === 'Admin') {
    allowedNames = permissionsList.map((p: any) => p.name);
  } else if (roleName === 'Gestor') {
    allowedNames = permissionsList
      .filter((p: any) => !p.name.includes('billing') && p.name !== 'health.read')
      .map((p: any) => p.name);
  } else if (roleName === 'Comercial' || roleName === 'Atendente') {
    const atendentePerms = [
      'contacts.read', 'contacts.create', 'contacts.update',
      'conversations.read', 'conversations.create', 'conversations.update',
      'messages.read', 'messages.create',
      'deals.read', 'deals.create', 'deals.update',
      'tasks.read', 'tasks.create', 'tasks.update',
      'dashboard.read'
    ];
    allowedNames = atendentePerms;
  } else if (roleName === 'Financeiro') {
    const financeiroPerms = [
      'contacts.read', 'conversations.read', 'messages.read',
      'deals.read', 'dashboard.read'
    ];
    allowedNames = financeiroPerms;
  }

  const rolePermissionsToCreate = permissionsList
    .filter((p: any) => allowedNames.includes(p.name))
    .map((p: any) => ({
      roleId: role!.id,
      permissionId: p.id
    }));

  if (rolePermissionsToCreate.length > 0) {
    await tx.rolePermission.createMany({
      data: rolePermissionsToCreate
    });
  }

  return role;
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;
  try {
    // 1. Authenticate & require permission
    await requirePermission('users.update');
    const tenantId = await requireActiveSubscription();
    const sessionUser = await requireAuth();
    const { userId } = params;

    // 2. Fetch target user
    const userToUpdate = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null }
    });

    if (!userToUpdate) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // 3. Read & validate inputs
    const body = await request.json().catch(() => ({}));
    const { name, email, password, role: roleName, filters, isActive, avatarUrl, phone, signature, sigPosition } = body;

    if (!name || !email || !roleName) {
      return NextResponse.json({ success: false, error: 'Nome, e-mail e perfil são campos obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'E-mail inválido.' }, { status: 400 });
    }

    // Uniqueness of email check
    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        id: { not: userId }
      }
    });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Este e-mail de login já está em uso por outro usuário.' }, { status: 400 });
    }

    // Guard: Prevent deactivating yourself
    if (isActive === false && sessionUser.userId === userId) {
      return NextResponse.json({ success: false, error: 'Você não pode desativar o seu próprio usuário.' }, { status: 400 });
    }

    let passwordHash: string | undefined = undefined;
    if (password) {
      const passwordValidation = PasswordService.validateStrength(password);
      if (!passwordValidation.valid) {
        return NextResponse.json({
          success: false,
          error: `Senha fraca: ${passwordValidation.errors.map(e => {
            if (e.includes('least 8 characters')) return 'mínimo 8 caracteres';
            if (e.includes('uppercase letter')) return 'pelo menos uma letra maiúscula';
            if (e.includes('lowercase letter')) return 'pelo menos uma letra minúscula';
            if (e.includes('number')) return 'pelo menos um número';
            if (e.includes('special character')) return 'pelo menos um caractere especial';
            return e;
          }).join(', ')}.`
        }, { status: 400 });
      }
      passwordHash = await PasswordService.hash(password);
    }

    // 4. Update data in transaction
    await prisma.$transaction(async (tx) => {
      const role = await getOrCreateRoleTx(tx, tenantId, roleName);

      await tx.user.update({
        where: { id: userId },
        data: {
          name,
          email: cleanEmail,
          roleId: role.id,
          isActive: isActive !== undefined ? isActive : true,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
          phone: phone !== undefined ? phone : undefined,
          signature: signature !== undefined ? signature : undefined,
          sigPosition: sigPosition !== undefined ? sigPosition : undefined,
          ...(passwordHash ? { passwordHash } : {})
        }
      });

      // Clear old linkages
      await tx.userDepartment.deleteMany({
        where: { userId }
      });

      // Bind selected departments
      if (filters && Array.isArray(filters)) {
        for (const filterName of filters) {
          if (filterName) {
            const dept = await getOrCreateDepartmentTx(tx, tenantId, filterName);
            await tx.userDepartment.create({
              data: {
                tenantId,
                userId,
                departmentId: dept.id,
                isActive: true
              }
            });
          }
        }
      }
    });

    // Log action to audit trails
    await AuditService.log({
      tenantId,
      userId: sessionUser.userId,
      action: 'user.updated',
      entity: 'user',
      entityId: userId,
      metadata: { name, email: cleanEmail, role: roleName }
    });

    return NextResponse.json({ success: true, message: 'Usuário atualizado com sucesso.' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ success: false, error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;
  try {
    // 1. Authenticate & require permission
    await requirePermission('users.update');
    const tenantId = await requireActiveSubscription();
    const sessionUser = await requireAuth();
    const { userId } = params;

    // Guard: Prevent deleting yourself
    if (sessionUser.userId === userId) {
      return NextResponse.json({ success: false, error: 'Você não pode excluir a si mesmo.' }, { status: 400 });
    }

    // 2. Fetch target user
    const userToDelete = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null }
    });

    if (!userToDelete) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // 3. Perform Soft Delete (flag deletedAt and deactivate account to release plan quota)
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    // Log action to audit trails
    await AuditService.log({
      tenantId,
      userId: sessionUser.userId,
      action: 'user.deleted',
      entity: 'user',
      entityId: userId,
      metadata: { name: userToDelete.name, email: userToDelete.email }
    });

    return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ success: false, error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
