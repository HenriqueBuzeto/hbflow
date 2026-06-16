import { prisma } from '../../src/server/db/prisma';
import { InfinitePayProvider } from '../../src/server/services/billing/providers/infinitepay.provider';

// Mock do fetch global para simular a API da InfinitePay nos testes
const originalFetch = global.fetch;

function setupFetchMock(responseStatus: number, responseData: any) {
  global.fetch = jestMockFetch(responseStatus, responseData);
}

function jestMockFetch(status: number, data: any) {
  return jestMockFn(() => Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data)
  } as any));
}

function jestMockFn<T extends (...args: any[]) => any>(implementation: T) {
  const mock: any = (...args: any[]) => {
    mock.mock.calls.push(args);
    return implementation(...args);
  };
  mock.mock = { calls: [] };
  return mock;
}

function restoreFetch() {
  global.fetch = originalFetch;
}

async function runTests() {
  console.log('🚀 INICIANDO TESTE INTEGRADO: INFINITEPAY_PAYMENT_VALIDATION\n');

  // 1. SETUP: Criar ou obter Plano, Tenant e Assinatura para testes
  let plan = await prisma.plan.findFirst({ where: { slug: 'test-pro-plan' } });
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        id: 'test-pro-plan-uuid',
        name: 'Plano Pro Teste',
        slug: 'test-pro-plan',
        priceCents: 9990,
        billingCycle: 'monthly',
        isActive: true
      }
    });
  }

  let tenantA = await prisma.tenant.findUnique({ where: { slug: 'tenant-a-test' } });
  if (!tenantA) {
    tenantA = await prisma.tenant.create({
      data: {
        id: 'tenant-a-test-uuid',
        name: 'Inquilino Teste A',
        slug: 'tenant-a-test',
        email: 'tenant.a@test.com',
        phone: '11999999999'
      }
    });
  }

  let tenantB = await prisma.tenant.findUnique({ where: { slug: 'tenant-b-test' } });
  if (!tenantB) {
    tenantB = await prisma.tenant.create({
      data: {
        id: 'tenant-b-test-uuid',
        name: 'Inquilino Teste B',
        slug: 'tenant-b-test',
        email: 'tenant.b@test.com',
        phone: '11888888888'
      }
    });
  }

  let subA = await prisma.subscription.findFirst({ where: { tenantId: tenantA.id } });
  if (!subA) {
    subA = await prisma.subscription.create({
      data: {
        id: 'sub-a-test-uuid',
        tenantId: tenantA.id,
        planId: plan.id,
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      }
    });
  }

  // Limpar faturas anteriores dos inquilinos de teste
  await prisma.invoice.deleteMany({
    where: { tenantId: { in: [tenantA.id, tenantB.id] } }
  });

  // Criar fatura de teste
  const now = new Date();
  const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const invoice = await prisma.invoice.create({
    data: {
      id: 'invoice-test-uuid-9990',
      tenantId: tenantA.id,
      subscriptionId: subA.id,
      invoiceNumber: `INV-TEST-INFINITEPAY`,
      status: 'open',
      subtotalCents: 9990,
      discountCents: 0,
      totalCents: 9990,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      billingPeriodStart: now,
      billingPeriodEnd: end
    }
  });

  console.log('✅ Setup concluído. Fatura de R$ 99.90 criada com ID:', invoice.id);

  // --- CENÁRIO 1: Criar link de pagamento ---
  console.log('\n--- Cenário 1: Criando link de pagamento na InfinitePay ---');
  setupFetchMock(200, {
    url: 'https://checkout.infinitepay.io/hbstudiodev/test-checkout-slug',
    slug: 'test-checkout-slug'
  });

  const linkResult = await InfinitePayProvider.createCheckoutLink(invoice.id);
  
  if (linkResult.checkoutUrl === 'https://checkout.infinitepay.io/hbstudiodev/test-checkout-slug' && linkResult.slug === 'test-checkout-slug') {
    console.log('PASS: Link de checkout gerado corretamente e salvo no metadata');
  } else {
    throw new Error('FAIL: Link de checkout divergente do retornado pela API');
  }

  // Validar se payload continha handle correto e order_nsu correto
  const fetchMock = global.fetch as any;
  const lastCallArgs = fetchMock.mock.calls[0];
  const payloadSent = JSON.parse(lastCallArgs[1].body);
  
  if (payloadSent.handle === 'hbstudiodev' && payloadSent.order_nsu === invoice.id && payloadSent.items[0].price === 9990) {
    console.log('PASS: Payload enviado para a InfinitePay está estruturalmente correto');
  } else {
    throw new Error('FAIL: Payload inválido enviado à InfinitePay');
  }

  // --- CENÁRIO 2: Processar Webhook aprovado ---
  console.log('\n--- Cenário 2: Processando Webhook de pagamento aprovado ---');
  restoreFetch(); // restaura para não interferir na transação interna se houver calls de rede

  const webhookPayload = {
    invoice_slug: 'test-checkout-slug',
    amount: 9990,
    paid_amount: 9990,
    installments: 1,
    capture_method: 'pix',
    transaction_nsu: 'TX-NSU-INFINITEPAY-TEST-123',
    order_nsu: invoice.id,
    receipt_url: 'https://comprovante.com/123'
  };

  const webhookRes = await InfinitePayProvider.handleWebhook(webhookPayload);
  
  const updatedInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
  const updatedSub = await prisma.subscription.findUnique({ where: { id: subA.id } });
  const payment = await prisma.payment.findFirst({ where: { invoiceId: invoice.id } });

  if (webhookRes.success && updatedInvoice?.status === 'paid' && updatedSub?.status === 'active' && payment?.status === 'paid') {
    console.log('PASS: Webhook marcou fatura como paga, ativou assinatura e atualizou pagamento');
  } else {
    throw new Error('FAIL: Webhook falhou ao atualizar faturas e planos');
  }

  // --- CENÁRIO 3: Idempotência do Webhook ---
  console.log('\n--- Cenário 3: Validando idempotência do webhook duplo ---');
  const doubleWebhookRes = await InfinitePayProvider.handleWebhook(webhookPayload);
  
  if (doubleWebhookRes.success && doubleWebhookRes.alreadyProcessed) {
    console.log('PASS: Webhook duplicado foi ignorado com sucesso (idempotência ok)');
  } else {
    throw new Error('FAIL: Webhook duplicado processou faturamento novamente');
  }

  // --- CENÁRIO 4: Divergência de valores no webhook ---
  console.log('\n--- Cenário 4: Validando rejeição por valor divergente ---');
  const invoice2 = await prisma.invoice.create({
    data: {
      id: 'invoice-test-uuid-different-amount',
      tenantId: tenantA.id,
      subscriptionId: subA.id,
      invoiceNumber: `INV-TEST-INFINITEPAY-2`,
      status: 'open',
      subtotalCents: 15000,
      discountCents: 0,
      totalCents: 15000,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      billingPeriodStart: now,
      billingPeriodEnd: end
    }
  });

  // Criar pagamento pendente fictício
  const payment2 = await prisma.payment.create({
    data: {
      tenantId: tenantA.id,
      invoiceId: invoice2.id,
      provider: 'infinitepay',
      method: 'pix',
      status: 'pending',
      amountCents: 15000,
      metadataJson: JSON.stringify({
        slug: 'test-checkout-slug-2',
        order_nsu: invoice2.id
      })
    }
  });

  const mismatchedWebhookPayload = {
    ...webhookPayload,
    order_nsu: invoice2.id,
    paid_amount: 9990 // enviado 99.90 para fatura de 150.00
  };

  try {
    await InfinitePayProvider.handleWebhook(mismatchedWebhookPayload);
    throw new Error('FAIL: Permitiu quitação de fatura com valor divergente');
  } catch (err: any) {
    if (err.message.includes('AMOUNT_MISMATCH')) {
      console.log('PASS: Quitação bloqueada devido a divergência de valores');
    } else {
      throw err;
    }
  }

  // --- CENÁRIO 5: Consulta de status ativa (payment_check) ---
  console.log('\n--- Cenário 5: Validando payment_check (consulta ativa) ---');
  setupFetchMock(200, {
    paid: true,
    transaction_nsu: 'TX-NSU-INFINITEPAY-TEST-456',
    receipt_url: 'https://comprovante.com/456'
  });

  const checkResult = await InfinitePayProvider.checkPaymentStatus(payment2.id);
  
  const finalInvoice2 = await prisma.invoice.findUnique({ where: { id: invoice2.id } });
  
  if (checkResult.success && checkResult.paid && finalInvoice2?.status === 'paid') {
    console.log('PASS: payment_check detectou pagamento ativo e atualizou fatura e plano');
  } else {
    throw new Error('FAIL: payment_check falhou ao quitar fatura pendente');
  }

  restoreFetch();

  // Limpeza final do banco
  await prisma.invoice.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.subscription.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });

  console.log('\n🎉 INFINITEPAY_PAYMENT_VALIDATION: PASS\n');
}

runTests().catch((error) => {
  console.error('\n❌ TESTE FALHOU:', error);
  process.exit(1);
});
