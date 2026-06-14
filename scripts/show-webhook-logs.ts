import { prisma } from '../src/server/db/prisma';

async function main() {
  console.log('=== WA WEBHOOK EVENT LOGS ===');
  const events = await prisma.whatsappWebhookEvent.findMany({
    take: 10,
    orderBy: { processedAt: 'desc' }
  });

  if (events.length === 0) {
    console.log('Nenhum evento de webhook encontrado no banco.');
  } else {
    events.forEach(e => {
      console.log(`[${e.processedAt.toISOString()}] ConnId: ${e.connectionId} | Event: ${e.eventType} | Status: ${e.status}`);
      if (e.status === 'failed') {
        console.log(`  Payload: ${e.payloadJson.substring(0, 300)}...`);
      }
    });
  }

  console.log('\n=== ACTIVE CONNECTIONS ===');
  const connections = await prisma.whatsappConnection.findMany({
    where: { deletedAt: null }
  });
  connections.forEach(c => {
    console.log(`ID: ${c.id} | Name: ${c.name} | Inst: ${c.instanceName} | Status: ${c.status} | Phone: ${c.phoneNumber}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
