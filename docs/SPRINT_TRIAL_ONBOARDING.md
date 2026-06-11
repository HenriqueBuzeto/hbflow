# Sprint Trial & Onboarding System - HBFlow

**Date:** June 9, 2026  
**Sprint Lead:** Cascade AI  
**Classification:** Business Critical  
**Prerequisite:** Production Validation Complete  
**Objective:** Implement 3-day trial system with multi-step registration, automatic tenant/user creation, email automation, trial expiration, and renewal flow

---

## Executive Summary

This sprint implements a complete 3-day trial system that enables HBFlow to acquire customers through self-service registration. The system includes multi-step registration, automatic tenant/user provisioning, email automation, trial expiration enforcement, and conversion to paid subscriptions. This is classified as "Business Critical" as it directly impacts revenue and business readiness.

---

## Success Criteria

1. **Trial Registration Flow** - Multi-step registration (basic info, document, address)
2. **Automatic Provisioning** - Auto-create tenant, user, trial, permissions, feature flags
3. **Email Automation** - Welcome email with login credentials and trial expiration
4. **Trial Expiration** - Automatic blocking after 3 days with renewal prompt
5. **Trial Management** - Admin interface for trial extension and conversion
6. **Business Readiness** - Business Readiness Score increases from 84 to 90+

---

## Phase 1: Database Schema

### New Models

#### TrialRegistration
```prisma
model TrialRegistration {
  id              String   @id @default(uuid())
  tenantId        String?
  selectedPlan    TenantPlan
  fullName        String
  email           String
  phone           String
  documentType    DocumentType
  document        String
  companyName     String?
  tradeName       String?
  businessSegment String?
  attendantsCount Int?
  monthlyMessages Int?
  zipCode         String?
  street          String?
  number          String?
  complement      String?
  district        String?
  city            String?
  state           String?
  status          TrialRegistrationStatus @default(pending)
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime @default(now())
  approvedAt      DateTime?
  rejectedAt      DateTime?

  @@index([email])
  @@index([document])
  @@index([tenantId])
}
```

#### New Enums
```prisma
enum TrialRegistrationStatus {
  pending
  approved
  rejected
  converted
  expired
}

enum DocumentType {
  cpf
  cnpj
}

enum TenantStatus {
  trial
  active
  trial_expired
  suspended
  cancelled
}

enum TenantPlan {
  starter
  pro
  enterprise
}
```

### Tenant Model Updates
```prisma
model Tenant {
  // ... existing fields
  
  document        String?
  email           String?
  phone           String?
  status          TenantStatus
  plan            TenantPlan
  trialStartedAt  DateTime?
  trialEndsAt     DateTime?
  trialExpiredAt  DateTime?
  subscriptionStartedAt DateTime?
  subscriptionEndsAt    DateTime?
  
  // New fields for trial tracking
  trialExpiringSoonEmailSentAt DateTime?
  trialExpiredEmailSentAt DateTime?
}
```

---

## Phase 2: API Routes

### Public Routes

#### POST /api/public/trial/register
**Purpose:** Complete trial registration with multi-step data

**Request Body:**
```typescript
{
  step: 1 | 2 | 3,
  plan: 'starter' | 'pro' | 'enterprise',
  // Step 1
  fullName: string,
  email: string,
  phone: string,
  password: string,
  confirmPassword: string,
  // Step 2
  documentType: 'cpf' | 'cnpj',
  document: string,
  companyName?: string,
  tradeName?: string,
  businessSegment?: string,
  attendantsCount?: number,
  monthlyMessages?: number,
  // Step 3
  zipCode?: string,
  street?: string,
  number?: string,
  complement?: string,
  district?: string,
  city?: string,
  state?: string,
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    tenantId: string,
    userId: string,
    plan: string,
    trialEndsAt: string,
    loginUrl: string
  }
}
```

**Logic:**
1. Validate with Zod schemas
2. Check email uniqueness (no existing trial)
3. Check document uniqueness (no existing trial)
4. Create Tenant with trial status
5. Create User with owner/admin role
6. Create TrialRegistration record
7. Create initial roles and permissions
8. Activate feature flags per plan
9. Create default data (departments, pipeline, tags, quick replies)
10. Send welcome email
11. Return success with login URL

