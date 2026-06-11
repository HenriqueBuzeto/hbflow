# Sprint Production Readiness - HBFlow

**Date:** June 9, 2026  
**Sprint Lead:** Cascade AI  
**Objective:** Transform "Functional Backend" into "Operational Backend"

**Architecture Freeze:** See `docs/PRODUCT_GOVERNANCE.md` for HBFlow v1 Architecture Freeze declaration.

---

## Executive Summary

This sprint focuses exclusively on production readiness - no new features, no new agents, no new screens. The goal is to transform the HBFlow backend from a functional prototype into an operational production system ready for real customers.

---

## Success Criteria

1. **Complete CRUD** - All core entities have full GET, POST, PUT, PATCH, DELETE operations
2. **Mandatory Validation** - All routes enforce Zod validation
3. **Audit Layer** - Complete audit logging for all operations
4. **SQL Layer** - Critical business logic implemented as SQL functions/triggers
5. **Health Monitoring** - Comprehensive health check endpoints

---

## Phase 1: Complete CRUD

### Contacts
- [ ] `GET /api/contacts` - List contacts (already done)
- [ ] `POST /api/contacts` - Create contact
- [ ] `GET /api/contacts/[id]` - Get single contact
- [ ] `PUT /api/contacts/[id]` - Update contact (full)
- [ ] `PATCH /api/contacts/[id]` - Partial update contact
- [ ] `DELETE /api/contacts/[id]` - Soft delete contact

### Conversations
- [ ] `GET /api/conversations` - List conversations (already done)
- [ ] `POST /api/conversations` - Create conversation
- [ ] `GET /api/conversations/[id]` - Get single conversation
- [ ] `PUT /api/conversations/[id]` - Update conversation
- [ ] `PATCH /api/conversations/[id]` - Update conversation status
- [ ] `DELETE /api/conversations/[id]` - Close conversation

### Messages
- [ ] `GET /api/conversations/[id]/messages` - List messages (already done)
- [ ] `POST /api/conversations/[id]/messages` - Send message
- [ ] `GET /api/messages/[id]` - Get single message
- [ ] `PUT /api/messages/[id]` - Update message
- [ ] `DELETE /api/messages/[id]` - Delete message

### Deals
- [ ] `GET /api/deals` - List deals (already done)
- [ ] `POST /api/deals` - Create deal
- [ ] `GET /api/deals/[id]` - Get single deal
- [ ] `PUT /api/deals/[id]` - Update deal
- [ ] `PATCH /api/deals/[id]` - Move deal to stage
- [ ] `DELETE /api/deals/[id]` - Soft delete deal

### Tasks
- [ ] `GET /api/tasks` - List tasks
- [ ] `POST /api/tasks` - Create task
- [ ] `GET /api/tasks/[id]` - Get single task
- [ ] `PUT /api/tasks/[id]` - Update task
- [ ] `PATCH /api/tasks/[id]` - Mark as complete
- [ ] `DELETE /api/tasks/[id]` - Delete task

---

## Phase 2: Mandatory Zod Validation

### Validation Schemas Required

#### Contact Validation
```typescript
createContactSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(phoneRegex),
  email: z.string().email().optional(),
  type: z.enum(['lead', 'customer', 'prospect', 'supplier']),
  temperature: z.enum(['cold', 'warm', 'hot']).optional(),
})

updateContactSchema = createContactSchema.partial()
```

#### Conversation Validation
```typescript
createConversationSchema = z.object({
  contactId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  status: z.enum(['new', 'open', 'pending', 'waiting_customer', 'waiting_agent', 'resolved', 'closed']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
})

updateConversationSchema = createConversationSchema.partial()
```

#### Message Validation
```typescript
createMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(10000),
  type: z.enum(['text', 'image', 'audio', 'video', 'document', 'location', 'template']),
  senderType: z.enum(['contact', 'user', 'system', 'automation', 'agent']),
})
```

#### Deal Validation
```typescript
createDealSchema = z.object({
  contactId: z.string().uuid(),
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  title: z.string().min(2).max(200),
  value: z.number().min(0),
  expectedCloseDate: z.string().datetime().optional(),
})

updateDealSchema = createDealSchema.partial()
```

