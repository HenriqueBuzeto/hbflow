const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente locais antes de qualquer outra importação
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line: string) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          process.env[key] = value.trim();
        }
      });
      console.log('✅ Configuração do banco carregada do arquivo .env local');
    }
  } catch (err) {
    console.error('⚠️ Falha ao carregar o arquivo .env:', err);
  }
}

loadEnv();

const { PrismaClient } = require('@prisma/client');
const { FeatureAccessService } = require('../../src/server/services/billing/feature-access.service');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

interface TestResult {
  testName: string;
  passed: boolean;
  evidence: any;
  error?: string;
}

async function runGatingTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const timestamp = Date.now();
  let starterTenantId = '';
  let proTenantId = '';
  let enterpriseTenantId = '';
  let override1Id = '';
  let override2Id = '';

  try {
    console.log('=== SETUP: Criando Tenants nos diferentes Planos ===');
    
    // 1. Criar Tenant no Plano Starter
    const starterTenant = await prisma.tenant.create({
      data: {
        name: `Starter Gating Tenant ${timestamp}`,
        slug: `starter-gating-${timestamp}`,
        status: 'active',
        plan: 'starter',
      },
    });
    starterTenantId = starterTenant.id;
    console.log(`✅ Tenant Starter criado: ${starterTenantId}`);

    // 2. Criar Tenant no Plano Pro
    const proTenant = await prisma.tenant.create({
      data: {
        name: `Pro Gating Tenant ${timestamp}`,
        slug: `pro-gating-${timestamp}`,
        status: 'active',
        plan: 'pro',
      },
    });
    proTenantId = proTenant.id;
    console.log(`✅ Tenant Pro criado: ${proTenantId}`);

    // 3. Criar Tenant no Plano Enterprise
    const enterpriseTenant = await prisma.tenant.create({
      data: {
        name: `Enterprise Gating Tenant ${timestamp}`,
        slug: `ent-gating-${timestamp}`,
        status: 'active',
        plan: 'enterprise',
      },
    });
    enterpriseTenantId = enterpriseTenant.id;
    console.log(`✅ Tenant Enterprise criado: ${enterpriseTenantId}`);

    // --- Cenário 1: Validar regras padrão de faturamento (Starter bloqueado, Pro/Enterprise liberados) ---
    console.log('\n--- Cenário 1: Validar regras padrão de faturamento ---');
    
    const starterAllowed = await FeatureAccessService.checkFeature(starterTenantId, 'after_sales_enabled');
    const proAllowed = await FeatureAccessService.checkFeature(proTenantId, 'after_sales_enabled');
    const enterpriseAllowed = await FeatureAccessService.checkFeature(enterpriseTenantId, 'after_sales_enabled');

    const scenario1Passed = (starterAllowed === false) && (proAllowed === true) && (enterpriseAllowed === true);
    console.log(`- Starter permitido: ${starterAllowed} (esperado: false)`);
    console.log(`- Pro permitido: ${proAllowed} (esperado: true)`);
    console.log(`- Enterprise permitido: ${enterpriseAllowed} (esperado: true)`);

    results.push({
      testName: 'Bloquear Starter e liberar Pro/Enterprise por padrão',
      passed: scenario1Passed,
      evidence: { starterAllowed, proAllowed, enterpriseAllowed }
    });

    // --- Cenário 2: Sobrescrita Manual - Ativar pós-venda em inquilino Starter ---
    console.log('\n--- Cenário 2: Sobrescrita Manual - Ativar em Starter ---');
    const override1 = await prisma.tenantPlanFeature.create({
      data: {
        tenantId: starterTenantId,
        feature: 'after_sales_enabled',
        value: 'true',
        isActive: true
      }
    });
    override1Id = override1.id;
    console.log(`✅ Criada sobreposição manual ativando feature no Starter (ID: ${override1Id})`);

    const starterAllowedAfterOverride = await FeatureAccessService.checkFeature(starterTenantId, 'after_sales_enabled');
    const scenario2Passed = starterAllowedAfterOverride === true;
    console.log(`- Starter permitido após sobreposição ativa: ${starterAllowedAfterOverride} (esperado: true)`);

    results.push({
      testName: 'Permitir acesso no plano Starter através de sobreposição manual ativa = true',
      passed: scenario2Passed,
      evidence: { starterAllowedAfterOverride }
    });

    // --- Cenário 3: Sobrescrita Manual - Desativar pós-venda em inquilino Pro ---
    console.log('\n--- Cenário 3: Sobrescrita Manual - Desativar em Pro ---');
    const override2 = await prisma.tenantPlanFeature.create({
      data: {
        tenantId: proTenantId,
        feature: 'after_sales_enabled',
        value: 'false',
        isActive: true
      }
    });
    override2Id = override2.id;
    console.log(`✅ Criada sobreposição manual desativando feature no Pro (ID: ${override2Id})`);

    const proAllowedAfterOverride = await FeatureAccessService.checkFeature(proTenantId, 'after_sales_enabled');
    const scenario3Passed = proAllowedAfterOverride === false;
    console.log(`- Pro permitido após sobreposição ativa: ${proAllowedAfterOverride} (esperado: false)`);

    results.push({
      testName: 'Bloquear acesso no plano Pro através de sobreposição manual ativa = false',
      passed: scenario3Passed,
      evidence: { proAllowedAfterOverride }
    });

  } catch (error) {
    console.error('❌ Erro na execução do gating test:', error);
    results.push({
      testName: 'Validação de Feature Gating',
      passed: false,
      evidence: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  } finally {
    // Limpar os dados criados no banco Neon
    console.log('\n=== CLEANUP: Removendo sobreposições e tenants de teste ===');
    
    if (override1Id) {
      await prisma.tenantPlanFeature.delete({ where: { id: override1Id } }).catch(() => {});
    }
    if (override2Id) {
      await prisma.tenantPlanFeature.delete({ where: { id: override2Id } }).catch(() => {});
    }
    
    if (starterTenantId) {
      await prisma.tenant.delete({ where: { id: starterTenantId } }).catch(() => {});
    }
    if (proTenantId) {
      await prisma.tenant.delete({ where: { id: proTenantId } }).catch(() => {});
    }
    if (enterpriseTenantId) {
      await prisma.tenant.delete({ where: { id: enterpriseTenantId } }).catch(() => {});
    }
    
    console.log('✅ Banco limpo de todos os registros temporários de gating.');
    await prisma.$disconnect();
  }

  return results;
}

async function main() {
  console.log('=== TESTE DE VALIDAÇÃO: FEATURE GATING E PLANOS (PÓS-VENDA) ===');
  console.log('Iniciando Teste E2E de Controle de Acesso e Sobreposição...\n');

  const results = await runGatingTests();

  console.log('\n=== RESULTADO DOS CENÁRIOS ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total de testes: ${results.length}`);
  console.log(`Aprovados: ${passed}`);
  console.log(`Falhos: ${failed}`);
  console.log(`Taxa de Sucesso: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n✅ TEST 13 (FEATURE GATING): APROVADO');
    process.exit(0);
  } else {
    console.log('\n❌ TEST 13 (FEATURE GATING): FALHOU');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}: ${r.error || 'Verifique evidências'}`);
    });
    process.exit(1);
  }
}

main().catch(console.error);
