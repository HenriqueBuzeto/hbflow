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

export interface RegisterTrialData {
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  userName: string;
  couponCode?: string | null;
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

  static async registerTrial(data: RegisterTrialData): Promise<any> {
    const { companyName, cnpj, email, phone, userName, couponCode } = data;

    // 1. Normalize fields for comparison and uniqueness checking
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanPhone || !cleanCnpj || !cleanEmail || !companyName || !userName) {
      throw new Error('Todos os campos obrigatórios devem ser preenchidos');
    }

    // Validar cupom se fornecido
    let isCoupon100 = false;
    if (couponCode) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      if (cleanCoupon === 'CUPOM100') {
        isCoupon100 = true;
      } else if (cleanCoupon !== 'HB20' && cleanCoupon !== 'HBFLOW20' && cleanCoupon !== 'START50') {
        throw new Error('Cupom inválido ou expirado');
      }
    }

    // 2. Validate uniqueness of phone
    const existingPhone = await prisma.tenant.findFirst({
      where: { phone: cleanPhone }
    });
    if (existingPhone) {
      throw new Error('telefone já foi utilizado');
    }

    // 3. Validate uniqueness of CNPJ
    const existingCnpj = await prisma.tenant.findFirst({
      where: { document: cleanCnpj }
    });
    if (existingCnpj) {
      throw new Error('cnpj já foi utilizado');
    }

    // 4. Validate uniqueness of Email
    const existingEmailTenant = await prisma.tenant.findFirst({
      where: { email: cleanEmail }
    });
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });
    if (existingEmailTenant || existingEmailUser) {
      throw new Error('email principal já foi utilizado');
    }

    // 5. Generate unique tenant slug
    const normalizedCompany = companyName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const tenantSlug = `${normalizedCompany || 'trial'}-${Date.now()}`;

    // 6. Generate Login Email: firstlast@hbflow.com
    const normalizedName = userName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    const nameParts = normalizedName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'user';
    const lastSurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    
    let baseLoginEmail = lastSurname ? `${firstName}${lastSurname}` : firstName;
    baseLoginEmail = baseLoginEmail.replace(/[^a-z0-9]/g, '');
    let loginEmail = `${baseLoginEmail}@hbflow.com`;

    // Ensure user email is unique
    const existingUser = await prisma.user.findUnique({ where: { email: loginEmail } });
    if (existingUser) {
      let suffix = 1;
      while (true) {
        const candidate = `${baseLoginEmail}${suffix}@hbflow.com`;
        const check = await prisma.user.findUnique({ where: { email: candidate } });
        if (!check) {
          loginEmail = candidate;
          break;
        }
        suffix++;
      }
    }

    // 7. Generate password: DDMMhbflow
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const rawPassword = `${day}${month}hbflow`;
    const passwordHash = await PasswordService.hash(rawPassword);

    // 8. Create database records in a transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug: tenantSlug,
          plan: 'starter',
          status: 'trial',
          email: cleanEmail,
          phone: cleanPhone,
          document: cleanCnpj,
          isActive: true,
        },
      });

      // Create Admin Role
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Admin',
          description: 'Administrador com acesso total',
        },
      });

      // Create User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: userName,
          email: loginEmail,
          passwordHash,
          phone: cleanPhone,
          roleId: adminRole.id,
          isActive: true,
        },
      });

      // Create Settings
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
        },
      });

      // Create Cost governance
      await tx.tenantAICost.create({
        data: {
          tenantId: tenant.id,
          monthlyLimit: 100.0,
          monthlySpent: 0.0,
        },
      });

      // Ensure the 'starter' Plan exists
      let planStarter = await tx.plan.findUnique({
        where: { slug: 'starter' }
      });
      if (!planStarter) {
        planStarter = await tx.plan.create({
          data: {
            name: 'Starter Plan',
            slug: 'starter',
            priceCents: 14900, // R$ 149.00
            billingCycle: 'monthly',
            isActive: true
          }
        });
      }

      const trialDays = isCoupon100 ? 30 : 3;
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

      // Create Billing trial entry
      await tx.tenantBilling.create({
        data: {
          tenantId: tenant.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt,
        },
      });

      // Create Subscription entry
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: planStarter.id,
          status: isCoupon100 ? 'active' : 'trialing',
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt,
          trialEndsAt: isCoupon100 ? null : trialEndsAt,
        }
      });


      return { tenant, user, loginEmail, rawPassword, adminRoleId: adminRole.id, trialEndsAt };
    });

    // Run bootstrap RBAC outside Prisma transaction but using the same connection context
    await RBACBootstrapService.bootstrapTenantRBAC(transactionResult.tenant.id, transactionResult.adminRoleId);
    
    return {
      tenantId: transactionResult.tenant.id,
      userId: transactionResult.user.id,
      companyName: transactionResult.tenant.name,
      userName: transactionResult.user.name,
      loginEmail: transactionResult.loginEmail,
      password: transactionResult.rawPassword,
      trialEndsAt: transactionResult.trialEndsAt,
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
