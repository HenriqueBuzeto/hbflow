import dns from 'dns';
import { promisify } from 'util';
import https from 'https';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

async function testFetch(url: string, family?: number) {
  return new Promise((resolve) => {
    const options: https.RequestOptions = {};
    if (family) {
      options.family = family;
    }
    
    console.log(`\nTesting connection to ${url} (IPv${family || 'Default'})...`);
    
    const req = https.get(url, options, (res) => {
      console.log(`Response: ${res.statusCode} ${res.statusMessage}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.error(`Error:`, err.message);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.error(`Timeout (5s) reached`);
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const domain = 'hbflow.vercel.app';
  console.log(`=== DNS DIAGNOSTICS FOR: ${domain} ===`);
  
  try {
    const ipv4 = await resolve4(domain);
    console.log(`Resolved IPv4 Addresses:`, ipv4);
  } catch (err: any) {
    console.error(`IPv4 Resolution failed:`, err.message);
  }

  try {
    const ipv6 = await resolve6(domain);
    console.log(`Resolved IPv6 Addresses:`, ipv6);
  } catch (err: any) {
    console.warn(`IPv6 Resolution failed/not found:`, err.message);
  }

  // Enforce native fetch
  try {
    console.log(`\nTesting native fetch to https://${domain}/api/webhooks/whatsapp/qr ...`);
    const res = await fetch(`https://${domain}/api/webhooks/whatsapp/qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log(`Native fetch response status: ${res.status}`);
  } catch (err: any) {
    console.error(`Native fetch failed:`, err.message);
  }

  // Test https module (Default)
  await testFetch(`https://${domain}/`);
  
  // Test https module (IPv4 Enforced)
  await testFetch(`https://${domain}/`, 4);
}

main().catch(console.error);
