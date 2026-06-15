import { prisma } from '../src/server/db/prisma';

async function main() {
  const events = await prisma.whatsappWebhookEvent.findMany({
    where: {
      eventType: {
        in: ['messages.upsert', 'MESSAGES_UPSERT']
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log("=== WHATSAPP WEBHOOK EVENTS ===");
  for (const event of events) {
    const payload = JSON.parse(event.payloadJson);
    const hasImage = payload.data?.message?.imageMessage;
    const hasAudio = payload.data?.message?.audioMessage;
    const hasVideo = payload.data?.message?.videoMessage;
    const hasDocument = payload.data?.message?.documentMessage;

    if (hasImage || hasAudio || hasVideo || hasDocument) {
      console.log(`Event ID: ${event.id}`);
      console.log(`  Type: ${event.eventType}`);
      console.log(`  CreatedAt: ${event.createdAt}`);
      console.log(`  Has Image: ${!!hasImage}`);
      console.log(`  Has Audio: ${!!hasAudio}`);
      console.log(`  Has Video: ${!!hasVideo}`);
      console.log(`  Has Document: ${!!hasDocument}`);
      console.log(`  Instance: ${payload.instance}`);
      
      if (hasImage) {
        console.log(`  Image Message keys:`, Object.keys(payload.data.message.imageMessage));
        console.log(`  Image Message:`, JSON.stringify(payload.data.message.imageMessage, null, 2));
      }
      
      console.log(`  Raw payload keys:`, Object.keys(payload));
      console.log(`  Raw payload data keys:`, Object.keys(payload.data || {}));
      
      // Let's check if there is a base64 key in payload.data
      console.log(`  Has data.message.base64:`, !!payload.data?.message?.base64);
      console.log(`  Has data.base64:`, !!payload.data?.base64);
      console.log(`  Has base64:`, !!payload.base64);
      console.log("-----------------------------------------");
    }
  }
}

main().catch(err => console.error(err));
