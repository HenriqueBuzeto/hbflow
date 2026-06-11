const fetch = (...args: any[]) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL_CONCURRENCY = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  testName: string;
  passed: boolean;
  evidence?: any;
  error?: string;
}

async function testConcurrencyScenarios(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Helper function for user registration
  async function registerUser(name: string, email: string) {
    console.log(`Registering user: ${name} (${email})`);
    const response = await fetch(`${BASE_URL_CONCURRENCY}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantName: `Test Tenant ${name}`,
        tenantSlug: `test-tenant-${name.toLowerCase().replace(' ', '-')}-${Date.now()}`,
        userName: name,
        userEmail: email,
        userPassword: 'Password123!',
      }),
    });
    
    console.log(`Registration response status: ${response.status}`);
    
    const result = await response.json();
    console.log('Registration result:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.log('Registration error:', result);
    }
    
    return result;
  }

  // Helper function for user login
  async function loginUser(email: string) {
    console.log(`Logging in user: ${email}`);
    const response = await fetch(`${BASE_URL_CONCURRENCY}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
      }),
    });

    console.log(`Login response status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Login error for ${email}:`, errorText);
      throw new Error(`Login failed for ${email}: ${response.status}`);
    }

    const setCookieHeader = response.headers.get('set-cookie');
    const cookies: { [key: string]: string } = {};
    if (setCookieHeader) {
      const cookieStrings = setCookieHeader.split(', ');
      cookieStrings.forEach(cookieString => {
        const cookieParts = cookieString.split(';')[0];
        const [name, value] = cookieParts.split('=');
        if (name && value) {
          cookies[name] = value;
        }
      });
    }

    return cookies.accessToken || '';
  }

  // Helper function to create contact
  async function createContact(token: string, name: string) {
    const response = await fetch(`${BASE_URL_CONCURRENCY}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${token}`,
      },
      body: JSON.stringify({
        name,
        phone: `+551199999${Math.random().toString().slice(2, 6)}`,
        email: `${name.toLowerCase().replace(' ', '').replace(/[^a-z0-9]/g, '')}@test.com`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Contact creation error details:', errorText);
      throw new Error(`Failed to create contact: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.data;
  }

  // Helper function to create conversation
  async function createConversation(token: string, contactId: string) {
    const response = await fetch(`${BASE_URL_CONCURRENCY}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${token}`,
      },
      body: JSON.stringify({
        contactId,
        status: 'active',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Conversation creation error details:', errorText);
      throw new Error(`Failed to create conversation: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.data;
  }

  try {
    console.log('=== SETUP: Create users for concurrency testing ===');

    // Create single user for concurrency testing
    const timestamp = Date.now();
    const user = await registerUser('Concurrency Agent', `agent-${timestamp}@test.com`);
    const token = await loginUser(`agent-${timestamp}@test.com`);

    console.log('✅ Users created and logged in');

    // Test 1: Create contact and conversation for testing
    console.log('\n--- Test 1: Setup - Create contact and conversation ---');
    const contact = await createContact(token, 'Test Contact for Concurrency');
    const conversation = await createConversation(token, contact.id);
    
    console.log(`✅ Created contact: ${contact.id}`);
    console.log(`✅ Created conversation: ${conversation.id}`);

    results.push({
      testName: 'Setup - Create contact and conversation',
      passed: true,
      evidence: { contactId: contact.id, conversationId: conversation.id },
    });

    // Test 2: Concurrent claim attempts - only one should succeed
    console.log('\n--- Test 2: Concurrent conversation claim attempts ---');
    
    // Get user ID from the logged in user for assignment
    const userInfoResponse = await fetch(`${BASE_URL_CONCURRENCY}/api/auth/me`, {
      headers: {
        'Cookie': `accessToken=${token}`,
      },
    });
    
    let userId = '';
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      userId = userInfo.user?.id || '';
      console.log(`User ID for claim: ${userId}`);
    }
    
    const claimPromises = [
      fetch(`${BASE_URL_CONCURRENCY}/api/conversations/${conversation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `accessToken=${token}`,
        },
        body: JSON.stringify({
          assignedUserId: userId,
        }),
      }),
      fetch(`${BASE_URL_CONCURRENCY}/api/conversations/${conversation.id}`, {
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
        console.log(`Claim response headers:`, response.headers.get('content-type'));
        
        let responseData;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          const responseText = await response.text();
          console.log(`Claim response text (first 200 chars):`, responseText.substring(0, 200));
          claimResultsData.push({
            status: response.status,
            error: `JSON parse error: ${(jsonError as Error).message}`,
            responseText: responseText.substring(0, 200),
          });
          continue;
        }
        
        claimResultsData.push({
          status: response.status,
          data: responseData,
        });
        
        if (response.status === 200) {
          successCount++;
        } else if (response.status === 409) {
          conflictCount++;
        }
      } else {
        claimResultsData.push({
          status: 'error',
          error: result.reason,
        });
      }
    }

    console.log(`Claim results: ${successCount} successful, ${conflictCount} conflicts`);
    console.log('Claim results data:', JSON.stringify(claimResultsData, null, 2));

    // Validate that only one claim succeeded
    const test2Passed = successCount === 1 && conflictCount === 1;
    console.log(`${test2Passed ? '✅' : '❌'} Concurrent claim validation: ${successCount} success, ${conflictCount} conflicts (expected: 1 success, 1 conflict)`);

    results.push({
      testName: 'Concurrent conversation claim - only one succeeds',
      passed: test2Passed,
      evidence: { successCount, conflictCount, claimResultsData },
    });

    // Test 3: Verify conversation is assigned to the winner
    console.log('\n--- Test 3: Verify conversation assignment ---');
    
    const conversationCheckResponse = await fetch(`${BASE_URL_CONCURRENCY}/api/conversations/${conversation.id}`, {
      headers: {
        'Cookie': `accessToken=${token}`,
      },
    });

    if (conversationCheckResponse.ok) {
      const conversationData = await conversationCheckResponse.json();
      const assignedUserId = conversationData.data?.responsibleUserId;
      const hasAssignment = !!assignedUserId;
      
      console.log(`Conversation assigned to: ${assignedUserId}`);
      console.log(`Has assignment: ${hasAssignment}`);

      const test3Passed = hasAssignment;
      console.log(`${test3Passed ? '✅' : '❌'} Conversation has assignment: ${hasAssignment} (expected: true)`);

      results.push({
        testName: 'Conversation assigned to claim winner',
        passed: test3Passed,
        evidence: { assignedUserId, hasAssignment },
      });
    } else {
      console.log('❌ Failed to check conversation assignment');
      results.push({
        testName: 'Conversation assigned to claim winner',
        passed: false,
        evidence: null,
        error: 'Failed to check conversation assignment',
      });
    }

    // Test 4: Second agent cannot claim already claimed conversation
    console.log('\n--- Test 4: Second agent cannot claim claimed conversation ---');
    
    const secondClaimResponse = await fetch(`${BASE_URL_CONCURRENCY}/api/conversations/${conversation.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${token}`,
      },
      body: JSON.stringify({
        assignedUserId: userId,
      }),
    });

    const test4Passed = secondClaimResponse.status === 409;
    console.log(`${test4Passed ? '✅' : '❌'} Second claim attempt: ${secondClaimResponse.status} (expected: 409)`);

    if (secondClaimResponse.status !== 409) {
      console.log('Second claim response:', await secondClaimResponse.text());
    }

    results.push({
      testName: 'Second agent cannot claim claimed conversation',
      passed: test4Passed,
      evidence: { status: secondClaimResponse.status, expected: 409 },
    });

    // Test 5: Create multiple conversations and test concurrent claims
    console.log('\n--- Test 5: Multiple conversations concurrent claims ---');
    
    // Create 3 more conversations
    const conversations = [];
    for (let i = 0; i < 3; i++) {
      const newContact = await createContact(token, `Contact ${i + 2}`);
      const newConversation = await createConversation(token, newContact.id);
      conversations.push(newConversation);
    }

    console.log(`✅ Created ${conversations.length} additional conversations`);

    // Test concurrent claims on multiple conversations
    const multiClaimPromises: Promise<any>[] = [];
    
    conversations.forEach((conv, index) => {
      // Each conversation gets 2 concurrent claim attempts
      multiClaimPromises.push(
        fetch(`${BASE_URL_CONCURRENCY}/api/conversations/${conv.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${token}`,
          },
          body: JSON.stringify({
            assignedUserId: userId,
          }),
        })
      );
      
      multiClaimPromises.push(
        fetch(`${BASE_URL_CONCURRENCY}/api/conversations/${conv.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `accessToken=${token}`,
          },
          body: JSON.stringify({
            assignedUserId: userId,
          }),
        })
      );
    });

    const multiClaimResults = await Promise.allSettled(multiClaimPromises);
    
    let multiSuccessCount = 0;
    let multiConflictCount = 0;

    for (const result of multiClaimResults) {
      if (result.status === 'fulfilled') {
        const response = result.value;
        if (response.status === 200) {
          multiSuccessCount++;
        } else if (response.status === 409) {
          multiConflictCount++;
        }
      }
    }

    console.log(`Multi-conversation claims: ${multiSuccessCount} successful, ${multiConflictCount} conflicts`);

    // Expected: 3 successful claims (one per conversation), 3 conflicts
    const test5Passed = multiSuccessCount === 3 && multiConflictCount === 3;
    console.log(`${test5Passed ? '✅' : '❌'} Multi-concurrent claims: ${multiSuccessCount} success, ${multiConflictCount} conflicts (expected: 3 success, 3 conflict)`);

    results.push({
      testName: 'Multiple conversations concurrent claims',
      passed: test5Passed,
      evidence: { successCount: multiSuccessCount, conflictCount: multiConflictCount, conversationCount: conversations.length },
    });

    // Cleanup: Logout users
    await fetch(`${BASE_URL_CONCURRENCY}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Cookie': `accessToken=${token}` },
    });
    await fetch(`${BASE_URL_CONCURRENCY}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Cookie': `accessToken=${token}` },
    });
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
    results.push({
      testName: 'Concurrency Scenarios setup',
      passed: false,
      evidence: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return results;
}

async function main() {
  console.log('=== PRODUCTION VALIDATION - TEST 3 ===');
  console.log('Concurrency Scenarios\n');

  const results = await testConcurrencyScenarios();

  console.log('\n=== RESULTS ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n✅ TEST 3: PASSED');
  } else {
    console.log('\n❌ TEST 3: FAILED');
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}: ${r.error || 'No error message'}`);
    });
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error);
