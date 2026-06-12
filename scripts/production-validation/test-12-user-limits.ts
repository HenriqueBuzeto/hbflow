import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../src/server/auth/auth.service';
import { PasswordService } from '../../src/server/auth/password.service';

const prisma = new PrismaClient();

// Simulated route check logic
async function checkCanCreateUser(tenantId: string): Promise<{ allowed: boolean; maxUsers: number; count: number }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });
  const planSlug = tenant?.plan || 'starter';
  
  let maxUsers = 3;
  if (planSlug === 'pro' || planSlug === 'pro-test') {
    maxUsers = 10;
  } else if (planSlug === 'enterprise') {
    maxUsers = 1000;
  }

  const activeUserCount = await prisma.user.count({
    where: { tenantId, deletedAt: null }
  });

  return {
    allowed: activeUserCount < maxUsers,
    maxUsers,
    count: activeUserCount
  };
}

async function run() {
  console.log("--------------------------------------------------");
  console.log("INICIANDO VALIDAÇÃO DE LIMITES DE USUÁRIOS (SPRINT 0.8)");
  console.log("--------------------------------------------------");

  const testEmail = `agent.limit.${Date.now()}@test.com`;
  let tempTenantId: string | null = null;

  try {
    // 1. Cadastrar um Tenant temporário (inicia no Plano Starter com limite de 3)
    console.log("1. Registrando tenant de teste...");
    const regResult = await AuthService.registerTrial({
      companyName: 'Test Limit Corp',
      cnpj: '11.222.333/0001-44',
      email: testEmail,
      phone: '(11) 98888-2222',
      userName: 'Test Limits Manager'
    });
    
    tempTenantId = regResult.tenantId;
    console.log(`✔ Tenant criado. ID: ${tempTenantId}. E-mail admin: ${regResult.loginEmail}`);

    // Inicialmente o tenant possui 1 usuário (o Admin principal)
    const check1 = await checkCanCreateUser(tempTenantId);
    console.log(`✔ Usuários iniciais: ${check1.count}/${check1.maxUsers}. Permissão para criar: ${check1.allowed}`);
    if (check1.count !== 1 || !check1.allowed) {
      throw new Error(`Contagem inicial incorreta. Esperava 1 usuário, obteve ${check1.count}`);
    }

    // 2. Criar Usuário #2
    console.log("\n2. Adicionando Usuário #2...");
    const check2 = await checkCanCreateUser(tempTenantId);
    if (!check2.allowed) throw new Error("Deveria ser permitido criar o Usuário #2");

    const user2 = await prisma.user.create({
      data: {
        tenantId: tempTenantId,
        name: 'Employee Two',
        email: `emp.two.${Date.now()}@test.com`,
        passwordHash: await PasswordService.hash('Password123!'),
        isActive: true
      }
    });
    console.log(`✔ Usuário #2 criado: ${user2.name}`);

    // 3. Criar Usuário #3
    console.log("\n3. Adicionando Usuário #3...");
    const check3 = await checkCanCreateUser(tempTenantId);
    if (!check3.allowed) throw new Error("Deveria ser permitido criar o Usuário #3");

    const user3 = await prisma.user.create({
      data: {
        tenantId: tempTenantId,
        name: 'Employee Three',
        email: `emp.three.${Date.now()}@test.com`,
        passwordHash: await PasswordService.hash('Password123!'),
        isActive: true
      }
    });
    console.log(`✔ Usuário #3 criado: ${user3.name}`);

    // 4. Tentar Criar Usuário #4 (Deveria ser BLOQUEADO pelo limite do Starter = 3)
    console.log("\n4. Testando bloqueio no Usuário #4...");
    const check4 = await checkCanCreateUser(tempTenantId);
    console.log(`✔ Status atual: ${check4.count}/${check4.maxUsers}. Permissão para criar: ${check4.allowed}`);
    if (check4.allowed) {
      throw new Error("Erro: O sistema permitiu ultrapassar o limite do plano Starter!");
    }
    console.log("✔ Bloqueio validado com sucesso! Limite Starter respeitado.");

    // 5. Exclusão lógica (Soft Delete) do Usuário #2 para liberar espaço na quota
    console.log("\n5. Simulando Soft Delete do Usuário #2 para liberar quota...");
    await prisma.user.update({
      where: { id: user2.id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    // Validar se a quota foi liberada
    const check5 = await checkCanCreateUser(tempTenantId);
    console.log(`✔ Após soft delete: ${check5.count}/${check5.maxUsers} ativos. Permissão para criar: ${check5.allowed}`);
    if (check5.count !== 2 || !check5.allowed) {
      throw new Error(`A quota deveria ter liberado (2 ativos). Obtidos: ${check5.count} ativos.`);
    }
    console.log("✔ Quota de limite de usuários restabelecida com sucesso!");

    // 6. Testar força de senha
    console.log("\n6. Validando PasswordStrength checker...");
    const invalidPass = PasswordService.validateStrength('123');
    if (invalidPass.valid) {
      throw new Error("Senha '123' não deveria passar no validador de força");
    }
    console.log("✔ Password strength check aprovado!");

    console.log("\n--------------------------------------------------");
    console.log("USER_LIMITS_VALIDATION: PASS ✅");
    console.log("--------------------------------------------------");

  } catch (err: any) {
    console.error("\n❌ ERRO NA VALIDAÇÃO:", err.message);
    process.exit(1);
  } finally {
    // 7. Limpeza (deletar tenant de teste em cascata)
    if (tempTenantId) {
      console.log("\nLimpando banco de dados de teste...");
      await prisma.tenant.delete({
        where: { id: tempTenantId }
      });
      console.log("✔ Banco limpo.");
    }
    await prisma.$disconnect();
  }
}

run();