#### Task Validation
```typescript
createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(['call', 'proposal', 'follow_up', 'meeting', 'after_sales']),
  priority: z.enum(['low', 'medium', 'high']),
  dueAt: z.string().datetime(),
  assignedUserId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
})

updateTaskSchema = createTaskSchema.partial()
```

### Implementation Pattern
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createContactSchema.parse(body);
    
    const user = await requireAuth();
    await requireTenant();
    
    // ... business logic
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    // ... other error handling
  }
}
```

---

## Phase 3: Audit Layer

### Audit Log Model Enhancement
Ensure `AuditLog` model has:
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String?
  action      String   // create, read, update, delete, login, logout
  entityType  String   // Contact, Conversation, Deal, Task, etc.
  entityId    String?
  changes     String   @default("{}") // JSON with before/after
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  user        User?    @relation(fields: [userId], references: [id])

  @@index([tenantId, action])
  @@index([tenantId, entityType, entityId])
}
```

### Audit Middleware
```typescript
export async function auditLog(
  action: string,
  entityType: string,
  entityId?: string,
  changes?: Record<string, any>
) {
  const user = await getAuthUser();
  const tenantId = getTenantId();
  
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: user?.userId,
      action,
      entityType,
      entityId,
      changes: JSON.stringify(changes || {}),
    },
  });
}
```

### Global Audit Wrapper
```typescript
export function withAudit<T>(
  action: string,
  entityType: string,
  handler: (entityId: string) => Promise<T>
) {
  return async (entityId: string) => {
    const result = await handler(entityId);
    await auditLog(action, entityType, entityId);
    return result;
  };
}
```

---

## Phase 4: SQL Layer

### SQL Functions to Implement

