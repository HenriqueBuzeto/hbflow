import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log("Iniciando a adição da permissão 'whatsapp.connection.manage' para todas as empresas existentes...");

  const tenants = await prisma.tenant.findMany();

  for (const tenant of tenants) {
    // 1. Garantir que a permissão existe no tenant
    let permission = await prisma.permission.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'whatsapp.connection.manage'
      }
    });

    if (!permission) {
      permission = await prisma.permission.create({
        data: {
          tenantId: tenant.id,
          name: 'whatsapp.connection.manage',
          description: 'whatsapp.connection.manage permission'
        }
      });
      console.log(`✔ Permissão criada para a empresa: ${tenant.name}`);
    }

    // 2. Localizar a Role Admin do tenant
    const adminRole = await prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'Admin'
      }
    });

    if (adminRole) {
      // 3. Vincular a permissão ao Role Admin
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        },
        create: {
          roleId: adminRole.id,
          permissionId: permission.id
        },
        update: {}
      });
      console.log(`✔ Permissão vinculada ao perfil Admin da empresa: ${tenant.name}`);
    }
  }

  console.log("🎉 Processo concluído com sucesso!");
}

run()
  .catch((err) => {
    console.error("Erro durante a migração de permissões:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
