import { prisma } from '../db/prisma';
import { PasswordService } from './password.service';
import { TokenService, TokenPayload } from './token.service';
import { SessionService } from './session.service';
import { setTenantId } from '../db/tenant-context';
import { RBACBootstrapService } from './rbac-bootstrap.service';

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface RegisterData {
  tenantName: string;
  tenantSlug: string;
  userName: string;
  userEmail: string;
  userPassword: string;
}

export interface AuthResult {
  user: any;
  tenant: any;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password, tenantSlug } = credentials;

    let user;
    let tenant;

    if (tenantSlug) {
      // Login com tenant específico
      tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      user = await prisma.user.findFirst({
        where: {
          email,
          tenantId: tenant.id,
        },
        include: {
          tenant: true,
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
    } else {
      // Login global (encontra usuário por email em qualquer tenant)
      user = await prisma.user.findUnique({
        where: { email },
        include: {
          tenant: true,
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
        throw new Error('Invalid credentials');
      }

      tenant = user.tenant;
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    if (!tenant.isActive) {
      throw new Error('Tenant account is inactive');
    }

    const passwordValid = await PasswordService.verify(password, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    // Criar log de login
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        email: user.email,
        action: 'login',
        success: true,
      },
    });

    // Gerar tokens
    const payload: TokenPayload = {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      roleId: user.roleId || undefined,
    };

    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    // Criar sessão (será criada pelo middleware no futuro)
    
    // Definir contexto do tenant
    setTenantId(tenant.id);

    return {
      user,
      tenant,
      accessToken,
      refreshToken,
    };
  }

  static async register(data: RegisterData): Promise<AuthResult> {
    const { tenantName, tenantSlug, userName, userEmail, userPassword } = data;

    // Validar força da senha
    const passwordValidation = PasswordService.validateStrength(userPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Verificar se o slug do tenant já existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (existingTenant) {
      throw new Error('Tenant slug already exists');
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Criar tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        plan: 'starter',
        status: 'trial',
        isActive: true,
      },
    });

    // Criar role padrão (Admin)
    const adminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Admin',
        description: 'Administrador com acesso total',
      },
    });

    // Criar usuário
    const passwordHash = await PasswordService.hash(userPassword);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: userName,
        email: userEmail,
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
      },
      include: {
        tenant: true,
        role: true,
      },
    });

    // Criar configurações do tenant
    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
      },
    });

    // Criar custo AI do tenant
    await prisma.tenantAICost.create({
      data: {
        tenantId: tenant.id,
        monthlyLimit: 100.0,
        monthlySpent: 0.0,
      },
    });

    // Bootstrap RBAC: criar permissões padrão e vincular ao role Admin
    await RBACBootstrapService.bootstrapTenantRBAC(tenant.id, adminRole.id);

    // Gerar tokens
    const payload: TokenPayload = {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      roleId: user.roleId || undefined,
    };

    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    // Criar log de login
    await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        email: user.email,
        action: 'login',
        success: true,
      },
    });

    setTenantId(tenant.id);

    return {
      user,
      tenant,
      accessToken,
      refreshToken,
    };
  }

  static async logout(userId: string, tenantId: string): Promise<void> {
    // Criar log de logout
    await prisma.loginAuditLog.create({
      data: {
        userId,
        tenantId,
        action: 'logout',
        success: true,
      },
    });

    // Deletar todas as sessões do usuário
    await SessionService.deleteAllUserSessions(userId);
  }

  static async refreshToken(refreshToken: string): Promise<AuthResult> {
    const payload = TokenService.verifyToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        tenant: true,
        role: true,
      },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid or expired refresh token');
    }

    const tenant = user.tenant;
    if (!tenant.isActive) {
      throw new Error('Tenant account is inactive');
    }

    // Gerar novos tokens
    const newPayload: TokenPayload = {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      roleId: user.roleId || undefined,
    };

    const accessToken = TokenService.generateAccessToken(newPayload);
    const newRefreshToken = TokenService.generateRefreshToken(newPayload);

    setTenantId(tenant.id);

    return {
      user,
      tenant,
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async changePassword(
    userId: string,
    tenantId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const passwordValid = await PasswordService.verify(currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Current password is incorrect');
    }

    const passwordValidation = PasswordService.validateStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    const newPasswordHash = await PasswordService.hash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Criar log de mudança de senha
    await prisma.loginAuditLog.create({
      data: {
        userId,
        tenantId,
        email: user.email,
        action: 'password_change',
        success: true,
      },
    });
  }
}