#### 1. Phone Normalization
```sql
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### 2. SLA Due Calculation
```sql
CREATE OR REPLACE FUNCTION calculate_sla_due(
  conversation_id UUID,
  sla_minutes INT
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  created_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT c.createdAt INTO created_at
  FROM Conversation c
  WHERE c.id = conversation_id;
  
  RETURN created_at + (sla_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
```

#### 3. Lead Score Calculation
```sql
CREATE OR REPLACE FUNCTION calculate_lead_score(contact_id UUID)
RETURNS INT AS $$
DECLARE
  score INT := 0;
  interaction_count INT;
  deal_count INT;
BEGIN
  -- Count interactions
  SELECT COUNT(*) INTO interaction_count
  FROM Conversation c
  WHERE c.contactId = contact_id AND c.status = 'resolved';
  
  score := score + (interaction_count * 10);
  
  -- Count deals
  SELECT COUNT(*) INTO deal_count
  FROM Deal d
  WHERE d.contactId = contact_id AND d.status = 'won';
  
  score := score + (deal_count * 30);
  
  -- Temperature bonus
  score := score + CASE
    WHEN (SELECT temperature FROM Contact WHERE id = contact_id) = 'hot' THEN 20
    WHEN (SELECT temperature FROM Contact WHERE id = contact_id) = 'warm' THEN 10
    ELSE 0
  END;
  
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;
```

#### 4. Agent Monthly Cost Calculation
```sql
CREATE OR REPLACE FUNCTION calculate_agent_monthly_cost(
  agent_id UUID,
  month_start DATE,
  month_end DATE
)
RETURNS DECIMAL AS $$
DECLARE
  total_cost DECIMAL := 0;
BEGIN
  SELECT COALESCE(SUM(cost), 0) INTO total_cost
  FROM AgentExecutionLog ael
  WHERE ael.agentId = agent_id
    AND ael.createdAt >= month_start
    AND ael.createdAt <= month_end;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;
```

### Triggers to Implement

#### 1. Updated_at Auto-update
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON Contact
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON Conversation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... repeat for all tables
```

#### 2. Contact Timeline Auto-create
```sql
CREATE OR REPLACE FUNCTION create_contact_timeline_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ContactTimelineEvent (contactId, eventType, title)
    VALUES (NEW.id, 'contact_created', 'Contact created');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.temperature != NEW.temperature THEN
      INSERT INTO ContactTimelineEvent (contactId, eventType, title, description)
      VALUES (NEW.id, 'temperature_changed', 'Temperature changed', 
              CONCAT('From ', OLD.temperature, ' to ', NEW.temperature));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_timeline_trigger AFTER INSERT OR UPDATE ON Contact
  FOR EACH ROW EXECUTE FUNCTION create_contact_timeline_event();
```

#### 3. Deal Stage History Auto-create
```sql
CREATE OR REPLACE FUNCTION create_deal_stage_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stageId != NEW.stageId THEN
    INSERT INTO DealStageHistory (dealId, fromStageId, toStageId, movedBy)
    VALUES (NEW.id, OLD.stageId, NEW.stageId, NEW.ownerUserId);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deal_stage_history_trigger AFTER UPDATE ON Deal
  FOR EACH ROW EXECUTE FUNCTION create_deal_stage_history();
```

---

## Phase 5: Health Monitoring

### Health Check Endpoints

#### 1. General Health
```typescript
// GET /api/health
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
}
```

#### 2. Database Health
```typescript
// GET /api/health/db
export async function GET() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return NextResponse.json({
      status: 'healthy',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Database connection failed',
    }, { status: 503 });
  }
}
```

#### 3. Redis Health
```typescript
// GET /api/health/redis
export async function GET() {
  try {
    const start = Date.now();
    // Test Redis connection
    const latency = Date.now() - start;
    
    return NextResponse.json({
      status: 'healthy',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Redis connection failed',
    }, { status: 503 });
  }
}
```

#### 4. AI Health
```typescript
// GET /api/health/ai
export async function GET() {
  try {
    // Test AI provider connection
    const health = await testAIProviders();
    
    return NextResponse.json({
      status: health.status,
      providers: health.providers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'AI providers unavailable',
    }, { status: 503 });
  }
}
```

### Internal Health Dashboard

Create `/admin/system-health` page showing:
- Database status & latency
- Redis status & latency
- WebSocket connections count
- AI providers status (OpenAI, Groq, Anthropic)
- Queue depth (BullMQ)
- Active workers count
- WhatsApp connection status

---

## Phase 6: Production Critical Enhancements

### 1. Global Request ID

Every request must receive a unique `x-request-id` header that is propagated through all logs.

#### Implementation
```typescript
// src/server/middleware/request-id.middleware.ts
import { randomUUID } from 'crypto';

export function generateRequestId(): string {
  return `req_${randomUUID().slice(0, 8)}`;
}

export async function withRequestId(handler: (request: Request, requestId: string) => Promise<Response>) {
  return async (request: Request) => {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const response = await handler(request, requestId);
    response.headers.set('x-request-id', requestId);
    return response;
  };
}
```

#### Propagation to Logs
```typescript
// In audit logs
await prisma.auditLog.create({
  data: {
    requestId,
    // ... other fields
  },
});

// In error logs
logger.error({
  requestId,
  error,
  context,
});

// In AI logs
await prisma.agentExecutionLog.create({
  data: {
    requestId,
    // ... other fields
  },
});
```

#### Use Case
When a customer complains "My message disappeared", you can trace the entire request lifecycle:
```
req_8f2c1a4b → audit_log → ai_log → api_log → error_log
```

### 2. Global Soft Delete

Verify ALL operational entities have `deletedAt` field. Avoid physical DELETE.

#### Entities to Verify
- ✅ Contact (already has deletedAt)
- ✅ Deal (already has deletedAt)
- ✅ Conversation (already has deletedAt)
- ✅ Task (already has deletedAt)
- ✅ Campaign (verify)
- ✅ Pipeline (verify)
- ✅ Department (verify)

#### Migration to Add deletedAt
```sql
-- For entities missing deletedAt
ALTER TABLE Campaign ADD COLUMN deletedAt TIMESTAMP;
ALTER TABLE Pipeline ADD COLUMN deletedAt TIMESTAMP;
ALTER TABLE Department ADD COLUMN deletedAt TIMESTAMP;
```

#### Prisma Query Pattern
```typescript
// Always filter out soft-deleted records
const contacts = await prisma.contact.findMany({
  where: {
    tenantId,
    deletedAt: null, // Always include
  },
});

// Soft delete instead of physical delete
await prisma.contact.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

### 3. Concurrency Protection

Prevent race conditions in critical operations, especially "Claim Conversation".

#### Problem Scenario
```
Time 0: Atendente A views conversation (status: open)
Time 1: Atendente B views conversation (status: open)
Time 2: Atendente A claims (status: in_progress)
Time 3: Atendente B claims (status: in_progress) ← Race condition!
```

#### Solution: Optimistic Locking with Transaction
```typescript
export async function claimConversation(conversationId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Lock the row for update
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.status !== 'open') {
      throw new Error('Conversation already claimed');
    }

    // Update atomically
    const updated = await tx.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'in_progress',
        assignedUserId: userId,
        claimedAt: new Date(),
      },
    });

    // Create assignment record
    await tx.conversationAssignment.create({
      data: {
        conversationId,
        userId,
        assignedBy: userId,
      },
    });

    return updated;
  });
}
```

#### Alternative: Unique Constraint on Active Assignment
```prisma
model ConversationAssignment {
  id             String    @id @default(uuid())
  conversationId String
  userId         String
  assignedBy     String?
  assignedAt     DateTime  @default(now())
  unassignedAt   DateTime?

  conversation Conversation @relation(fields: [conversationId], references: [id])
  user         User        @relation(fields: [userId], references: [id])

  @@unique([conversationId, unassignedAt]) // Only one active assignment per conversation
}
```

### 4. API Versioning

Create `/api/v1/` structure from day one to avoid future pain.

#### Directory Structure
```
src/app/api/
├── v1/
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   └── ...
│   ├── contacts/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── conversations/
│   │   └── ...
│   └── ...
└── (legacy routes - can be removed later)
```

#### Migration Strategy
```typescript
// Phase 1: Create v1 structure (current)
// Phase 2: Keep old routes as aliases
// Phase 3: Deprecate old routes with warning headers
// Phase 4: Remove old routes after 6 months
```

#### Example
```typescript
// src/app/api/v1/contacts/route.ts
export async function GET(request: Request) {
  // v1 implementation
}

