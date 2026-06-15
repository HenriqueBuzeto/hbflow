import { prisma } from '../src/server/db/prisma';

async function main() {
  const conversations = await prisma.conversation.findMany({
    include: {
      contact: true,
      channel: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 3
      }
    }
  });

  console.log("=== DB CONVERSATIONS ===");
  for (const c of conversations) {
    console.log(`Conv ID: ${c.id}`);
    console.log(`  Contact Name: ${c.contact.name} (${c.contact.phone})`);
    console.log(`  Status: ${c.status}`);
    console.log(`  Channel ID: ${c.channelId}`);
    console.log(`  Channel Name: ${c.channel?.name || 'NONE'}`);
    console.log(`  Channel Status: ${c.channel?.status || 'N/A'}`);
    console.log(`  Assigned User: ${c.assignedUserId}`);
    console.log(`  Messages:`);
    for (const m of c.messages) {
      console.log(`    [${m.senderType}] ${m.body} (Status: ${m.status})`);
    }
  }

  const connections = await prisma.whatsappConnection.findMany();
  console.log("=== DB CONNECTIONS ===");
  for (const conn of connections) {
    console.log(`Connection ID: ${conn.id}`);
    console.log(`  Name: ${conn.name}`);
    console.log(`  Provider: ${conn.provider}`);
    console.log(`  Instance: ${conn.instanceName}`);
    console.log(`  Status: ${conn.status}`);
  }
}

main().catch(err => console.error(err));
