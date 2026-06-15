import { prisma } from '../src/server/db/prisma';

async function main() {
  const logs = await prisma.whatsappApiLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log("=== WHATSAPP API LOGS ===");
  for (const log of logs) {
    console.log(`Log ID: ${log.id}`);
    console.log(`  CreatedAt: ${log.createdAt}`);
    console.log(`  Endpoint: ${log.endpoint}`);
    console.log(`  Method: ${log.method}`);
    console.log(`  Success: ${log.success}`);
    console.log(`  StatusCode: ${log.statusCode}`);
    console.log(`  Duration: ${log.durationMs}ms`);
    console.log(`  Error: ${log.errorMessage}`);
    console.log(`  Request: ${log.requestJson}`);
    console.log(`  Response: ${log.responseJson}`);
    console.log("-----------------------------------------");
  }
}

main().catch(err => console.error(err));