// src/app/api/contacts/route.ts (temporary alias)
export async function GET(request: Request) {
  const response = await import('../v1/contacts/route.ts').then(m => m.GET(request));
  response.headers.set('X-API-Deprecated', 'true');
  response.headers.set('X-API-Version', 'Use /api/v1/contacts instead');
  return response;
}
```

### 5. Internal Health Dashboard

Create `/admin/system-health` page for internal monitoring.

#### Dashboard Components
```typescript
// src/app/admin/system-health/page.tsx
export default function SystemHealthPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">System Health</h1>
      
      <HealthCard title="Database" checks={['connection', 'latency', 'pool']} />
      <HealthCard title="Redis" checks={['connection', 'memory', 'keys']} />
      <HealthCard title="WebSocket" checks={['connections', 'messages/sec']} />
      <HealthCard title="AI Providers" checks={['OpenAI', 'Groq', 'Anthropic']} />
      <HealthCard title="Queue" checks={['depth', 'processing', 'failed']} />
      <HealthCard title="Workers" checks={['active', 'cpu', 'memory']} />
      <HealthCard title="WhatsApp" checks={['connection', 'messages', 'webhooks']} />
    </div>
  );
}
```

#### Health Check API for Dashboard
```typescript
// GET /api/health/all
export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkWebSocket(),
    checkAIProviders(),
    checkQueue(),
    checkWorkers(),
    checkWhatsApp(),
  ]);

  return NextResponse.json({
    overall: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
    checks: checks.map((c, i) => ({
      name: ['database', 'redis', 'websocket', 'ai', 'queue', 'workers', 'whatsapp'][i],
      status: c.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      data: c.status === 'fulfilled' ? c.value : c.reason,
    })),
  });
}
```

#### RBAC for Dashboard
```typescript
// Only admins can access
export async function GET() {
  const user = await requireAuth();
  await requirePermission('system:health:read');
  
  // ... render dashboard
}
```

### 6. Feature Flags

Create feature flag system to control feature availability by tenant, plan, or rollout strategy.

#### Feature Flag Models
```prisma
model FeatureFlag {
  id          String   @id @default(uuid())
  key         String   @unique // e.g., ai_enabled, copilot_enabled
  name        String
  description String?
  owner       String   // Who owns this flag (team/individual)
  category    String   // release, plan, experiment, kill-switch
  isEnabled   Boolean  @default(false)
  rolloutPercent Int   @default(0) // 0-100 for gradual rollout
  expiresAt   DateTime? // For temporary flags (release, experiment)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenantFlags TenantFeatureFlag[]
}

