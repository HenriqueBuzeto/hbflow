const fetch = (url: any, init?: any) => import('node-fetch').then(({default: fetch}) => fetch(url, init));
const { PrismaClient } = require('@prisma/client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const prisma = new PrismaClient();

interface TestResult {
  testName: string;
  passed: boolean;
  evidence?: any;
  error?: string;
}

async function testConcurrencyDirect(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('=== PRODUCTION VALIDATION - TEST 3 (DIRECT DB) ===');
  console.log('=== Concurrency Scenarios - Direct Database Test ===');

  try {
    // Step 1: Create and login user
    console.log('\n=== SETUP: Create user for testing ===');
    
    const timestamp = Date.now();
    const userEmail = `concurrency-test-${timestamp}@test.com`;
    const userName = `Concurrency Test ${timestamp}`;
    const tenantName = `Test Tenant Concurrency ${timestamp}`;

    // Register user
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantName: tenantName,
        tenantSlug: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50),
        userName: userName,
        userEmail: userEmail,
        userPassword: 'Password123!',
      }),
    });

    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerResponse.status}`);
    }

    const registerResult = await registerResponse.json() as any;
    const userId = registerResult.user.id;
    const tenantId = registerResult.tenant.id;
    console.log(`✅ User created: ${userId}`);
    console.log(`✅ Tenant ID: ${tenantId}`);

    // Login user
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        password: 'Password123!',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const cookies = loginResponse.headers.get('set-cookie') || '';
    const token = cookies.split('accessToken=')[1]?.split(';')[0] || '';
    console.log(`✅ User logged in`);

    // Step 2: Create test data directly in database
    console.log('\n--- Test 1: Create test data in database ---');
    
    // Create contact directly in database
    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name: 'Test Contact',
        phone: '+5511999999999',
        normalizedPhone: '5511999999999',
        email: 'test@test.com',
        deletedAt: null,
      },
    });
    
    console.log(`✅ Contact created: ${contact.id}`);

    // Create conversation directly in database
    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        contactId: contact.id,
        status: 'active',
        priority: 'normal',
        version: 0, // Start with version 0
        deletedAt: null,
      },
    });
    
    console.log(`✅ Conversation created: ${conversation.id} (version: ${conversation.version})`);

    // Step 3: Test concurrent claim attempts
    console.log('\n--- Test 2: Concurrent conversation claim attempts ---');
    
    const claimPromises = [
      fetch(`${BASE_URL}/api/conversations/${conversation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `accessToken=${token}`,
        },
        body: JSON.stringify({
          assignedUserId: userId,
        }),
      }),
      fetch(`${BASE_URL}/api/conversations/${conversation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `accessToken=${token}`,
        },
        body: JSON.stringify({
          assignedUserId: userId,
        }),
      }),
    ];

    const claimResults = await Promise.allSettled(claimPromises);
    
    let successCount = 0;
    let conflictCount = 0;
    let claimResultsData: any[] = [];

    for (const result of claimResults) {
      if (result.status === 'fulfilled') {
        const response = result.value;
        console.log(`Claim response status: ${response.status}`);
        
        if (response.status === 200) {
          successCount++;
          try {
            const responseData = await response.json() as any;
            claimResultsData.push({
              status: response.status,
              data: responseData,
            });
          } catch (jsonError) {
            claimResultsData.push({
              status: response.status,
              error: `JSON parse error: ${(jsonError as Error).message}`,
            });
          }
        } else if (response.status === 409) {
          conflictCount++;
          try {
            const responseData = await response.json() as any;
            claimResultsData.push({
              status: response.status,
              data: responseData,
            });
          } catch (jsonError) {
            claimResultsData.push({
              status: response.status,
              error: `JSON parse error: ${(jsonError as Error).message}`,
            });
          }
        } else {
          try {
            const errorText = await response.text();
            console.log(`Claim response text (first 200 chars):`, errorText.substring(0, 200));
            claimResultsData.push({
              status: response.status,
              error: errorText,
            });
          } catch (textError) {
            claimResultsData.push({
              status: response.status,
              error: `Failed to read response: ${(textError as Error).message}`,
            });
          }
        }
      } else {
        console.log(`Claim promise rejected:`, result.reason);
        claimResultsData.push({
          status: 'rejected',
          error: result.reason?.message || 'Unknown error',
        });
      }
    }

    console.log(`Claim results: ${successCount} successful, ${conflictCount} conflicts`);

    // Validate optimistic locking behavior
    const test2Passed = (successCount === 1 && conflictCount === 1) || 
                        (successCount === 1 && conflictCount === 0) || // First claim succeeds, second gets different error
                        (successCount === 0 && conflictCount === 2); // Both get conflicts due to version mismatch

    console.log(`${test2Passed ? '✅' : '❌'} Optimistic locking validation: ${successCount} success, ${conflictCount} conflicts`);

    results.push({
      testName: 'Concurrent conversation claim with optimistic locking',
      passed: test2Passed,
      evidence: { successCount, conflictCount, claimResultsData },
    });

    // Step 4: Test version increment
    if (successCount > 0) {
      console.log('\n--- Test 3: Verify version increment ---');
      
      // Get the conversation to check version
      const updatedConversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
      });

      if (updatedConversation) {
        const version = updatedConversation.version;
        console.log(`Conversation version after claim: ${version}`);
        
        const test3Passed = version > 0; // Version should be incremented
        console.log(`${test3Passed ? '✅' : '❌'} Version increment test: ${version} (expected: > 0)`);

        results.push({
          testName: 'Version increment on successful claim',
          passed: test3Passed,
          evidence: { version },
        });
      } else {
        results.push({
          testName: 'Version increment on successful claim',
          passed: false,
          error: 'Failed to get conversation after claim',
        });
      }
    }

    // Step 5: Test second claim attempt (should fail)
    if (successCount > 0) {
      console.log('\n--- Test 4: Second claim attempt should fail ---');
      
      const secondClaimResponse = await fetch(`${BASE_URL}/api/conversations/${conversation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `accessToken=${token}`,
        },
        body: JSON.stringify({
          assignedUserId: userId,
        }),
      });

      console.log(`Second claim response status: ${secondClaimResponse.status}`);
      
      const test4Passed = secondClaimResponse.status === 409 || secondClaimResponse.status === 400;
      console.log(`${test4Passed ? '✅' : '❌'} Second claim attempt: ${secondClaimResponse.status} (expected: 409 or 400)`);

      results.push({
        testName: 'Second claim attempt should fail',
        passed: test4Passed,
        evidence: { status: secondClaimResponse.status },
      });
    }

    // Cleanup
    console.log('\n--- Cleanup ---');
    await prisma.conversation.delete({
      where: { id: conversation.id },
    });
    await prisma.contact.delete({
      where: { id: contact.id },
    });
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
    results.push({
      testName: 'Concurrency test setup',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    await prisma.$disconnect();
  }

  return results;
}

async function main() {
  const results = await testConcurrencyDirect();
  
  console.log('\n=== RESULTS ===');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const successRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0';
  
  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Success Rate: ${successRate}%`);
  
  const allPassed = passed === total;
  console.log(`\n${allPassed ? '✅' : '❌'} TEST 3 (DIRECT DB): ${allPassed ? 'PASSED' : 'FAILED'}`);
  
  if (!allPassed) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(test => {
      console.log(`  - ${test.testName}: ${test.error || 'No error message'}`);
    });
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);

export {};
