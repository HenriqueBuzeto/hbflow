const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      subscription: {
        include: { plan: true }
      }
    }
  });
  console.log('--- ALL INVOICES ---');
  console.log(JSON.stringify(invoices, null, 2));

  const subscriptions = await prisma.subscription.findMany({
    include: { plan: true }
  });
  console.log('--- ALL SUBSCRIPTIONS ---');
  console.log(JSON.stringify(subscriptions, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