model TenantFeatureFlag {
  id           String     @id @default(uuid())
  tenantId     String
  featureFlagId String
  isEnabled    Boolean    @default(false)
  overrideReason String? // For manual overrides
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  tenant       Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  featureFlag  FeatureFlag @relation(fields: [featureFlagId], references: [id], onDelete: Cascade)

  @@unique([tenantId, featureFlagId])
}
```

#### Feature Flag Governance

**Every flag must have:**
```typescript
{
  key: string;           // Unique identifier
  description: string;   // What this flag controls
  owner: string;         // Team/individual responsible
  createdAt: Date;       // When it was created
  expiresAt?: Date;      // For temporary flags
  category: "release" | "plan" | "experiment" | "kill-switch";
}
```

**Categories:**

**release** - Temporary flags with expiration date
- Example: `new-inbox-ui`
- Purpose: Gradual rollout of new UI/UX
- Lifecycle: Create → Rollout → Monitor → Delete after expiresAt

**plan** - Permanent flags for commercial plans
- Example: `copilot_enabled`, `forecast_enabled`
- Purpose: Enable/disable features by plan (Starter/Pro/Enterprise)
- Lifecycle: Permanent, never expires

**experiment** - Short-term flags for A/B testing
- Example: `new-sdr-prompt`, `alternative-routing`
- Purpose: Test hypotheses with subset of users
- Lifecycle: Create → Test → Analyze → Delete (short validity)

**kill-switch** - Emergency flags, never remove
- Example: `whatsapp_enabled`, `ai_execution_enabled`
- Purpose: Emergency disable without deployment
- Lifecycle: Permanent, always available for emergency use

**Governance Rules:**
1. **Flag Debt Prevention**: Review all flags monthly, remove expired release/experiment flags
2. **Owner Responsibility**: Every flag must have an owner who monitors its usage
3. **Expiration Enforcement**: System warns when release/experiment flags approach expiresAt
4. **Kill-switch Protection**: Kill-switch flags require admin approval to modify

#### Example Feature Flags
```typescript
// Core features
const CORE_FLAGS = [
  'ai_enabled',           // AI agents
  'copilot_enabled',      // AI copilot assistance
  'workflow_enabled',     // Flow builder
  'forecast_enabled',     // Sales forecasting
  'campaigns_enabled',    // Campaign management
  'whatsapp_enabled',     // WhatsApp integration
  'analytics_enabled',    // Advanced analytics
  'api_access_enabled',  // API access for integrations
];
```

#### Feature Flag Service
```typescript
// src/server/services/feature-flag.service.ts
export class FeatureFlagService {
  static async isEnabled(tenantId: string, flagKey: string): Promise<boolean> {
    // Check tenant-specific override first
    const tenantFlag = await prisma.tenantFeatureFlag.findUnique({
      where: {
        tenantId_featureFlagId: {
          tenantId,
          featureFlagId: flagKey,
        },
      },
    });

    if (tenantFlag) {
      return tenantFlag.isEnabled;
    }

    // Check global flag with rollout percentage
    const globalFlag = await prisma.featureFlag.findUnique({
      where: { key: flagKey },
    });

    if (!globalFlag || !globalFlag.isEnabled) {
      return false;
    }

    // Gradual rollout based on tenant hash
    if (globalFlag.rolloutPercent < 100) {
      const hash = this.hashTenantId(tenantId);
      const rolloutThreshold = globalFlag.rolloutPercent;
      return (hash % 100) < rolloutThreshold;
    }

    return true;
  }

