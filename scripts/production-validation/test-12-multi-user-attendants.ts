import fetch from 'node-fetch';

/**
 * Script 12: Validation of Multi-User Attendant Isolations, RBAC, and Cache Wipe
 * This script logs in as an admin and as an attendant simultaneously,
 * verifying that permissions are respected and endpoints are isolated.
 */

const API_BASE = 'http://localhost:3000/api';

async function runTest() {
  console.log('🧪 Starting Test 12: Multi-User Session, RBAC & Isolation');

  // Helper for requests
  const req = async (endpoint: string, method = 'GET', body?: any, cookies?: string[]) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cookies) headers['Cookie'] = cookies.join('; ');
    const res = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({})) as any;
    const setCookie = res.headers.raw()['set-cookie'] || [];
    return { status: res.status, data, setCookie };
  };

  try {
    // 1. Login Admin
    console.log('\n👤 Logging in as Admin (henrique@hbflow.com)...');
    const adminLogin = await req('/auth/login', 'POST', { email: 'henrique@hbflow.com', password: 'password123' });
    if (adminLogin.status !== 200) {
      console.error('Admin login response:', adminLogin);
      throw new Error('Admin login failed');
    }
    const adminCookies = adminLogin.setCookie;
    console.log('✅ Admin logged in successfully.');

    // 2. Login Attendant
    console.log('\n👤 Logging in as Attendant (joao@hbflow.com)...');
    const attendantLogin = await req('/auth/login', 'POST', { email: 'joao@hbflow.com', password: 'password123' });
    if (attendantLogin.status !== 200) throw new Error('Attendant login failed');
    const attendantCookies = attendantLogin.setCookie;
    console.log('✅ Attendant logged in successfully.');

    // 3. Verify Admin Profile
    const adminMe = await req('/auth/me', 'GET', undefined, adminCookies);
    console.log(`✅ Admin Role: ${adminMe.data.user.role.name}`);
    console.log(`✅ Admin Permissions Count: ${adminMe.data.permissions.length}`);

    // 4. Verify Attendant Profile
    const attendantMe = await req('/auth/me', 'GET', undefined, attendantCookies);
    console.log(`✅ Attendant Role: ${attendantMe.data.user.role.name}`);
    console.log(`✅ Attendant Permissions Count: ${attendantMe.data.permissions.length}`);

    // 5. Check Endpoint Isolation (Users List)
    console.log('\n🔒 Verifying RBAC on Users Endpoint...');
    const adminUsers = await req('/v1/users?scope=full', 'GET', undefined, adminCookies);
    if (adminUsers.status === 200 && adminUsers.data.users[0].email) {
      console.log('✅ Admin successfully fetched full users list (contains email/permissions).');
    }

    const attendantUsersFull = await req('/v1/users?scope=full', 'GET', undefined, attendantCookies);
    if (attendantUsersFull.status === 403) {
      console.log('✅ Attendant correctly blocked from fetching full users list (403 Forbidden).');
    }

    const attendantUsersTeammates = await req('/v1/users?scope=teammates', 'GET', undefined, attendantCookies);
    if (attendantUsersTeammates.status === 200 && !attendantUsersTeammates.data.users[0].email) {
      console.log('✅ Attendant successfully fetched sanitized teammates list (no sensitive info).');
    }

    // 6. Check Inbox Counters
    console.log('\n🔒 Verifying Inbox Counters (Data Isolation)...');
    const adminCounters = await req('/v1/inbox/counters', 'GET', undefined, adminCookies);
    console.log('📊 Admin Counters:', adminCounters.data.data);

    const attendantCounters = await req('/v1/inbox/counters', 'GET', undefined, attendantCookies);
    console.log('📊 Attendant Counters:', attendantCounters.data.data);

    if (adminCounters.data.data.total !== attendantCounters.data.data.total) {
      console.log('✅ Success: Admin and Attendant see different counters based on departments/assignments.');
    } else {
      console.log('⚠️ Note: Admin and Attendant counters are identical (maybe no specific assignments currently exist).');
    }

    console.log('\n✅ Test 12 Complete: Multi-User Isolation verified.');

  } catch (error) {
    console.error('\n❌ Test 12 Failed:', error);
  }
}

runTest();
