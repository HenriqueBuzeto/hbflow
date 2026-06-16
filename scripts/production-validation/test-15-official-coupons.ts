import { prisma } from '../../src/server/db/prisma';
import { BillingCalculatorService } from '../../src/server/services/billing/billing-calculator.service';
import { InvoiceService } from '../../src/server/services/billing/invoice.service';

const OFFICIAL_COUPONS = [
  {
    code: 'HBSTUDIO100',
    type: 'percentage',
    value: 100.0,
    duration: 'forever',
    durationMonths: null,
    maxRedemptions: null,
    isActive: true,
    appliesToPlanSlug: null,
    maxRedemptionsPerTenant: null,
    isSystemCoupon: true,
    metadataJson: JSON.stringify({ description: 'Cortesia/Uso Interno 100% Permanente' })
  },
  {
    code: 'OTICAPRO50',
    type: 'percentage',
    value: 73.67,
    duration: 'forever',
    durationMonths: null,
    maxRedemptions: null,
    isActive: true,
    appliesToPlanSlug: 'pro',
    maxRedemptionsPerTenant: null,
    isSystemCoupon: true,
    metadataJson: JSON.stringify({ fixedFinalPriceCents: 5000, description: 'Desconto permanente Plano Pro para R$ 50,00' })
  },
  {
    code: 'BEMVINDO40',
    type: 'percentage',
    value: 40.0,
    duration: 'once',
    durationMonths: null,
    maxRedemptions: null,
    isActive: true,
    appliesToPlanSlug: null,
    maxRedemptionsPerTenant: 1,
    isSystemCoupon: true,
    metadataJson: JSON.stringify({ description: 'Cupom de Boas-vindas 40% Primeira Mensalidade' })
  }
];

async function seedCoupons() {
  for (const couponData of OFFICIAL_COUPONS) {
    const existing = await prisma.coupon.findUnique({
      where: { code: couponData.code }
    });
    if (existing) {
      await prisma.coupon.update({
        where: { id: existing.id },
        data: {
          type: couponData.type,
          value: couponData.value,
          duration: couponData.duration,
          appliesToPlanSlug: couponData.appliesToPlanSlug,
          maxRedemptionsPerTenant: couponData.maxRedemptionsPerTenant,
          isSystemCoupon: couponData.isSystemCoupon,
          metadataJson: couponData.metadataJson,
          isActive: couponData.isActive
        }
      });
    } else {
      await prisma.coupon.create({
        data: couponData
      });
    }
  }
}

