import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { prisma } from '../src/server/db/prisma';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const url = process.env.WHATSAPP_QR_GATEWAY_BASE_URL || 'http://localhost:8085';
  const apiKey = process.env.WHATSAPP_QR_GATEWAY_API_KEY || 'global_key';
  const instanceName = 'inst-fa68f86c-1781480539567'; // active connected instance
  
  // Find a webhook event containing an image message key to test
  const event = await prisma.whatsappWebhookEvent.findFirst({
    where: {
      eventType: {
        in: ['messages.upsert', 'MESSAGES_UPSERT']
      },
      payloadJson: {
        contains: 'imageMessage'
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!event) {
    console.error("No image message webhook event found in database.");
    return;
  }

  const payload = JSON.parse(event.payloadJson);
  const messageId = payload.data?.key?.id;

  if (!messageId) {
    console.error("No message key ID found in the last webhook event.");
    return;
  }

  const endpoint = `${url}/chat/getBase64FromMediaMessage/${instanceName}`;
  console.log(`Querying endpoint: ${endpoint}`);
  console.log(`Message ID: ${messageId}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          key: {
            id: messageId
          }
        },
        convertToMp4: false
      })
    });

    console.log(`Response Status: ${response.status}`);
    const text = await response.text();
    console.log(`Raw Response (first 300 chars):`, text.substring(0, 300));
    
    try {
      const data = JSON.parse(text);
      console.log(`Keys of parsed JSON:`, Object.keys(data));
      if (data.base64) {
        console.log(`Found data.base64 (first 100 chars):`, data.base64.substring(0, 100));
        console.log(`data.base64 length:`, data.base64.length);
      }
    } catch (e) {
      console.error("Failed to parse response as JSON");
    }
  } catch (err: any) {
    console.error("Fetch error:", err);
  }
}

main().catch(err => console.error(err));
