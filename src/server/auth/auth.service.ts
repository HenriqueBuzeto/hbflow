import { prisma } from '../db/prisma';
import { PasswordService } from './password.service';
import { TokenService, TokenPayload } from './token.service';
import { SessionService } from './session.service';
import { setTenantId } from '../db/tenant-context';
import { RBACBootstrapService } from './rbac-bootstrap.service';
import { DepartmentBootstrapService } from '../services/department-bootstrap.service';

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
  password?: string | null;
  isTrial?: boolean | null;
  planSlug?: string | null;
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
      user = await prisma.user.findFirst({
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
    const existingUser = await prisma.user.findFirst({
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

    // Bootstrap default departments (Vendas and Atendimento)
    await DepartmentBootstrapService.bootstrapDefaultDepartments(tenant.id);

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

    // Validar cupom se fornecido (pesquisa apenas no banco de dados)
    let isCoupon100 = false;
    let couponToApply: any = null;
    if (couponCode) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      
      const dbCoupon = await prisma.coupon.findFirst({
        where: {
          code: cleanCoupon,
          isActive: true,
          deletedAt: null,
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } }
          ]
        }
      });

      if (!dbCoupon) {
        throw new Error('Cupom inválido ou expirado');
      }

      couponToApply = dbCoupon;
      if ((dbCoupon.type === 'percentage' && dbCoupon.value === 100.0) || dbCoupon.type === 'free_access') {
        isCoupon100 = true;
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
    const existingEmailUser = await prisma.user.findFirst({
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

    // 6. Generate Login Email: first + last (for commercial) or first + second (for trial)
    const normalizedName = userName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    const nameParts = normalizedName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'user';
    
    let baseLoginEmail = '';
    if (data.isTrial) {
      // Free trial: first name and second name
      const secondName = nameParts.length > 1 ? nameParts[1] : '';
      baseLoginEmail = secondName ? `${firstName}${secondName}` : firstName;
    } else {
      // Commercial: first name and last name
      const lastSurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      baseLoginEmail = lastSurname ? `${firstName}${lastSurname}` : firstName;
    }
    
    baseLoginEmail = baseLoginEmail.replace(/[^a-z0-9]/g, '');
    let loginEmail = `${baseLoginEmail}@hbflow.com`;

    // Ensure user email is unique
    const existingUser = await prisma.user.findFirst({ where: { email: loginEmail } });
    if (existingUser) {
      let suffix = 1;
      while (true) {
        const candidate = `${baseLoginEmail}${suffix}@hbflow.com`;
        const check = await prisma.user.findFirst({ where: { email: candidate } });
        if (!check) {
          loginEmail = candidate;
          break;
        }
        suffix++;
      }
    }

    // 7. Generate or use provided password
    let rawPassword = '';
    if (data.password) {
      rawPassword = data.password;
    } else {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      rawPassword = `${day}${month}hbflow`;
    }
    const passwordHash = await PasswordService.hash(rawPassword);

    // 8. Create database records in a transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Resolve selected plan slug
      const selectedPlanSlug = data.planSlug || 'starter';
      let chosenPlan = await tx.plan.findUnique({
        where: { slug: selectedPlanSlug }
      });
      if (!chosenPlan) {
        chosenPlan = await tx.plan.create({
          data: {
            name: selectedPlanSlug === 'pro' ? 'Plano Pro' : 'Plano Starter',
            slug: selectedPlanSlug,
            priceCents: selectedPlanSlug === 'pro' ? 19990 : 9990,
            billingCycle: 'monthly',
            isActive: true
          }
        });
      }

      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug: tenantSlug,
          plan: selectedPlanSlug,
          status: isCoupon100 ? 'active' : (data.isTrial ? 'trial' : 'active'),
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
      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: chosenPlan.id,
          status: isCoupon100 ? 'active' : (data.isTrial ? 'trialing' : 'active'),
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndsAt,
          trialEndsAt: isCoupon100 ? null : (data.isTrial ? trialEndsAt : null),
        }
      });

      // Apply coupon details in database
      let discountCents = 0;
      if (couponToApply) {
        // Increment redemption count
        await tx.coupon.update({
          where: { id: couponToApply.id },
          data: { redeemedCount: { increment: 1 } }
        });

        // Create TenantDiscount
        await tx.tenantDiscount.create({
          data: {
            tenantId: tenant.id,
            couponId: couponToApply.id,
            type: couponToApply.type,
            value: couponToApply.value,
            reason: `Cupom ${couponToApply.code} aplicado no cadastro`,
            isActive: true
          }
        });

        // Calculate discount cents
        if (couponToApply.type === 'percentage') {
          discountCents = Math.round(chosenPlan.priceCents * (couponToApply.value / 100));
        } else if (couponToApply.type === 'fixed_amount') {
          discountCents = Math.round(couponToApply.value * 100);
        } else if (couponToApply.type === 'free_access') {
          discountCents = chosenPlan.priceCents;
        }
        discountCents = Math.min(chosenPlan.priceCents, discountCents);

        // Create CouponRedemption
        await tx.couponRedemption.create({
          data: {
            tenantId: tenant.id,
            couponId: couponToApply.id,
            discountCents
          }
        });
      }

      // Create Invoice
      const totalCents = Math.max(0, chosenPlan.priceCents - discountCents);
      const invoice = await tx.invoice.create({
        data: {
          tenantId: tenant.id,
          subscriptionId: subscription.id,
          invoiceNumber: `INV-${Date.now()}`,
          status: totalCents === 0 ? 'paid' : 'open',
          subtotalCents: chosenPlan.priceCents,
          discountCents,
          totalCents,
          dueDate: new Date(),
          paidAt: totalCents === 0 ? new Date() : null,
          billingPeriodStart: new Date(),
          billingPeriodEnd: trialEndsAt,
          metadataJson: couponToApply ? JSON.stringify({
            couponCode: couponToApply.code,
            discountPercentage: couponToApply.type === 'percentage' ? couponToApply.value : null
          }) : '{}'
        }
      });

      if (totalCents === 0) {
        // Create Payment record for 100% discount
        await tx.payment.create({
          data: {
            tenantId: tenant.id,
            invoiceId: invoice.id,
            provider: 'internal',
            method: 'coupon',
            status: 'paid',
            amountCents: 0,
            paidAt: new Date()
          }
        });
      }

      // Generate 3 future invoices ahead
      for (let i = 1; i <= 3; i++) {
        const periodStart = new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000);
        const periodEnd = new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000);
        const futureDueDate = new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000);

        let futureDiscountCents = 0;
        if (couponToApply) {
          const isPermanent = couponToApply.duration === 'forever';
          const isMultiMonth = couponToApply.duration === 'months' && couponToApply.durationMonths && i < couponToApply.durationMonths;
          
          if (isPermanent || isMultiMonth) {
            futureDiscountCents = discountCents; // aplica o mesmo desconto calculado para a primeira fatura
          }
        }

        const futureTotalCents = Math.max(0, chosenPlan.priceCents - futureDiscountCents);
        const futureInvoiceStatus = futureTotalCents === 0 ? 'paid' : 'open';

        const futInv = await tx.invoice.create({
          data: {
            tenantId: tenant.id,
            subscriptionId: subscription.id,
            invoiceNumber: `INV-${Date.now()}-${i}`,
            status: futureInvoiceStatus,
            subtotalCents: chosenPlan.priceCents,
            discountCents: futureDiscountCents,
            totalCents: futureTotalCents,
            dueDate: futureDueDate,
            paidAt: futureTotalCents === 0 ? new Date() : null,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            metadataJson: couponToApply && futureDiscountCents > 0 ? JSON.stringify({
              couponCode: couponToApply.code,
              discountPercentage: couponToApply.type === 'percentage' ? couponToApply.value : null
            }) : '{}'
          }
        });

        if (futureTotalCents === 0) {
          // Cria o registro de pagamento (isento/cupom)
          await tx.payment.create({
            data: {
              tenantId: tenant.id,
              invoiceId: futInv.id,
              provider: 'internal',
              method: 'coupon',
              status: 'paid',
              amountCents: 0,
              paidAt: new Date()
            }
          });
        }
      }

      return { tenant, user, loginEmail, rawPassword, adminRoleId: adminRole.id, trialEndsAt, totalCents };
    });

    // Run bootstrap RBAC outside Prisma transaction but using the same connection context
    await RBACBootstrapService.bootstrapTenantRBAC(transactionResult.tenant.id, transactionResult.adminRoleId);
    
    // Bootstrap default departments for the tenant
    await DepartmentBootstrapService.bootstrapDefaultDepartments(transactionResult.tenant.id);
    
    return {
      tenantId: transactionResult.tenant.id,
      userId: transactionResult.user.id,
      companyName: transactionResult.tenant.name,
      userName: transactionResult.user.name,
      loginEmail: transactionResult.loginEmail,
      password: transactionResult.rawPassword,
      trialEndsAt: transactionResult.trialEndsAt,
      totalAmountCents: transactionResult.totalCents
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

  static async switchTenant(email: string, targetTenantId: string): Promise<AuthResult> {
    const user = await prisma.user.findFirst({
      where: {
        email,
        tenantId: targetTenantId,
        isActive: true,
      },
      include: {
        tenant: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error('Você não tem acesso a esta empresa.');
    }

    if (!user.tenant.isActive) {
      throw new Error('Esta empresa está inativa.');
    }

    const payload: TokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roleId: user.roleId || undefined,
    };

    const accessToken = TokenService.generateAccessToken(payload);
    const refreshToken = TokenService.generateRefreshToken(payload);

    return {
      user,
      tenant: user.tenant,
      accessToken,
      refreshToken,
    };
  }

  static async linkNewTenant(
    email: string,
    name: string,
    slug: string,
    document?: string,
    tenantEmail?: string,
    phone?: string
  ): Promise<any> {
    const existingUser = await prisma.user.findFirst({
      where: { email },
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

    if (!existingUser) {
      throw new Error('Usuário de origem não encontrado.');
    }

    const parentPlan = existingUser.tenant.plan || 'starter';

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new Error('Já existe uma empresa com esse slug/subdomínio.');
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        plan: parentPlan,
        status: 'active',
        isActive: true,
        document: document || null,
        email: tenantEmail || null,
        phone: phone || null,
      },
    });

    // Herdar assinatura do tenant pai para evitar bloqueio de cobrança
    const parentSubscription = existingUser.tenant.subscriptions[0];
    if (parentSubscription) {
      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: parentSubscription.planId,
          status: parentSubscription.status,
          currentPeriodStart: parentSubscription.currentPeriodStart,
          currentPeriodEnd: parentSubscription.currentPeriodEnd,
          trialEndsAt: parentSubscription.trialEndsAt,
        }
      });
    } else {
      // Se não houver assinatura no pai, buscar plano padrão por slug
      const planDb = await prisma.plan.findFirst({
        where: { slug: parentPlan }
      });
      if (planDb) {
        await prisma.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: planDb.id,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          }
        });
      }
    }

    const adminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Admin',
        description: 'Administrador com acesso total',
      },
    });

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: existingUser.name,
        email: existingUser.email,
        passwordHash: existingUser.passwordHash,
        roleId: adminRole.id,
        isActive: true,
      },
    });

    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
      },
    });

    await prisma.tenantAICost.create({
      data: {
        tenantId: tenant.id,
        monthlyLimit: 100.0,
        monthlySpent: 0.0,
      },
    });

    await RBACBootstrapService.bootstrapTenantRBAC(tenant.id, adminRole.id);
    await DepartmentBootstrapService.bootstrapDefaultDepartments(tenant.id);

    return { tenant, user };
  }
}
