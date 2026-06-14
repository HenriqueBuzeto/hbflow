import { prisma } from '../src/server/db/prisma';

async function main() {
  const url = 'http://localhost:8085';
  const apiKey = 'hbflow_evo_api_key_6d4e8b9f71c32a58e0b1d3f2c5a6b8e0';

  // Fetch the active connection dynamically
  const connection = await prisma.whatsappConnection.findFirst({
    where: { deletedAt: null }
  });

  if (!connection) {
    console.error('No connection found in the database.');
    return;
  }

  const instanceName = connection.instanceName;
  const webhookSecret = connection.verifyToken || 'hbflow_qr_webhook_secret';
  const vercelWebhookUrl = 'https://hbflow.vercel.app/api/webhooks/whatsapp/qr';

  console.log(`=== FIXING WEBHOOK FOR INSTANCE: ${instanceName} ===`);
  console.log(`Setting webhook url to: ${vercelWebhookUrl}`);
  console.log(`Disabling webhookByEvents (byEvents: false)...`);

  try {
    // Call /webhook/set/{instanceName} with nested webhook property
    const res = await fetch(`${url}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: vercelWebhookUrl,
          byEvents: false,
          headers: {
            'webhook-authorization': webhookSecret
          },
          events: [
            'MESSAGES_UPSERT',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED'
          ]
        }
      })
    });

    const data = await res.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    console.log('\nVerifying updated webhook configurations...');
    const configRes = await fetch(`${url}/webhook/find/${instanceName}`, {
      headers: { 'apikey': apiKey }
    });
    const configData = await configRes.json();
    console.log('Updated Webhook Configs:', JSON.stringify(configData, null, 2));

  } catch (err: any) {
    console.error('Error fixing webhook in Evolution API:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
