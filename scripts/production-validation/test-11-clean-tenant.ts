import { prisma } from '../../src/server/db/prisma';
import { AuthService } from '../../src/server/auth/auth.service';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function runCleanTenantValidation(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const assert = (name: string, condition: boolean, details?: string, data?: any) => {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      results.push({ testName: name, passed: true, details: data });
    } else {
      console.log(`❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      results.push({ testName: name, passed: false, error: details, details: data });
    }
  };

  let tenantId: string | undefined;

  try {
    console.log('--- Phase 1: Seeding / Registering clean trial tenant ---');
    const randomSuffix = Math.floor(Math.random() * 10000);
    const registerData = {
      companyName: `Clean Tenant Corp ${randomSuffix}`,
      cnpj: `22.345.678/0001-${String(randomSuffix).padStart(2, '0')}`,
      email: `clean_tenant_${randomSuffix}@hbflow.com.br`,
      phone: `55119${String(randomSuffix).padStart(8, '0')}`,
      userName: `Carlos Clean ${randomSuffix}`
    };

    const regResult = await AuthService.registerTrial(registerData);
    tenantId = regResult.tenantId;

    assert(
      'Trial registration generated tenant ID successfully',
      tenantId !== undefined,
      'tenantId is undefined',
      { regResult }
    );

    if (!tenantId) {
      throw new Error('Tenant registration failed');
    }

    console.log(`New tenant registered: ${tenantId}`);

    console.log('\n--- Phase 2: Verifying Required Setup Metadata ---');

    // 1. Check Tenant model
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    assert('Tenant record exists in database', tenant !== null, 'Tenant is null', tenant);

    // 2. Check Admin user
    const adminUser = await prisma.user.findFirst({
      where: { tenantId }
    });
    assert('Admin user record exists', adminUser !== null, 'Admin User is null', adminUser);

    // 3. Check subscription
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId }
    });
    assert('Subscription record exists', subscription !== null, 'Subscription is null', subscription);

    // 4. Check TenantSettings
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });
    assert('TenantSettings record exists', settings !== null, 'TenantSettings is null', settings);

    console.log('\n--- Phase 3: Auditing Operational Tables (Must be exactly 0) ---');

    const contactCount = await prisma.contact.count({ where: { tenantId } });
    assert('Contact count is exactly 0', contactCount === 0, `Count: ${contactCount}`);

    const conversationCount = await prisma.conversation.count({ where: { tenantId } });
    assert('Conversation count is exactly 0', conversationCount === 0, `Count: ${conversationCount}`);

    const messageCount = await prisma.message.count({ where: { tenantId } });
    assert('Message count is exactly 0', messageCount === 0, `Count: ${messageCount}`);

    const dealCount = await prisma.deal.count({ where: { tenantId } });
    assert('Deal count is exactly 0', dealCount === 0, `Count: ${dealCount}`);

    const taskCount = await prisma.task.count({ where: { tenantId } });
    assert('Task count is exactly 0', taskCount === 0, `Count: ${taskCount}`);

    const campaignCount = await prisma.campaign.count({ where: { tenantId } });
    assert('Campaign count is exactly 0', campaignCount === 0, `Count: ${campaignCount}`);

    const campaignRecipientCount = await prisma.campaignRecipient.count({ where: { campaign: { tenantId } } });
    assert('CampaignRecipient count is exactly 0', campaignRecipientCount === 0, `Count: ${campaignRecipientCount}`);

    const followupSequenceCount = await prisma.followupSequence.count({ where: { tenantId } });
    assert('FollowupSequence count is exactly 0', followupSequenceCount === 0, `Count: ${followupSequenceCount}`);

    const followupStepCount = await prisma.followupStep.count({ where: { sequence: { tenantId } } });
    assert('FollowupStep count is exactly 0', followupStepCount === 0, `Count: ${followupStepCount}`);

    const whatsappWebhookEventCount = await prisma.whatsappWebhookEvent.count({ where: { connection: { tenantId } } });
    assert('WhatsappWebhookEvent count is exactly 0', whatsappWebhookEventCount === 0, `Count: ${whatsappWebhookEventCount}`);

    const whatsappApiLogCount = await prisma.whatsappApiLog.count({ where: { connection: { tenantId } } });
    assert('WhatsappApiLog count is exactly 0', whatsappApiLogCount === 0, `Count: ${whatsappApiLogCount}`);

  } catch (error) {
    console.error('❌ Clean Tenant Validation failed with error:', error);
    results.push({
      testName: 'General Execution Flow',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (tenantId) {
      console.log('\n--- Phase 4: Cleaning Up Tenant Record ---');
      try {
        await prisma.tenant.delete({
          where: { id: tenantId }
        });
        console.log(`✅ Successfully cleaned up tenant: ${tenantId}`);
      } catch (cleanupError) {
        console.error(`❌ Cleanup failed for tenant ${tenantId}:`, cleanupError);
      }
    }
  }

  return results;
}

async function main() {
  console.log('🏁 Starting Clean Tenant & Anti-Mock Integrity Validation...');
  
  const results = await runCleanTenantValidation();
  
  console.log('\n=== RESULTS SUMMARY ===');
  const failed = results.filter((r) => !r.passed);
  
  if (failed.length === 0) {
    console.log('\nCLEAN_TENANT_VALIDATION: PASS');
    process.exit(0);
  } else {
    console.log('\nCLEAN_TENANT_VALIDATION: FAIL');
    console.log('Failures encountered:');
    failed.forEach(f => console.log(`  - [${f.testName}]: ${f.error}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