#### GET /api/public/trial/check-document
**Purpose:** Check if document already used for trial

**Query:** `document=string`

**Response:**
```typescript
{
  available: boolean,
  message?: string
}
```

#### GET /api/public/trial/check-email
**Purpose:** Check if email already used for trial

**Query:** `email=string`

**Response:**
```typescript
{
  available: boolean,
  message?: string
}
```

### Protected Routes

#### POST /api/trial/expire-check
**Purpose:** Check if trial is expired (called on login)

**Response:**
```typescript
{
  expired: boolean,
  trialEndsAt: string,
  plan: string,
  renewalUrl: string
}
```

#### POST /api/admin/trials/:id/extend
**Purpose:** Admin extends trial manually

**Request Body:**
```typescript
{
  days: number,
  reason: string
}
```

#### POST /api/admin/trials/:id/convert
**Purpose:** Admin converts trial to active customer

**Request Body:**
```typescript
{
  plan: 'starter' | 'pro' | 'enterprise',
  subscriptionEndsAt: string
}
```

---

## Phase 3: Zod Validation Schemas

**File:** `src/server/validators/trial.schema.ts`

```typescript
import { z } from 'zod';

export const trialStepOneSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().regex(/^\(\d{2}\)\s\d{5}-\d{4}$/, 'Telefone inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

export const trialStepTwoSchema = z.object({
  documentType: z.enum(['cpf', 'cnpj']),
  document: z.string().min(11, 'Documento inválido'),
  companyName: z.string().optional(),
  tradeName: z.string().optional(),
  businessSegment: z.string().min(2, 'Segmento obrigatório'),
  attendantsCount: z.number().min(1).optional(),
  monthlyMessages: z.number().min(1).optional(),
}).refine((data) => {
  if (data.documentType === 'cnpj' && !data.companyName) {
    return false;
  }
  return true;
}, {
  message: 'Nome da empresa obrigatório para pessoa jurídica',
  path: ['companyName'],
});

export const trialStepThreeSchema = z.object({
  zipCode: z.string().min(8, 'CEP inválido'),
  street: z.string().min(3, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  district: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'Estado inválido'),
});

export const trialRegistrationSchema = z.object({
  plan: z.enum(['starter', 'pro', 'enterprise']),
  stepOne: trialStepOneSchema,
  stepTwo: trialStepTwoSchema,
  stepThree: trialStepThreeSchema,
});

export const cpfValidator = (cpf: string) => {
  // CPF validation logic
  return true; // placeholder
};

export const cnpjValidator = (cnpj: string) => {
  // CNPJ validation logic
  return true; // placeholder
};
```

---

## Phase 4: Email Automation

**File:** `src/server/email/email.service.ts`

```typescript
interface EmailConfig {
  provider: 'resend' | 'smtp' | 'mock';
  apiKey?: string;
  from: string;
  appUrl: string;
}

export class EmailService {
  private static config: EmailConfig = {
    provider: process.env.EMAIL_PROVIDER as 'resend' | 'smtp' | 'mock' || 'mock',
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'HBFlow <noreply@hbflow.com>',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };

  static async sendTrialWelcome(data: {
    to: string;
    name: string;
    plan: string;
    trialEndsAt: Date;
    loginUrl: string;
  }) {
    const subject = 'Seu teste grátis do HBFlow foi ativado';
    const body = `
      Olá, ${data.name}.

      Seu teste grátis do HBFlow foi ativado com sucesso.

      Plano escolhido: ${data.plan}
      E-mail de acesso: ${data.to}
      Senha: a senha que você criou no cadastro
      Validade do teste: até ${new Date(data.trialEndsAt).toLocaleDateString('pt-BR')}

      Acesse o sistema:
      ${data.loginUrl}

      Após o período de teste, será necessário contratar um plano para continuar utilizando o HBFlow.
    `;

    return await this.send({
      to: data.to,
      subject,
      body,
    });
  }

  static async sendTrialExpiringSoon(data: {
    to: string;
    name: string;
    trialEndsAt: Date;
    renewalUrl: string;
  }) {
    const subject = 'Seu teste grátis do HBFlow termina amanhã';
    const body = `
      Olá, ${data.name}.

      Seu teste grátis termina em ${new Date(data.trialEndsAt).toLocaleDateString('pt-BR')}.

      Para continuar usando o HBFlow sem interrupção, escolha um plano:
      ${data.renewalUrl}
    `;

    return await this.send({
      to: data.to,
      subject,
      body,
    });
  }

  static async sendTrialExpired(data: {
    to: string;
    name: string;
    renewalUrl: string;
  }) {
    const subject = 'Seu teste grátis do HBFlow terminou';
    const body = `
      Olá, ${data.name}.

      Seu teste grátis terminou.

      Para continuar usando o HBFlow, escolha um plano:
      ${data.renewalUrl}
    `;

    return await this.send({
      to: data.to,
      subject,
      body,
    });
  }

  private static async send({ to, subject, body }: { to: string; subject: string; body: string }) {
    if (this.config.provider === 'mock') {
      console.log('[MOCK EMAIL]', { to, subject, body });
      return { success: true };
    }

    if (this.config.provider === 'resend') {
      // Resend implementation
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.from,
          to,
          subject,
          html: body.replace(/\n/g, '<br>'),
        }),
      });

      return response.json();
    }

    if (this.config.provider === 'smtp') {
      // SMTP implementation
      // Use nodemailer or similar
      return { success: true };
    }
  }
}
```

