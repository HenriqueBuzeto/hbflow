const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Fetching users...');
    const users = await prisma.user.findMany({
      include: {
        role: true,
        tenant: {
          include: {
            subscriptions: true
          }
        }
      }
    });
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
      console.log(`- ID: ${u.id}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Tenant: ${u.tenant?.name} (${u.tenantId})`);
      console.log(`  Plan: ${u.tenant?.plan}`);
      console.log(`  Subscriptions: ${JSON.stringify(u.tenant?.subscriptions)}`);
    }
  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
