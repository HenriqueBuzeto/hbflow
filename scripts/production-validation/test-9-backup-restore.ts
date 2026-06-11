import { prisma } from '../../src/server/db/prisma';

interface TestResult {
  scenario: string;
  passed: boolean;
  error?: string;
}

async function runBackupRestoreTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const assert = (scenario: string, condition: boolean, details?: string) => {
    if (condition) {
      console.log(`   ✅ PASS: ${scenario}`);
      results.push({ scenario, passed: true });
    } else {
      console.log(`   ❌ FAIL: ${scenario} ${details ? `(${details})` : ''}`);
      results.push({ scenario, passed: false, error: details });
    }
  };

  console.log('--- Phase 1: Seeding Test Tenant & Multi-Table Relations ---');
  const tenantId = `bkp-test-${Date.now()}`;
  const slug = `backup-restore-slug-${Date.now()}`;
  const userId = `usr-bkp-${Date.now()}`;
  const subscriptionId = `sub-bkp-${Date.now()}`;
  const contactId = `cnt-bkp-${Date.now()}`;
  const conversationId = `cnv-bkp-${Date.now()}`;
  const messageId = `msg-bkp-${Date.now()}`;
  const dealId = `dl-bkp-${Date.now()}`;
  const auditId = `aud-bkp-${Date.now()}`;

  try {
    // 1. Seed
    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Backup Restore Corp',
        slug,
        status: 'active'
      }
    });

    const user = await prisma.user.create({
      data: {
        id: userId,
        tenantId,
        name: 'Backup Operator',
        email: `operator-${Date.now()}@hbflow.com`,
        passwordHash: 'mock_password_hash'
      }
    });

    // Seed or find the Plan Pro to satisfy Subscription relation constraints
    const planSlug = 'pro';
    let plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: 'Pro Plan',
          slug: planSlug,
          priceCents: 34900,
          billingCycle: 'monthly',
          isActive: true
        }
      });
    }

    const subscription = await prisma.subscription.create({
      data: {
        id: subscriptionId,
        tenantId,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    const pipelineId = `pip-bkp-${Date.now()}`;
    const stageId = `stg-bkp-${Date.now()}`;

    const pipeline = await prisma.pipeline.create({
      data: {
        id: pipelineId,
        tenantId,
        name: 'Funil Principal',
        isDefault: true
      }
    });

    const stage = await prisma.pipelineStage.create({
      data: {
        id: stageId,
        pipelineId,
        name: 'Contato Inicial',
        position: 0
      }
    });

    const contact = await prisma.contact.create({
      data: {
        id: contactId,
        tenantId,
        name: 'Cliente Importante',
        phone: '+5511988887777',
        normalizedPhone: '5511988887777',
        source: 'whatsapp'
      }
    });

    const conversation = await prisma.conversation.create({
      data: {
        id: conversationId,
        tenantId,
        contactId,
        status: 'new',
        subject: 'Conversa de Vendas'
      }
    });

    const message = await prisma.message.create({
      data: {
        id: messageId,
        tenantId,
        conversationId,
        senderType: 'contact',
        senderName: 'Cliente Importante',
        body: 'Gostaria de fechar um orçamento agora!',
        type: 'text',
        status: 'delivered'
      }
    });

    const deal = await prisma.deal.create({
      data: {
        id: dealId,
        tenantId,
        contactId,
        pipelineId,
        stageId,
        title: 'Deal de Óculos VIP',
        value: 750.00,
        status: 'open'
      }
    });

    const audit = await prisma.auditLog.create({
      data: {
        id: auditId,
        tenantId,
        userId,
        action: 'tenant.backup.created',
        entity: 'tenant',
        entityId: tenantId,
        metadata: { operator: 'System Cron' }
      }
    });

    console.log('   Seed completed. Replicating multi-tenant backup extraction...');

    // 2. Export (serialize) to JSON structure
    const startTime = Date.now();

    const backupData = {
      tenant: await prisma.tenant.findUnique({ where: { id: tenantId } }),
      users: await prisma.user.findMany({ where: { tenantId } }),
      subscriptions: await prisma.subscription.findMany({ where: { tenantId } }),
      pipelines: await prisma.pipeline.findMany({ where: { tenantId } }),
      pipelineStages: await prisma.pipelineStage.findMany({ where: { pipeline: { tenantId } } }),
      contacts: await prisma.contact.findMany({ where: { tenantId } }),
      conversations: await prisma.conversation.findMany({ where: { tenantId } }),
      messages: await prisma.message.findMany({ where: { tenantId } }),
      deals: await prisma.deal.findMany({ where: { tenantId } }),
      auditLogs: await prisma.auditLog.findMany({ where: { tenantId } })
    };

    assert(
      'Backup Extraction contains all created relational records',
      backupData.tenant !== null &&
      backupData.users.length === 1 &&
      backupData.subscriptions.length === 1 &&
      backupData.pipelines.length === 1 &&
      backupData.pipelineStages.length === 1 &&
      backupData.contacts.length === 1 &&
      backupData.conversations.length === 1 &&
      backupData.messages.length === 1 &&
      backupData.deals.length === 1 &&
      backupData.auditLogs.length === 1
    );

    console.log('\n--- Phase 2: Simulating Catastrophic Data Wipe ---');
    // We wipe all seeded elements manually to simulate database wipe/tenant deletion
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.deal.deleteMany({ where: { tenantId } });
    await prisma.message.deleteMany({ where: { tenantId } });
    await prisma.conversation.deleteMany({ where: { tenantId } });
    await prisma.contact.deleteMany({ where: { tenantId } });
    await prisma.pipelineStage.deleteMany({ where: { pipeline: { tenantId } } });
    await prisma.pipeline.deleteMany({ where: { tenantId } });
    await prisma.subscription.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });

    // Assert database is empty of test records
    const checkTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const checkMessage = await prisma.message.findFirst({ where: { tenantId } });
    assert(
      'Database wiped successfully: all tenant tables are clean',
      checkTenant === null && checkMessage === null
    );

    console.log('\n--- Phase 3: Executing Programmatic Restore & FK Preservation ---');
    // Restore elements maintaining FK relations
    if (backupData.tenant) {
      await prisma.tenant.create({ data: backupData.tenant });
    }
    for (const u of backupData.users) {
      await prisma.user.create({ data: u });
    }
    for (const s of backupData.subscriptions) {
      await prisma.subscription.create({ data: s });
    }
    for (const p of backupData.pipelines) {
      await prisma.pipeline.create({ data: p });
    }
    for (const ps of backupData.pipelineStages) {
      await prisma.pipelineStage.create({ data: ps });
    }
    for (const c of backupData.contacts) {
      await prisma.contact.create({ data: c });
    }
    for (const cnv of backupData.conversations) {
      await prisma.conversation.create({ data: cnv });
    }
    for (const m of backupData.messages) {
      await prisma.message.create({ data: m });
    }
    for (const d of backupData.deals) {
      await prisma.deal.create({ data: d });
    }
    for (const aud of backupData.auditLogs) {
      await prisma.auditLog.create({ data: aud });
    }

    const recoveryDurationMs = Date.now() - startTime;
    console.log(`   Restore completed in ${recoveryDurationMs} ms.`);

    console.log('\n--- Phase 4: Data Integrity Verification ---');
    const restoredTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const restoredMessage = await prisma.message.findFirst({ where: { tenantId } });
    const restoredDeal = await prisma.deal.findFirst({ where: { tenantId } });

    assert(
      'Restored tenant metadata matches pre-wipe backup state',
      restoredTenant !== null && restoredTenant.name === 'Backup Restore Corp'
    );

    assert(
      'Restored messaging logs map correctly and match previous contents',
      restoredMessage !== null && restoredMessage.body === 'Gostaria de fechar um orçamento agora!'
    );

    assert(
      'Restored commercial pipeline maintains values and foreign key linkages',
      restoredDeal !== null && Number(restoredDeal.value) === 750 && restoredDeal.contactId === contactId
    );

    assert(
      'Recovery point objective achieved inside RTA threshold (< 30 seconds)',
      recoveryDurationMs < 30000,
      `Duration: ${recoveryDurationMs} ms`
    );

    // CLEANUP
    await prisma.auditLog.deleteMany({ where: { tenantId } });
    await prisma.deal.deleteMany({ where: { tenantId } });
    await prisma.message.deleteMany({ where: { tenantId } });
    await prisma.conversation.deleteMany({ where: { tenantId } });
    await prisma.contact.deleteMany({ where: { tenantId } });
    await prisma.pipelineStage.deleteMany({ where: { pipeline: { tenantId } } });
    await prisma.pipeline.deleteMany({ where: { tenantId } });
    await prisma.subscription.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });

  } catch (err: any) {
    console.error('Backup Restore Test failed unexpectedly:', err);
    results.push({ scenario: 'Critical Runtime Error', passed: false, error: err.message });
  }

  return results;
}

async function main() {
  console.log('🏁 Starting E2E Backup & Restore Integrity Validation Suite...\n');
  const results = await runBackupRestoreTest();

  console.log('\n=== RESULTS SUMMARY ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🏁 Database Backup & Restore: ALL PASSED ✅');
  } else {
    console.log('\n🏁 Database Backup & Restore: FAILED ❌');
  }

  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error);
