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

  console.log(`=== CHECKING EVOLUTION API INSTANCE: ${instanceName} ===`);

  try {
    // 1. Check connection state
    const stateRes = await fetch(`${url}/instance/connectionState/${instanceName}`, {
      headers: { 'apikey': apiKey }
    });
    const stateData = await stateRes.json();
    console.log('Connection State:', JSON.stringify(stateData, null, 2));

    // 2. Find instance configs
    const configRes = await fetch(`${url}/webhook/find/${instanceName}`, {
      headers: { 'apikey': apiKey }
    });
    const configData = await configRes.json();
    console.log('Webhook Configs:', JSON.stringify(configData, null, 2));

  } catch (err: any) {
    console.error('Error querying Evolution API:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
