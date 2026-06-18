import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.log('Por favor, informe o e-mail, CNPJ ou slug do Tenant para apagar.');
    console.log('Exemplo: npx tsx scripts/delete-tenant.ts "cliente@empresa.com"');
    
    // Listar os últimos 5 tenants criados para ajudar o usuário
    const recentTenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('\nÚltimas empresas (Tenants) cadastradas no banco:');
    recentTenants.forEach(t => {
      console.log(`- Slug: ${t.slug} | Nome: ${t.name} | E-mail: ${t.email} | CNPJ: ${t.document} | Criado em: ${t.createdAt}`);
    });
    return;
  }

  const cleanTarget = target.trim();

  // Buscar por slug, email ou CNPJ/document
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: cleanTarget },
        { email: cleanTarget },
        { document: cleanTarget.replace(/\D/g, '') },
        { name: cleanTarget }
      ]
    }
  });

  if (!tenant) {
    console.log(`❌ Nenhuma empresa (Tenant) encontrada com o termo: "${target}"`);
    return;
  }

  console.log(`\nTem certeza que deseja apagar a empresa "${tenant.name}" (${tenant.email})?`);
  console.log(`Isso apagará permanentemente todos os usuários, conexões, conversas e dados associados.`);
  console.log(`Executando deleção no banco de dados...`);

  try {
    await prisma.tenant.delete({
      where: { id: tenant.id }
    });
    console.log(`\n✅ Empresa "${tenant.name}" e todos os seus dados foram removidos com sucesso do banco!`);
  } catch (error: any) {
    console.error('❌ Erro ao deletar do banco:', error.message);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
