import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const plans = await prisma.plan.findMany();
  console.log("PLANS IN DB:");
  console.log(JSON.stringify(plans, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
