const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testMultipleListCalls() {
  try {
    // Login
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'usera-1781099814299@test.com',
        password: 'Password123!',
      }),
    });
    
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
    
    // Test multiple list calls in sequence
    for (let i = 1; i <= 3; i++) {
      console.log(`\n--- List call ${i} ---`);
      const listResponse = await fetch('http://localhost:3000/api/contacts', {
        headers: {
          'Cookie': 'accessToken=' + token,
        },
      });
      
      console.log(`List response ${i} status:`, listResponse.status);
      if (listResponse.ok) {
        const listData = await listResponse.json();
        console.log(`List response ${i} count:`, listData.data?.items?.length || 0);
      } else {
        console.log(`List response ${i} error:`, await listResponse.text());
      }
      
      // Wait a bit between calls
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMultipleListCalls();