**Environment Variables:**
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM="HBFlow <noreply@hbflow.com>"
NEXT_PUBLIC_APP_URL=
```

---

## Phase 5: Subscription Middleware

**File:** `src/server/middleware/subscription.middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getTenantId } from '@/server/db/tenant-context';

export async function requireActiveTenant(request: Request) {
  const tenantId = getTenantId();
  
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant context required' },
      { status: 401 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    );
  }

  const now = new Date();
  
  // Active tenant
  if (tenant.status === 'active') {
    return null; // Allow access
  }

  // Trial tenant
  if (tenant.status === 'trial') {
    if (tenant.trialEndsAt && tenant.trialEndsAt > now) {
      return null; // Allow access
    }
    
    // Trial expired
    if (tenant.trialEndsAt && tenant.trialEndsAt <= now) {
      // Update to expired
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'trial_expired',
          trialExpiredAt: now,
        },
      });
      
      return NextResponse.json(
        { 
          error: 'TRIAL_EXPIRED',
          message: 'Seu teste grátis terminou',
          renewalUrl: '/renovar',
        },
        { status: 403 }
      );
    }
  }

  // Expired, suspended, or cancelled
  if (['trial_expired', 'suspended', 'cancelled'].includes(tenant.status)) {
    return NextResponse.json(
      { 
        error: 'SUBSCRIPTION_INACTIVE',
        message: 'Sua assinatura está inativa',
        renewalUrl: '/renovar',
      },
      { status: 403 }
    );
  }

  return null; // Allow access
}

// Helper to check if request can access renewal page
export function canAccessRenewalPage(pathname: string): boolean {
  const allowedPaths = ['/login', '/renovar', '/api/billing', '/api/auth/logout', '/api/auth/me'];
  return allowedPaths.some(path => pathname.startsWith(path));
}
```

---

## Phase 6: Trial Expiration Job

**File:** `src/server/jobs/trial-expiration.job.ts`

```typescript
import { prisma } from '@/server/db';
import { EmailService } from '@/server/email/email.service';

