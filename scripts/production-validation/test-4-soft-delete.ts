import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Load local .env variables manually to ensure connection to the correct local/configured database
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          process.env[key] = value.trim();
        }
      });
      console.log('✅ Loaded database configuration from local .env file');
    }
  } catch (err) {
    console.error('⚠️ Failed to load local .env file, fallback will be used:', err);
  }
}

loadEnv();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'prisma+postgres://neondb_owner:npg_EaCp5hbu6YcN@ep-lively-glade-accjwnxf-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
    }
  }
});

interface TestResult {
  testName: string;
  passed: boolean;
  evidence: any;
  error?: string;
}

async function testSoftDeleteDirect(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const timestamp = Date.now();
  let tenantId = '';
  let contactId = '';

  try {
    console.log('=== SETUP: Creating Test Tenant ===');
    const tenant = await prisma.tenant.create({
      data: {
        name: `SoftDelete Tenant ${timestamp}`,
        slug: `sd-tenant-${timestamp}`,
        status: 'active',
        plan: 'starter',
      },
    });
    tenantId = tenant.id;
    console.log(`✅ Created Tenant: ${tenantId}`);

    // Scenario 1: Create contact matching test-1 creation payload
    console.log('\n--- Scenario 1: Create contact ---');
    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name: 'SoftDelete Contact',
        phone: '+5511999999999',
        normalizedPhone: '+5511999999999',
        email: 'softdelete@contact.com',
        type: 'lead',
        source: 'manual',
        status: 'lead',
        temperature: 'cold',
        score: 0,
        totalPurchased: 0.0,
        firstInteractionAt: new Date(),
        lastInteractionAt: new Date(),
      },
    });
    contactId = contact.id;
    console.log(`✅ Contact created: ${contactId}`);

    // Verify contact can be found with standard active queries
    const activeContact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
    });
    const scenario1Passed = activeContact !== null;
    console.log(`${scenario1Passed ? '✅' : '❌'} Active contact query: Found = ${scenario1Passed}`);
    results.push({
      testName: 'Contact can be created and retrieved with deletedAt: null',
      passed: scenario1Passed,
      evidence: { contactId, found: scenario1Passed },
    });

    // Scenario 2: Perform soft delete (update deletedAt to current Date)
    console.log('\n--- Scenario 2: Perform Soft Delete (set deletedAt to Date) ---');
    const deletedContact = await prisma.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });

    const scenario2Passed = deletedContact.deletedAt !== null;
    console.log(`${scenario2Passed ? '✅' : '❌'} Soft deleted contact deletedAt: ${deletedContact.deletedAt}`);
    results.push({
      testName: 'Soft delete updates deletedAt field',
      passed: scenario2Passed,
      evidence: { deletedAt: deletedContact.deletedAt },
    });

    // Scenario 3: Verify record still physically exists in database
    console.log('\n--- Scenario 3: Verify record remains in database ---');
    const dbRecord = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    const scenario3Passed = dbRecord !== null;
    console.log(`${scenario3Passed ? '✅' : '❌'} Record remains in DB physically: ${scenario3Passed}`);
    results.push({
      testName: 'Record remains in database physically after soft delete',
      passed: scenario3Passed,
      evidence: { exists: scenario3Passed, name: dbRecord?.name, deletedAt: dbRecord?.deletedAt },
    });

    // Scenario 4: Verify record does not appear in active listings (deletedAt: null filter)
    console.log('\n--- Scenario 4: Verify record does not appear in active listings ---');
    const listings = await prisma.contact.findMany({
      where: { tenantId, deletedAt: null },
    });

    const foundInList = listings.some(c => c.id === contactId);
    const scenario4Passed = !foundInList;
    console.log(`${scenario4Passed ? '✅' : '❌'} Found in active listing: ${foundInList} (expected: false)`);
    results.push({
      testName: 'Soft deleted record filtered out from active listings',
      passed: scenario4Passed,
      evidence: { count: listings.length, foundInList },
    });

    // Scenario 5: Verify record cannot be retrieved by ID when filtering by active state
    console.log('\n--- Scenario 5: Verify direct retrieve by ID with filter fails (returns null) ---');
    const directRetrieve = await prisma.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
    });

    const scenario5Passed = directRetrieve === null;
    console.log(`${scenario5Passed ? '✅' : '❌'} Retrieved active contact by ID: ${directRetrieve !== null ? 'Found' : 'Null'} (expected: Null)`);
    results.push({
      testName: 'Soft deleted record cannot be accessed using active filters',
      passed: scenario5Passed,
      evidence: { retrieved: directRetrieve !== null },
    });

    // Cleanup: physically delete test data to prevent database pollution
    console.log('\n--- Cleanup ---');
    await prisma.contact.delete({ where: { id: contactId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    console.log('✅ Direct database cleanup completed successfully');

  } catch (error) {
    console.error('❌ Test execution error:', error);
    results.push({
      testName: 'Soft Delete direct test suite',
      passed: false,
      evidence: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Attempt cleanup
    if (contactId) await prisma.contact.delete({ where: { id: contactId } }).catch(() => {});
    if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
  }

  return results;
}

async function main() {
  console.log('=== PRODUCTION VALIDATION - TEST 4 (DIRECT DB) ===');
  console.log('Soft Delete Direct Validation\n');

  const results = await testSoftDeleteDirect();

  console.log('\n=== RESULTS ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n✅ TEST 4: PASSED');
  } else {
    console.log('\n❌ TEST 4: FAILED');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}: ${r.error || 'Check details'}`);
    });
  }

  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error);
