import { prisma } from '../src/server/db/prisma';

async function main() {
  const events = await prisma.whatsappWebhookEvent.findMany({
    where: {
      eventType: {
        in: ['messages.upsert', 'MESSAGES_UPSERT']
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log("=== WHATSAPP WEBHOOK IMAGE EVENTS ===");
  for (const event of events) {
    const payload = JSON.parse(event.payloadJson);
    const imgMsg = payload.data?.message?.imageMessage;

    if (imgMsg) {
      console.log(`\nEvent ID: ${event.id}`);
      console.log(`  Keys of imageMessage:`, Object.keys(imgMsg));
      
      // Print values of keys that are not huge buffer arrays
      for (const [key, val] of Object.entries(imgMsg)) {
        if (typeof val === 'object' && val !== null) {
          // If it is a buffer or large object, just print type and size
          const keys = Object.keys(val);
          if (keys.length > 20) {
            console.log(`  - ${key}: [Large Object/Buffer with ${keys.length} keys]`);
          } else {
            console.log(`  - ${key}:`, JSON.stringify(val));
          }
        } else {
          console.log(`  - ${key}:`, val);
        }
      }
      
      // Let's also check if there is a media url inside payload.data or payload.data.message
      console.log(`  Keys of data:`, Object.keys(payload.data || {}));
      console.log(`  Keys of data.message:`, Object.keys(payload.data?.message || {}));
      
      // Check if base64 or media is in other fields
      if (payload.data?.base64) {
        console.log(`  Found data.base64 (length: ${payload.data.base64.length})`);
      }
      if (payload.data?.message?.base64) {
        console.log(`  Found data.message.base64 (length: ${payload.data.message.base64.length})`);
      }
      break; // just need one image message to inspect
    }
  }
}

main().catch(err => console.error(err));