export async function expireTrials() {
  const now = new Date();
  
  // Find trials that should be expired
  const expiringTrials = await prisma.tenant.findMany({
    where: {
      status: 'trial',
      trialEndsAt: { lte: now },
    },
  });

  for (const tenant of expiringTrials) {
    // Update status
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'trial_expired',
        trialExpiredAt: now,
      },
    });

    // Send expiration email
    if (tenant.email) {
      await EmailService.sendTrialExpired({
        to: tenant.email,
        name: tenant.name,
        renewalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/renovar`,
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'trial_expired',
        entityType: 'Tenant',
        entityId: tenant.id,
        changes: JSON.stringify({ status: 'trial', newStatus: 'trial_expired' }),
      },
    });
  }

  return { processed: expiringTrials.length };
}

// Vercel Cron endpoint
export async function POST(request: Request) {
  const cronSecret = request.headers.get('x-cron-secret');
  
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await expireTrials();
    return NextResponse.json({ success: true, processed: result.processed });
  } catch (error) {
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}
```

**Environment Variable:**
```env
CRON_SECRET=
```

**Vercel Cron Configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/trials/expire",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## Phase 7: Trial Expiring Soon Job

**File:** `src/server/jobs/trial-expiring-soon.job.ts`

```typescript
import { prisma } from '@/server/db';
import { EmailService } from '@/server/email/email.service';

export async function sendExpiringSoonEmails() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  // Find trials expiring in 24 hours
  const expiringSoonTrials = await prisma.tenant.findMany({
    where: {
      status: 'trial',
      trialEndsAt: {
        lte: tomorrow,
        gt: now,
      },
      trialExpiringSoonEmailSentAt: null,
    },
  });

  for (const tenant of expiringSoonTrials) {
    // Send expiring soon email
    if (tenant.email) {
      await EmailService.sendTrialExpiringSoon({
        to: tenant.email,
        name: tenant.name,
        trialEndsAt: tenant.trialEndsAt!,
        renewalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/renovar`,
      });

      // Mark as sent
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          trialExpiringSoonEmailSentAt: now,
        },
      });
    }
  }

  return { processed: expiringSoonTrials.length };
}
```

---

## Phase 8: Feature Flags by Plan

**File:** `src/server/services/feature-flag.service.ts`

```typescript
export async function enablePlanFeatureFlags(tenantId: string, plan: TenantPlan) {
  const flagsByPlan = {
    starter: [
      'ai_enabled',
      'whatsapp_enabled',
    ],
    pro: [
      'ai_enabled',
      'campaigns_enabled',
      'workflow_enabled',
      'api_access_enabled',
      'whatsapp_enabled',
    ],
    enterprise: [
      'ai_enabled',
      'campaigns_enabled',
      'workflow_enabled',
      'copilot_enabled',
      'forecast_enabled',
      'api_access_enabled',
      'whatsapp_enabled',
    ],
  };

  const flags = flagsByPlan[plan];

  for (const flagKey of flags) {
    await prisma.tenantFeatureFlag.upsert({
      where: {
        tenantId_featureFlagId: {
          tenantId,
          featureFlagId: flagKey,
        },
      },
      create: {
        tenantId,
        featureFlagId: flagKey,
        isEnabled: true,
      },
      update: {
        isEnabled: true,
      },
    });
  }
}
```

---

## Phase 9: Initial Permissions

**File:** `src/server/services/permission.service.ts`

```typescript
const TRIAL_PERMISSIONS = [
  'dashboard.view',
  'inbox.view',
  'inbox.claim',
  'inbox.reply',
  'inbox.resolve',
  'contacts.view',
  'contacts.create',
  'contacts.update',
  'pipeline.view',
  'deals.view',
  'deals.create',
  'deals.update',
  'agents.view',
  'settings.view',
  'users.view',
];

export async function grantTrialPermissions(userId: string, tenantId: string) {
  for (const permissionName of TRIAL_PERMISSIONS) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionName_tenantId: {
          userId,
          permissionName,
          tenantId,
        },
      },
      create: {
        userId,
        permissionName,
        tenantId,
      },
      update: {},
    });
  }
}
```

---

## Phase 10: Renewal/Conversion Page

**File:** `src/app/renovar/page.tsx`

```typescript
export default function RenewalPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Seu teste grátis terminou
          </h1>
          <p className="text-gray-600">
            Você aproveitou os 3 dias de teste do HBFlow.
            Para continuar usando sua central de atendimento, CRM e agentes de IA, escolha um plano.
          </p>
        </div>

        <div className="space-y-4">
          <button className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition">
            Renovar plano
          </button>
          <button className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
            Falar com consultor
          </button>
          <button className="w-full text-gray-600 py-3 rounded-lg font-medium hover:text-gray-800 transition">
            Voltar para landing
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 11: Admin Trial Management

**File:** `src/app/admin/trials/page.tsx`

```typescript
export default function AdminTrialsPage() {
  // TODO: Fetch trials from API
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestão de Trials</h1>
      
      {/* Table showing:
          - Nome da empresa
          - E-mail
          - Plano
          - Status
          - Data de início
          - Data de expiração
          - Dias restantes
          - Botão estender trial
          - Botão converter para ativo
          - Botão suspender
      */}
    </div>
  );
}
```

**Required Permission:** `billing.trials.manage`

---