  static async enableForTenant(tenantId: string, flagKey: string, reason?: string) {
    await prisma.tenantFeatureFlag.upsert({
      where: {
        tenantId_featureFlagId: { tenantId, featureFlagId: flagKey },
      },
      create: {
        tenantId,
        featureFlagId: flagKey,
        isEnabled: true,
        overrideReason: reason,
      },
      update: {
        isEnabled: true,
        overrideReason: reason,
      },
    });
  }

  private static hashTenantId(tenantId: string): number {
    let hash = 0;
    for (let i = 0; i < tenantId.length; i++) {
      hash = ((hash << 5) - hash) + tenantId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

#### Usage in API Routes
```typescript
export async function POST(request: Request) {
  const user = await requireAuth();
  await requireTenant();

  // Check feature flag before processing
  const aiEnabled = await FeatureFlagService.isEnabled(user.tenantId, 'ai_enabled');
  if (!aiEnabled) {
    return NextResponse.json(
      { error: 'Feature not available for your plan' },
      { status: 403 }
    );
  }

  // ... proceed with AI operation
}
```

#### Benefits
- **Plan-based control**: Enable features by Starter/Pro/Enterprise plans
- **Closed beta**: Test features with select tenants
- **Gradual rollout**: Roll out to 10%, then 25%, then 50%, then 100%
- **Emergency disable**: Turn off problematic features without deployment
- **A/B testing**: Test new features with subset of users

### Health Check Endpoints

#### 1. General Health
```typescript
// GET /api/health
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
}
```

#### 2. Database Health
```typescript
// GET /api/health/db
export async function GET() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return NextResponse.json({
      status: 'healthy',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Database connection failed',
    }, { status: 503 });
  }
}
```

#### 3. Redis Health
```typescript
// GET /api/health/redis
export async function GET() {
  try {
    const start = Date.now();
    // Test Redis connection
    const latency = Date.now() - start;
    
    return NextResponse.json({
      status: 'healthy',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Redis connection failed',
    }, { status: 503 });
  }
}
```

#### 4. AI Health
```typescript
// GET /api/health/ai
export async function GET() {
  try {
    // Test AI provider connection
    const health = await testAIProviders();
    
    return NextResponse.json({
      status: health.status,
      providers: health.providers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'AI providers unavailable',
    }, { status: 503 });
  }
}
```

---

## Success Metrics

### Quantitative
- [ ] 25 new API endpoints (5 entities × 5 operations)
- [ ] 5 Zod validation schemas
- [ ] 4 SQL functions
- [ ] 3 SQL triggers
- [ ] 4 health check endpoints
- [ ] 100% route coverage with audit logging
- [ ] Global request ID on all requests
- [ ] Soft delete on all operational entities
- [ ] Concurrency protection on critical operations
- [ ] API versioning structure (/api/v1/)
- [ ] Internal health dashboard (/admin/system-health)
- [ ] Feature flag system with governance (owner, category, expiresAt)
- [ ] 8 core feature flags with categories (release, plan, experiment, kill-switch)
- [ ] Flag debt prevention mechanism (monthly review)
- [ ] Operational score metrics collection (6 components)
- [ ] Operational score display in health dashboard
- [ ] Operational score alert system (< 80 threshold)

### Qualitative
- [ ] All routes enforce validation before processing
- [ ] All database operations are audited
- [ ] System health is observable via health endpoints
- [ ] Business logic is enforced at database level
- [ ] No route can bypass authentication/authorization

---

## Timeline Estimate

- **Phase 1 (CRUD):** 2-3 days
- **Phase 2 (Zod):** 1-2 days
- **Phase 3 (Audit):** 1-2 days
- **Phase 4 (SQL):** 1-2 days
- **Phase 5 (Health):** 0.5-1 day
- **Phase 6 (Critical Enhancements):** 3.5-4.5 days
  - Request ID: 0.5 day
  - Soft Delete: 0.5 day
  - Concurrency Protection: 1 day
  - API Versioning: 0.5-1 day
  - Health Dashboard: 0.5 day
  - Feature Flags (with governance): 1 day
  - Operational Score: 0.5 day
  - Business Readiness Score: 0.5 day

**Total Estimated:** 9.5 - 16.5 days

---

## Interim Sprint: Production Validation

**Before AI Real, validate everything in real environment.**

### Objective
Execute end-to-end tests in production-like environment:
- Real login
- Real CRUD operations
- Real multi-tenant isolation
- Real RBAC enforcement
- Real health dashboard
- Real audit logs
- Real soft delete
- Real concurrency scenarios

### Test Scenarios
1. **Multi-Tenant Isolation**
   - Create 2 tenants
   - Verify Tenant A cannot see Tenant B's data
   - Verify cross-tenant queries are blocked

2. **RBAC Enforcement**
   - Create user with limited permissions
   - Attempt unauthorized operations
   - Verify all are blocked

3. **Concurrency**
   - Simulate 2 users claiming same conversation
   - Verify only one succeeds

4. **Soft Delete**
   - Delete contact
   - Verify it's filtered from queries
   - Verify it can be restored

5. **Audit Trail**
   - Perform operations
   - Verify audit logs capture everything
   - Verify request IDs propagate correctly

6. **Health Monitoring**
   - Monitor dashboard during load
   - Verify all components report correctly
   - Test failure scenarios

### Success Criteria
- All test scenarios pass
- No data leaks between tenants
- No unauthorized access possible
- Audit trail is complete and traceable
- Health dashboard reflects reality

### Duration
- 2-3 days

---

## Frozen Sprint Sequence

**Official sequence after Production Readiness:**

```
Sprint Production Readiness
↓
Sprint Production Validation
↓
Sprint Trial & Onboarding System (Business Critical)
↓
Sprint AI Core
  - Triage Agent
  - SDR Agent
  - Summary Agent
↓
Sprint WhatsApp Cloud API
↓
Sprint AI Workforce Expansion
↓
Sprint Enterprise Scale
```

### Rigid Rule

**NO new modules, NO new screens, NO new agents UNTIL:**

```
Production Score ≥ 9.2
```

### Competitive Advantage

At this stage of HBFlow, the biggest competitive advantage is NOT having more features. It's being **more reliable than competitors** while delivering AI, CRM, and WhatsApp in the same platform.

This is much harder to copy than adding another sidebar menu.

---

## Next Sprint: AI Real

After Production Readiness:

### Authorization Criteria
**Only authorize AI integration when ALL gates are GREEN:**
- ✅ Build Green
- ✅ Migration Green
- ✅ Seed Green
- ✅ CRUD Green
- ✅ Audit Green
- ✅ Health Green

**Rationale:** AI on an unstable foundation only multiplies problems.

### Phase 1: Triage Agent
- Real OpenAI/Groq integration
- Message classification
- Priority assignment
- Department routing

### Phase 2: SDR Agent
- Lead qualification
- Automated follow-up
- Meeting scheduling
- Pipeline progression

### Phase 3: Summary Agent
- Conversation summarization
- CRM auto-updates
- Deal note generation
- Activity logging

**Rationale:** These 3 agents generate ~80% of perceived customer value.

**Note:** Do NOT connect all 15 agents at once. Start with these 3 only.

---

## Conclusion

This sprint is about discipline and production readiness. No new features, no new agents, no new screens. The focus is entirely on transforming the functional backend into an operational backend that can serve real customers safely and reliably.

Once this sprint is complete, HBFlow will be ready for the AI Real sprint, where we'll connect the first 3 agents to production systems.

---

## Current Product Assessment

### Current State (Pre-Sprint)
| Area | Score |
|------|-------|
| Database | 9.5 |
| RBAC | 9.2 |
| CRM | 9.3 |
| Inbox | 9.4 |
| Multi-Tenant | 9.5 |
| Observability | 6.5 |
| Production | 7.8 |
| **Overall** | **9.4** |

### Expected State (Post-Sprint)
| Area | Score | Delta |
|------|-------|-------|
| Architecture | 9.9 | +0.1 |
| Database | 9.8 | +0.3 |
| Multi-Tenant | 9.9 | +0.4 |
| RBAC | 9.7 | +0.5 |
| CRM | 9.7 | +0.4 |
| Inbox | 9.8 | +0.4 |
| Observability | 9.3 | +2.8 |
| Production | 9.2 | +1.4 |
| Commercial | 9.9 | +0.1 |
| **Overall** | **9.7** | **+0.3** |

### Post-Roadmap Projections

After Production Readiness + AI Core + WhatsApp Cloud API:

| Metric | Projection |
|--------|------------|
| Production Score | 9.2+ |
| Operational Score | 85+ |
| Business Readiness | 90+ |
| Architecture | 9.9 |
| Product | 9.8 |
| Commercial | 9.9 |

### Next Milestone

**Seek first paying pilot customers**

**Rationale:** The next most valuable learning will NOT come from code — it will come from real product usage by real companies.

### Key Outcome
**Operational Risk decreases dramatically.**

The project enters a phase where each sprint increases product reliability, not just feature count. This is when projects become truly ready for paying customers.

---

## Operational Score (New Metric)

After Production Readiness, track operational health in real-time.

### Components
```typescript
interface OperationalScore {
  availability: number;      // 0-100, Uptime percentage
  errorRate: number;         // 0-100, Error rate (inverted, higher is better)
  queueHealth: number;       // 0-100, Queue depth and processing rate
  dbLatency: number;         // 0-100, Database response time (inverted)
  aiSuccessRate: number;     // 0-100, AI provider success rate
  whatsappDeliveryRate: number; // 0-100, WhatsApp message delivery
}
```

### Calculation
```typescript
function calculateOperationalScore(metrics: OperationalScore): number {
  return (
    metrics.availability * 0.3 +
    metrics.errorRate * 0.2 +
    metrics.queueHealth * 0.15 +
    metrics.dbLatency * 0.15 +
    metrics.aiSuccessRate * 0.1 +
    metrics.whatsappDeliveryRate * 0.1
  );
}
```

### Display Location
- `/admin/system-health` - Real-time operational score
- Alert triggers when score < 80

### Target
- **Post-Sprint:** Operational Score ≥ 85
- **Production Ready:** Operational Score ≥ 90

---

## Business Readiness Score

**Document:** `docs/PRODUCT_GOVERNANCE.md`

### Components

| Component | Weight | Target |
|-----------|--------|--------|
| Multi-Tenant | 15% | 9.5+ |
| RBAC | 15% | 9.5+ |
| Billing/Plans | 15% | 9.0+ |
| Observability | 15% | 9.0+ |
| Production | 20% | 9.2+ |
| AI Core | 10% | 8.5+ |
| WhatsApp Real | 10% | 8.5+ |

### Target Thresholds
- **85+** - Ready for pilot customers
- **90+** - Ready for general availability
- **95+** - Ready for enterprise scale

### Display Location
- `/admin/system-health` - Executive dashboard with all scores

### Color Coding
- **Green (90-100)** - Healthy
- **Yellow (80-89)** - Monitor
- **Red (0-79)** - Action Required

## Next 30 Days Focus

**DO NOT:**
- Add new features
- Add new agents
- Add new screens

**ONLY:**
- Production
- Observability
- Security
- Stability

**Expected Outcome:** With this discipline, the jump from 9.4 → 9.8 will be faster than expected, because future gains will come from making what exists extremely reliable, not from new ideas.

---

**Sprint Created:** June 9, 2026  
**Estimated Duration:** 9 - 16 days (Production Readiness) + 2-3 days (Production Validation)  
**Success Metric:** Production Score increases from 7.8 to 9.2  
**Total Tasks:** 50 (44 Production Readiness + 6 Production Validation)  
**Expected Overall Score:** 9.4 → 9.7  
**Operational Score Target:** ≥ 85 post-sprint, ≥ 90 production ready  
**Business Readiness Target:** ≥ 90 post-roadmap (ready for pilot customers)  
**Governance:** See `docs/PRODUCT_GOVERNANCE.md` for Architecture Freeze and governance rules

**Next Sprint:** Sprint Trial & Onboarding System (Business Critical) - See `docs/SPRINT_TRIAL_ONBOARDING.md`
