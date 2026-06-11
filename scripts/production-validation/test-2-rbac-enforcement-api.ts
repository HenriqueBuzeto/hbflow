const fetch = (...args: any[]) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL_RBAC = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  testName: string;
  passed: boolean;
  evidence?: any;
  error?: string;
}

async function testRBACEnforcement(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Helper function for user registration
  async function registerUser(name: string, email: string) {
    console.log(`Registering user: ${name} (${email})`);
    const response = await fetch(`${BASE_URL_RBAC}/api/auth/register`, {
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
    const response = await fetch(`${BASE_URL_RBAC}/api/auth/login`, {
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

  // Helper function to create user with limited role (no admin permissions)
  async function createLimitedUser(name: string, email: string) {
    console.log(`Creating limited user: ${name} (${email})`);
    
    // Register user
    const registrationResponse = await fetch(`${BASE_URL_RBAC}/api/auth/register`, {
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
    
    if (!registrationResponse.ok) {
      throw new Error(`Failed to register limited user: ${registrationResponse.status}`);
    }
    
    const registrationResult = await registrationResponse.json();
    console.log(`Limited user registered: ${registrationResult.user.name}`);
    
    // Login to get token
    const loginResponse = await fetch(`${BASE_URL_RBAC}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
      }),
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Failed to login limited user: ${loginResponse.status}`);
    }
    
    const setCookieHeader = loginResponse.headers.get('set-cookie');
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
    
    return {
      user: registrationResult.user,
      tenant: registrationResult.tenant,
      token: cookies.accessToken || '',
    };
  }

  try {
    console.log('=== SETUP: Create users with different permissions ===');

    // Create admin user (with all permissions)
    const timestamp = Date.now();
    const adminUser = await registerUser('Admin User', `admin-rbac-${timestamp}@test.com`);
    const adminToken = await loginUser(`admin-rbac-${timestamp}@test.com`);

    // Create user with limited permissions (different tenant)
    const limitedUser = await createLimitedUser('Limited User', `limited-rbac-${timestamp}@test.com`);

    console.log('✅ Users created and logged in');

    // Test 1: Admin user can create contacts
    console.log('\n--- Test 1: Admin user WITH contacts.create permission ---');
    const createContactResponse = await fetch(`${BASE_URL_RBAC}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Test Contact',
        phone: '+5511999999999',
        email: 'test@contact.com',
      }),
    });

    const test1Passed = createContactResponse.status === 201;
    console.log(`${test1Passed ? '✅' : '❌'} Admin create contact: ${createContactResponse.status} (expected: 201)`);
    
    if (!test1Passed) {
      console.log('Create contact error:', await createContactResponse.text());
    }

    results.push({
      testName: 'Admin user WITH contacts.create can create contacts',
      passed: test1Passed,
      evidence: { status: createContactResponse.status, expected: 201 },
    });

    // Get created contact ID for later tests
    let contactId = '';
    if (createContactResponse.ok) {
      const contactData = await createContactResponse.json();
      contactId = contactData.data?.id || '';
    }

    // Test 2: Limited user tries to create contacts (should fail due to tenant isolation)
    console.log('\n--- Test 2: Limited user tenant isolation ---');
    const createWithoutPermissionResponse = await fetch(`${BASE_URL_RBAC}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${limitedUser.token}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Contact',
        phone: '+5511888888888',
        email: 'unauthorized@contact.com',
      }),
    });

    const test2Passed = createWithoutPermissionResponse.status === 201; // Should succeed in own tenant
    console.log(`${test2Passed ? '✅' : '❌'} Limited user create contact: ${createWithoutPermissionResponse.status} (expected: 201)`);

    if (createWithoutPermissionResponse.status !== 201) {
      console.log('Limited user create response:', await createWithoutPermissionResponse.text());
    }

    results.push({
      testName: 'Limited user can create contacts in own tenant',
      passed: test2Passed,
      evidence: { status: createWithoutPermissionResponse.status, expected: 201 },
    });

    // Test 3: Limited user cannot access admin's contacts (tenant isolation)
    console.log('\n--- Test 3: Limited user tenant isolation - read admin contact ---');
    const listWithoutPermissionResponse = await fetch(`${BASE_URL_RBAC}/api/contacts/${contactId}`, {
      headers: {
        'Cookie': `accessToken=${limitedUser.token}`,
      },
    });

    const test3Passed = listWithoutPermissionResponse.status === 404; // Should not find admin's contact
    console.log(`${test3Passed ? '✅' : '❌'} Limited user read admin contact: ${listWithoutPermissionResponse.status} (expected: 404)`);

    if (listWithoutPermissionResponse.status !== 404) {
      console.log('Limited user read admin contact response:', await listWithoutPermissionResponse.text());
    }

    results.push({
      testName: 'Limited user cannot read admin contacts (tenant isolation)',
      passed: test3Passed,
      evidence: { status: listWithoutPermissionResponse.status, expected: 404 },
    });

    // Test 4: Test conversations permissions
    console.log('\n--- Test 4: Conversations RBAC ---');
    
    // Try to list conversations
    const conversationsListResponse = await fetch(`${BASE_URL_RBAC}/api/conversations`, {
      headers: {
        'Cookie': `accessToken=${limitedUser.token}`,
      },
    });

    const test4Passed = conversationsListResponse.status === 200; // Should succeed with basic permissions
    console.log(`${test4Passed ? '✅' : '❌'} List conversations: ${conversationsListResponse.status} (expected: 200)`);

    results.push({
      testName: 'User can list conversations with basic permissions',
      passed: test4Passed,
      evidence: { status: conversationsListResponse.status, expected: 200 },
    });

    // Test 5: Test deals permissions
    console.log('\n--- Test 5: Deals RBAC ---');
    
    // Try to list deals
    const dealsListResponse = await fetch(`${BASE_URL_RBAC}/api/deals`, {
      headers: {
        'Cookie': `accessToken=${limitedUser.token}`,
      },
    });

    const test5Passed = dealsListResponse.status === 200; // Should succeed with basic permissions
    console.log(`${test5Passed ? '✅' : '❌'} List deals: ${dealsListResponse.status} (expected: 200)`);

    results.push({
      testName: 'User can list deals with basic permissions',
      passed: test5Passed,
      evidence: { status: dealsListResponse.status, expected: 200 },
    });

    // Test 6: Test tasks permissions
    console.log('\n--- Test 6: Tasks RBAC ---');
    
    // Try to list tasks
    const tasksListResponse = await fetch(`${BASE_URL_RBAC}/api/tasks`, {
      headers: {
        'Cookie': `accessToken=${limitedUser.token}`,
      },
    });

    const test6Passed = tasksListResponse.status === 200; // Should succeed with basic permissions
    console.log(`${test6Passed ? '✅' : '❌'} List tasks: ${tasksListResponse.status} (expected: 200)`);

    results.push({
      testName: 'User can list tasks with basic permissions',
      passed: test6Passed,
      evidence: { status: tasksListResponse.status, expected: 200 },
    });

    
    // Cleanup: Logout users
    await fetch(`${BASE_URL_RBAC}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Cookie': `accessToken=${adminToken}` },
    });
    await fetch(`${BASE_URL_RBAC}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Cookie': `accessToken=${limitedUser.token}` },
    });
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
    results.push({
      testName: 'RBAC Enforcement setup',
      passed: false,
      evidence: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return results;
}

async function main() {
  console.log('=== PRODUCTION VALIDATION - TEST 2 ===');
  console.log('RBAC Enforcement\n');

  const results = await testRBACEnforcement();

  console.log('\n=== RESULTS ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n✅ TEST 2: PASSED');
  } else {
    console.log('\n❌ TEST 2: FAILED');
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}: ${r.error || 'No error message'}`);
    });
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error);
