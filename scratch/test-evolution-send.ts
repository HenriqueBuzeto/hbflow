import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

// Load .env from the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testSend() {
  const url = process.env.WHATSAPP_QR_GATEWAY_BASE_URL || 'http://localhost:8085';
  const apiKey = process.env.WHATSAPP_QR_GATEWAY_API_KEY || 'global_key';
  const instanceName = 'inst-fa68f86c-1781480539567'; // active connected instance
  
  const cleanPhone = '5517991317468';
  const body = 'Teste de envio corrigido (text no root)';

  const endpoint = `${url}/message/sendText/${instanceName}`;
  console.log(`Sending to endpoint: ${endpoint}`);
  console.log(`ApiKey: ${apiKey}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: body,
        options: {
          delay: 1200,
          presence: 'composing'
        }
      })
    });

    console.log(`Response Status: ${response.status}`);
    console.log(`Response OK: ${response.ok}`);
    
    const text = await response.text();
    console.log(`Raw Response: ${text}`);
  } catch (err: any) {
    console.error("Fetch error:", err);
  }
}

testSend();
