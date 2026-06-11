const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testListEndpoint() {
  try {
    // First login to get token
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'usera-1781098983664@test.com',
        password: 'Password123!',
      }),
    });
    
    if (!loginResponse.ok) {
      console.log('Login failed:', await loginResponse.text());
      return;
    }
    
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    const cookies = {};
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
    
    const token = cookies.accessToken;
    console.log('Token extracted:', token ? 'Yes' : 'No');
    
    // Test list endpoint
    const listResponse = await fetch('http://localhost:3000/api/contacts', {
      headers: {
        'Cookie': 'accessToken=' + token,
      },
    });
    
    console.log('List response status:', listResponse.status);
    const listData = await listResponse.json();
    console.log('List response:', JSON.stringify(listData, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testListEndpoint();