async function runTests() {
  console.log('🚀 INICIANDO TESTE INTEGRADO: OFFICIAL_PROMOTIONAL_COUPONS_VALIDATION\n');

  // --- Cenário 1: Seed cria HBSTUDIO100, OTICAPRO50, BEMVINDO40 ---
  console.log('--- Cenário 1 & 2: Executando Seed e validando idempotência ---');
  await seedCoupons();
  const count1 = await prisma.coupon.count({
    where: { code: { in: ['HBSTUDIO100', 'OTICAPRO50', 'BEMVINDO40'] } }
  });
  if (count1 !== 3) {
    throw new Error(`FAIL: Esperado 3 cupons semeados, encontrado ${count1}`);
  }
  console.log('PASS: Cupons semeados no banco de dados.');

  // Seed novamente para testar idempotência
  await seedCoupons();
  const count2 = await prisma.coupon.count({
    where: { code: { in: ['HBSTUDIO100', 'OTICAPRO50', 'BEMVINDO40'] } }
  });
  if (count2 !== 3) {
    throw new Error(`FAIL: Idempotência falhou, contagem de cupons duplicada: ${count2}`);
  }
  console.log('PASS: Idempotência do seed confirmada.');

  // Configurar Planos de teste
  let planStarter = await prisma.plan.findUnique({ where: { slug: 'starter' } });
  if (!planStarter) {
    planStarter = await prisma.plan.create({
      data: {
        id: 'test-starter-plan-uuid',
        name: 'Starter',
        slug: 'starter',
        priceCents: 9990,
        billingCycle: 'monthly',
        isActive: true
      }
    });
  }

  let planPro = await prisma.plan.findUnique({ where: { slug: 'pro' } });
  if (!planPro) {
    planPro = await prisma.plan.create({
      data: {
        id: 'test-pro-plan-uuid',
        name: 'Pro',
        slug: 'pro',
        priceCents: 18990,
        billingCycle: 'monthly',
        isActive: true
      }
    });
  }

  // Configurar Tenants de teste
  const tenantAId = 'tenant-coupon-test-a';
  let tenantA = await prisma.tenant.findUnique({ where: { id: tenantAId } });
  if (!tenantA) {
    tenantA = await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: 'Inquilino Teste Cupons A',
        slug: 'tenant-coupon-test-a',
        email: 'tenant.coupon.a@test.com',
        phone: '11999990001'
      }
    });
  }

  const tenantBId = 'tenant-coupon-test-b';
  let tenantB = await prisma.tenant.findUnique({ where: { id: tenantBId } });
  if (!tenantB) {
    tenantB = await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: 'Inquilino Teste Cupons B',
        slug: 'tenant-coupon-test-b',
        email: 'tenant.coupon.b@test.com',
        phone: '11999990002'
      }
    });
  }

  // Limpar dados anteriores de faturas/assinaturas dos inquilinos de teste
  await prisma.couponRedemption.deleteMany({
    where: { tenantId: { in: [tenantAId, tenantBId] } }
  });
  await prisma.tenantDiscount.deleteMany({
    where: { tenantId: { in: [tenantAId, tenantBId] } }
  });
  await prisma.invoice.deleteMany({
    where: { tenantId: { in: [tenantAId, tenantBId] } }
  });
  await prisma.subscription.deleteMany({
    where: { tenantId: { in: [tenantAId, tenantBId] } }
  });

  // Criar assinaturas de teste
  const subA = await prisma.subscription.create({
    data: {
      id: 'sub-coupon-test-a',
      tenantId: tenantAId,
      planId: planStarter.id,
      status: 'trialing',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  const subB = await prisma.subscription.create({
    data: {
      id: 'sub-coupon-test-b',
      tenantId: tenantBId,
      planId: planStarter.id,
      status: 'trialing',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  // --- Cenário 3: HBSTUDIO100 aplicado em plano Starter gera totalCents = 0 ---
  console.log('\n--- Cenário 3: HBSTUDIO100 aplicado no Starter ---');
  const calc1 = await BillingCalculatorService.calculate(tenantAId, planStarter.id, 'HBSTUDIO100');
  if (calc1.totalCents === 0 && calc1.discountCents === 9990) {
    console.log('PASS: HBSTUDIO100 gerou totalCents = 0 e discountCents = 9990.');
  } else {
    throw new Error(`FAIL: HBSTUDIO100 Starter incorreto: totalCents=${calc1.totalCents}, discountCents=${calc1.discountCents}`);
  }

  // Criamos o desconto permanente no tenant para faturas futuras
  const couponStudio = await prisma.coupon.findUniqueOrThrow({ where: { code: 'HBSTUDIO100' } });
  await prisma.tenantDiscount.create({
    data: {
      tenantId: tenantAId,
      couponId: couponStudio.id,
      type: couponStudio.type,
      value: couponStudio.value,
      reason: 'Desconto de cortesia permanente',
      startsAt: new Date(),
      isActive: true
    }
  });

  // --- Cenário 4: HBSTUDIO100 aplicado em fatura futura continua totalCents = 0 ---
  console.log('\n--- Cenário 4: HBSTUDIO100 em faturas futuras via TenantDiscount ---');
  const calc2 = await BillingCalculatorService.calculate(tenantAId, planStarter.id);
  if (calc2.totalCents === 0 && calc2.discountCents === 9990) {
    console.log('PASS: Fatura futura herdou desconto permanente do cupom (totalCents = 0).');
  } else {
    throw new Error(`FAIL: Desconto permanente futuro falhou: totalCents=${calc2.totalCents}, discountCents=${calc2.discountCents}`);
  }

  // --- Cenário 5: OTICAPRO50 aplicado no plano PRO gera totalCents = 5000 ---
  console.log('\n--- Cenário 5: OTICAPRO50 aplicado no Plano PRO ---');
  const calc3 = await BillingCalculatorService.calculate(tenantAId, planPro.id, 'OTICAPRO50');
  if (calc3.totalCents === 5000 && calc3.discountCents === 13990) {
    console.log('PASS: OTICAPRO50 gerou exatamente R$ 50,00 (totalCents = 5000) no plano PRO.');
  } else {
    throw new Error(`FAIL: OTICAPRO50 no PRO falhou: totalCents=${calc3.totalCents}, discountCents=${calc3.discountCents}`);
  }

  // --- Cenário 6: OTICAPRO50 aplicado fora do plano PRO retorna erro ---
  console.log('\n--- Cenário 6: OTICAPRO50 fora do Plano PRO ---');
  try {
    await BillingCalculatorService.calculate(tenantAId, planStarter.id, 'OTICAPRO50');
    throw new Error('FAIL: Deveria ter retornado erro ao aplicar OTICAPRO50 no Starter.');
  } catch (error: any) {
    if (error.message === 'CUPON_NOT_VALID_FOR_PLAN') {
      console.log('PASS: Bloqueou a aplicação do cupom e retornou CUPON_NOT_VALID_FOR_PLAN.');
    } else {
      throw new Error(`FAIL: Erro inesperado retornado: ${error.message}`);
    }
  }

  // --- Cenário 7: BEMVINDO40 aplicado na primeira fatura dá 40% de desconto ---
  console.log('\n--- Cenário 7: BEMVINDO40 na primeira fatura ---');
  const start = new Date();
  const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  // Vamos gerar a primeira fatura com BEMVINDO40
  const invoice1 = await InvoiceService.generateMonthlyInvoice(
    tenantBId,
    subB.id,
    start,
    end,
    'BEMVINDO40'
  );

  const expectedDiscount = Math.round(9990 * 0.4); // 3996 cents
  const expectedTotal = 9990 - expectedDiscount; // 5994 cents

  if (invoice1.totalCents === expectedTotal && invoice1.discountCents === expectedDiscount) {
    console.log(`PASS: Primeira fatura com BEMVINDO40 calculou corretamento ${expectedDiscount} cents (40% de desconto).`);
  } else {
    throw new Error(`FAIL: BEMVINDO40 primeira fatura incorreta: totalCents=${invoice1.totalCents}, discountCents=${invoice1.discountCents}`);
  }

  // --- Cenário 8: BEMVINDO40 na segunda fatura não aplica desconto ---
  console.log('\n--- Cenário 8: BEMVINDO40 na segunda fatura (Bloqueio por limite de uso) ---');
  try {
    // Tenta gerar uma segunda fatura com o mesmo cupom
    await InvoiceService.generateMonthlyInvoice(
      tenantBId,
      subB.id,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      'BEMVINDO40'
    );
    throw new Error('FAIL: Deveria ter bloqueado o uso repetido do cupom BEMVINDO40.');
  } catch (error: any) {
    if (error.message === 'CUPON_LIMIT_REACHED_FOR_TENANT') {
      console.log('PASS: Bloqueou o reuso do cupom e retornou CUPON_LIMIT_REACHED_FOR_TENANT.');
    } else {
      throw new Error(`FAIL: Erro inesperado no reuso do cupom: ${error.message}`);
    }
  }

  // --- Cenário 9: Invoice.metadataJson registra cupom corretamente ---
  console.log('\n--- Cenário 9: Validação do metadataJson da Invoice ---');
  if (invoice1.metadataJson) {
    const meta = JSON.parse(invoice1.metadataJson);
    const requiredKeys = [
      'couponCode',
      'couponId',
      'couponType',
      'couponDuration',
      'discountPercentage',
      'discountCents',
      'originalAmountCents',
      'finalAmountCents'
    ];
    for (const key of requiredKeys) {
      if (!(key in meta)) {
        throw new Error(`FAIL: Faltando chave "${key}" no metadataJson da fatura`);
      }
    }
    if (meta.couponCode === 'BEMVINDO40' && meta.discountPercentage === 40) {
      console.log('PASS: Todas as chaves obrigatórias registradas corretamente no metadataJson.');
    } else {
      throw new Error('FAIL: Valores inválidos gravados no metadataJson');
    }
  } else {
    throw new Error('FAIL: metadataJson está vazio na invoice gerada');
  }

  // --- Cenário 10: Financeiro consegue listar invoice com couponCode e discountCents ---
  console.log('\n--- Cenário 10: Listagem no financeiro e persistência ---');
  const dbInvoice = await prisma.invoice.findUnique({
    where: { id: invoice1.id }
  });
  if (dbInvoice && dbInvoice.discountCents > 0 && dbInvoice.metadataJson) {
    const meta = JSON.parse(dbInvoice.metadataJson);
    if (meta.couponCode === 'BEMVINDO40') {
      console.log('PASS: Fatura recuperada do banco de dados expõe o cupom e desconto corretamente.');
    } else {
      throw new Error('FAIL: Cupom divergente no banco de dados');
    }
  } else {
    throw new Error('FAIL: Fatura não encontrada ou sem dados de desconto');
  }

  // --- Cenário 12: Cupom inválido retorna erro claro ---
  console.log('\n--- Cenário 12: Cupom inválido ---');
  try {
    await BillingCalculatorService.calculate(tenantAId, planStarter.id, 'CUPON_INEXISTENTE');
    throw new Error('FAIL: Deveria retornar erro para cupom inexistente.');
  } catch (error: any) {
    if (error.message === 'CUPON_NOT_FOUND_OR_INACTIVE') {
      console.log('PASS: Cupom inexistente retornou CUPON_NOT_FOUND_OR_INACTIVE.');
    } else {
      throw new Error(`FAIL: Erro inesperado para cupom inexistente: ${error.message}`);
    }
  }

  // --- Cenário 13: Cupom expirado não aplica ---
  console.log('\n--- Cenário 13: Cupom expirado ---');
  const expiredCoupon = await prisma.coupon.create({
    data: {
      code: 'EXPIRADO50',
      type: 'percentage',
      value: 50.0,
      duration: 'once',
      validUntil: new Date(Date.now() - 1000), // Venceu há 1 segundo
      isActive: true
    }
  });

  try {
    await BillingCalculatorService.calculate(tenantAId, planStarter.id, 'EXPIRADO50');
    throw new Error('FAIL: Deveria recusar cupom vencido.');
  } catch (error: any) {
    if (error.message === 'CUPON_EXPIRED') {
      console.log('PASS: Cupom vencido retornou CUPON_EXPIRED.');
    } else {
      throw new Error(`FAIL: Erro inesperado para cupom vencido: ${error.message}`);
    }
  } finally {
    await prisma.coupon.delete({ where: { id: expiredCoupon.id } });
  }

  // --- Cenário 14: Tenant A não usa redemption do Tenant B ---
  console.log('\n--- Cenário 14: Isolamento multi-tenant de resgates ---');
  // Tenant B já resgatou o BEMVINDO40 (uma vez). Vamos verificar se Tenant A ainda pode usar!
  const calcTenantA = await BillingCalculatorService.calculate(tenantAId, planStarter.id, 'BEMVINDO40');
  if (calcTenantA.discountCents > 0 && calcTenantA.totalCents < 9990) {
    console.log('PASS: Tenant A conseguiu simular BEMVINDO40 independentemente do resgate do Tenant B.');
  } else {
    throw new Error('FAIL: Resgate do Tenant B bloqueou incorretamente o Tenant A.');
  }

  console.log('\n🎉 TODAS AS VALIDAÇÕES DE CUPONS OFICIAIS PASSARAM COM SUCESSO!\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ TESTE INTEGRADO FALHOU:', err);
    process.exit(1);
  });
