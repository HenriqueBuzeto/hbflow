const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Busca o último tenant criado pela data de criação
  const lastTenant = await prisma.tenant.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!lastTenant) {
    console.log('Nenhum tenant (empresa) encontrado no banco de dados.');
    return;
  }

  console.log(`\n==================================================`);
  console.log(`ÚLTIMO TENANT ENCONTRADO:`);
  console.log(`Nome:      ${lastTenant.name}`);
  console.log(`Slug:      ${lastTenant.slug}`);
  console.log(`ID:        ${lastTenant.id}`);
  console.log(`Criado em: ${lastTenant.createdAt}`);
  console.log(`==================================================\n`);

  console.log('Deletando tenant e todos os registros vinculados (cascateamento)...');

  // Deleta o tenant (deletará em cascata devido a onDelete: Cascade no schema do Prisma)
  await prisma.tenant.delete({
    where: {
      id: lastTenant.id,
    },
  });

  console.log(`\n✅ Tenant "${lastTenant.name}" deletado com sucesso!\n`);
}

main()
  .catch((e) => {
    console.error('\n❌ Erro ao deletar o tenant:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
