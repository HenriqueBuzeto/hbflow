import { prisma } from '../src/server/db/prisma';

async function main() {
  const vercelUrl = 'https://hbflow.vercel.app/api/webhooks/whatsapp/qr';
  
  // Fetch the active connection dynamically
  const connection = await prisma.whatsappConnection.findFirst({
    where: { deletedAt: null }
  });

  if (!connection) {
    console.error('No connection found in the database. Please create a connection in the app first.');
    return;
  }

  const instanceName = connection.instanceName;
  const webhookSecret = connection.verifyToken || 'hbflow_qr_webhook_secret';

  console.log(`Using active connection: "${connection.name}" (ID: ${connection.id}) with instance name: "${instanceName}"`);

  // 1. Send connection status update to ensure status is 'connected'
  const connectionPayload = {
    instance: instanceName,
    event: 'connection.update',
    data: {
      state: 'connected',
      status: 'connected',
      phoneNumber: connection.phoneNumber || '5511999999999'
    }
  };

  console.log(`\n--- 1. Sending connection.update (status: connected) ---`);
  try {
    const res = await fetch(vercelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-authorization': webhookSecret
      },
      body: JSON.stringify(connectionPayload)
    });

    console.log(`Response Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err: any) {
    console.error('Network error sending connection.update:', err.message);
  }

  // 2. Send messages.upsert payload to simulate a new message
  const messagePayload = {
    instance: instanceName,
    event: 'messages.upsert',
    data: {
      key: {
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false,
        id: `mock_msg_${Date.now()}`
      },
      pushName: 'Cliente de Teste Vercel',
      message: {
        conversation: 'Olá! Esta é uma mensagem de teste enviada via script para a Vercel.'
      }
    }
  };

  console.log(`\n--- 2. Sending messages.upsert (simulated incoming message) ---`);
  try {
    const res = await fetch(vercelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-authorization': webhookSecret
      },
      body: JSON.stringify(messagePayload)
    });

    console.log(`Response Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err: any) {
    console.error('Network error sending messages.upsert:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
