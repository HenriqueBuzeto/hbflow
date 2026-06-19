import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { PermissionService } from '@/server/auth/permission.service';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';
import { PasswordService } from '@/server/auth/password.service';
import { AuditService } from '@/server/audit/audit.service';
import { DepartmentBootstrapService } from '@/server/services/department-bootstrap.service';

// Helper to determine plan user limit
function getPlanUserLimit(planSlug: string): number {
  if (planSlug === 'pro' || planSlug === 'pro-test') {
    return 10;
  }
  if (planSlug === 'enterprise') {
    return 1000;
  }
  return 3; // default Starter limit
}

// Helper to get or create a Role dynamically
async function getOrCreateRole(tenantId: string, roleName: string) {
  let role = await prisma.role.findFirst({
    where: { tenantId, name: roleName, deletedAt: null }
  });
  if (role) return role;

  role = await prisma.role.create({
    data: {
      tenantId,
      name: roleName,
      description: `Perfil de ${roleName} criado automaticamente`
    }
  });

  // Fetch tenant permissions to map basic ones
  const permissionsList = await prisma.permission.findMany({
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
      'dashboard.read', 'users.teammates.read'
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
    await prisma.rolePermission.createMany({
      data: rolePermissionsToCreate
    });
  }

  return role;
}

// Helper to get or create a Department dynamically
async function getOrCreateDepartment(tenantId: string, deptName: string) {
  const normalized = deptName.trim();
  let dept = await prisma.department.findFirst({
    where: {
      tenantId,
      name: {
        equals: normalized,
        mode: 'insensitive'
      }
    }
  });

  if (!dept) {
    dept = await prisma.department.create({
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'full';

    // 1. Authenticate and check correct permissions
    const user = await requireAuth();
    const hasFullRead = await PermissionService.hasPermission(user.userId, 'users.read');
    const hasTeammatesRead = await PermissionService.hasPermission(user.userId, 'users.teammates.read');

    if (!hasFullRead && !hasTeammatesRead) {
      throw new Error('FORBIDDEN');
    }

    if (scope === 'full' && !hasFullRead) {
      throw new Error('FORBIDDEN');
    }

    const tenantId = await requireActiveSubscription();

    // Bootstrap default departments (Vendas and Atendimento)
    await DepartmentBootstrapService.bootstrapDefaultDepartments(tenantId);

    // 2. Fetch users
    const users = await prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        role: true,
        presence: true,
        userDepartments: {
          include: { department: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // 3. Fetch tenant billing details
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    const planSlug = tenant?.plan || 'starter';
    const limit = getPlanUserLimit(planSlug);

    const activeUserCount = users.filter(u => u.isActive).length;

    // 4. Map DB users to Frontend User schema structure with real-time calculated workload
    const serializedUsers = await Promise.all(
      users.map(async (u) => {
        const workloadCount = await prisma.conversation.count({
          where: {
            tenantId,
            assignedUserId: u.id,
            status: 'open',
            deletedAt: null
          }
        });

        // Determine dynamic online status based on presence and lastSeen heartbeat
        const lastSeen = u.presence?.lastSeen ? new Date(u.presence.lastSeen) : null;
        const secondsSinceLastSeen = lastSeen ? (Date.now() - lastSeen.getTime()) / 1000 : null;
        const isActuallyOnline = u.presence?.presence !== 'offline' && secondsSinceLastSeen !== null && secondsSinceLastSeen <= 30;

        const baseData = {
          id: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
          role: u.role?.name || 'Atendente',
          departments: u.userDepartments.map(ud => ud.department?.name).filter(Boolean),
          isOnline: isActuallyOnline
        };

        if (scope === 'teammates') {
          // Sanitized: return only safe teammate properties
          return baseData;
        }

        // Full profile data (for users.read)
        return {
          ...baseData,
          email: u.email,
          signature: u.signature || '',
          sigPosition: u.sigPosition as 'start' | 'end' | 'disabled',
          filters: u.userDepartments.map(ud => ud.department?.name?.toLowerCase() || '').filter(Boolean),
          presence: isActuallyOnline ? (u.presence?.presence || 'online') : 'offline',
          workload: workloadCount
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: serializedUsers,
      plan: planSlug,
      limit,
      count: activeUserCount
    });
  } catch (error: any) {
    console.error('Error listing users:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ success: false, error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate & require permission
    await requirePermission('users.create');
    const tenantId = await requireActiveSubscription();

    // 2. Fetch tenant & plan limits
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    const planSlug = tenant?.plan || 'starter';
    const limit = getPlanUserLimit(planSlug);

    const activeUserCount = await prisma.user.count({
      where: { tenantId, deletedAt: null }
    });

    if (activeUserCount >= limit) {
      return NextResponse.json({
        success: false,
        error: `Você atingiu o limite de ${limit} usuários para o plano ${planSlug.toUpperCase()}. Faça upgrade para adicionar novos usuários.`
      }, { status: 400 });
    }

    // 3. Read & Validate inputs
    const body = await request.json().catch(() => ({}));
    const { name, email, password, role: roleName, filters, avatarUrl, phone, signature, sigPosition } = body;

    if (!name || !email || !password || !roleName) {
      return NextResponse.json({ success: false, error: 'Todos os campos obrigatórios devem ser preenchidos.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'E-mail inválido.' }, { status: 400 });
    }

    // Validate email globally unique
    const existingUser = await prisma.user.findFirst({
      where: { email: cleanEmail }
    });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Este e-mail de login já está em uso por outro usuário.' }, { status: 400 });
    }

    // Validate password strength
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

    // Hash password
    const passwordHash = await PasswordService.hash(password);

    // Get or create the Role
    const role = await getOrCreateRole(tenantId, roleName);

    // Create the User in database
    const user = await prisma.user.create({
      data: {
        tenantId,
        name,
        email: cleanEmail,
        passwordHash,
        roleId: role.id,
        avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces`,
        phone: phone || null,
        signature: signature || null,
        sigPosition: sigPosition || 'end',
        isActive: true,
        isOnline: false,
        workload: 0
      }
    });

    // Create UserPresence & Profile
    await prisma.userPresence.create({
      data: {
        userId: user.id,
        tenantId,
        presence: 'offline'
      }
    });

    await prisma.userProfile.create({
      data: {
        userId: user.id
      }
    });

    // Handle departments/filters
    if (filters && Array.isArray(filters)) {
      for (const filterName of filters) {
        if (filterName) {
          const dept = await getOrCreateDepartment(tenantId, filterName);
          await prisma.userDepartment.create({
            data: {
              tenantId,
              userId: user.id,
              departmentId: dept.id,
              isActive: true
            }
          });
        }
      }
    }

    // Log action to audit trails
    await AuditService.log({
      tenantId,
      userId: user.id,
      action: 'user.created',
      entity: 'user',
      entityId: user.id,
      metadata: { name: user.name, email: user.email, role: roleName }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleName
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ success: false, error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