## Phase 12: Security Rules

**Mandatory:**
- Never save password in plain text
- Never send password hash via email
- Never log password
- Validate CPF/CNPJ format
- Validate trial uniqueness (email, document, phone)
- Rate limit on public registration endpoint
- Capture IP and userAgent
- Register audit log for all trial operations
- Protect cron endpoints with CRON_SECRET
- Sanitize all inputs
- Never allow multiple trials per CNPJ/email
- Expired tenant cannot access internal data

---

## Phase 13: Required Tests

1. Create trial with Starter plan
2. Create tenant automatically
3. Create user admin automatically
4. Login works with created credentials
5. TrialEndsAt = now + 3 days
6. Welcome email sent
7. CNPJ duplicate blocked
8. Email duplicate blocked
9. Access allowed before expiration
10. Access blocked after expiration
11. Redirect to /renovar when expired
12. Admin can extend trial
13. Admin can convert to active
14. Feature flags correct per plan
15. Build passes without error
16. Prisma validate passes
17. TypeScript passes without error

---

## Phase 14: Documentation

**File:** `docs/TRIAL_SYSTEM_IMPLEMENTATION_REPORT.md`

Include:
- What was implemented
- Routes created
- Tables altered
- Registration flow
- Expiration rules
- Emails created
- How to configure Resend/SMTP
- How to test
- Future pending items
- Next steps

---

## Success Metrics

### Quantitative
- [ ] TrialRegistration model created
- [ ] TenantStatus enum added
- [ ] TenantPlan enum added
- [ ] DocumentType enum added
- [ ] POST /api/public/trial/register
- [ ] GET /api/public/trial/check-document
- [ ] GET /api/public/trial/check-email
- [ ] POST /api/trial/expire-check
- [ ] POST /api/admin/trials/:id/extend
- [ ] POST /api/admin/trials/:id/convert
- [ ] Zod validation schemas (4 schemas)
- [ ] Email service with 3 templates
- [ ] Subscription middleware
- [ ] Trial expiration job
- [ ] Trial expiring soon job
- [ ] Feature flags per plan
- [ ] Initial trial permissions
- [ ] Renewal page /renovar
- [ ] Admin trial management page

### Qualitative
- [ ] Trial registration flow works end-to-end
- [ ] Automatic tenant/user provisioning works
- [ ] Welcome email sent with correct data
- [ ] Trial expiration blocks access correctly
- [ ] Renewal page displays when expired
- [ ] Admin can extend and convert trials
- [ ] Feature flags activate per plan
- [ ] Audit logs capture all trial operations
- [ ] Business Readiness Score increases to 90+

---

## Timeline Estimate

- **Phase 1 (Database Schema):** 1 day
- **Phase 2 (API Routes):** 2 days
- **Phase 3 (Zod Validation):** 1 day
- **Phase 4 (Email Automation):** 1 day
- **Phase 5 (Subscription Middleware):** 1 day
- **Phase 6 (Expiration Job):** 0.5 day
- **Phase 7 (Expiring Soon Job):** 0.5 day
- **Phase 8 (Feature Flags):** 0.5 day
- **Phase 9 (Initial Permissions):** 0.5 day
- **Phase 10 (Renewal Page):** 1 day
- **Phase 11 (Admin Management):** 1 day
- **Phase 12 (Security):** 0.5 day
- **Phase 13 (Testing):** 1 day
- **Phase 14 (Documentation):** 0.5 day

**Total Estimated:** 11 - 13 days

---

## Completion Criteria

Implementation is complete only if:

```bash
npx prisma validate
npx prisma migrate dev
npx prisma db seed
npx tsc --noEmit
npm run build
```

pass without error.

---

## Expected Outcome

HBFlow will have a complete 3-day trial system with multi-step registration, automatic tenant/user creation, email automation, trial expiration enforcement, and renewal flow. Business Readiness Score will increase from 84 to 90+, positioning the platform for pilot customer acquisition.

---

**Sprint Created:** June 9, 2026  
**Classification:** Business Critical  
**Prerequisite:** Production Validation Complete  
**Estimated Duration:** 11 - 13 days  
**Success Metric:** Business Readiness Score increases from 84 to 90+  
**Governance:** Approved as Business Critical Exception per PRODUCT_GOVERNANCE.md
