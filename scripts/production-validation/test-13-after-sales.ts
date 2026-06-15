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
const { JourneyEngineService } = require('../../src/server/services/whatsapp/journey-engine.service');
const { OptOutHandler } = require('../../src/server/services/whatsapp/optout-handler');

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

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const timestamp = Date.now();
  let tenantId = '';
  let contactId = '';
  let journeyId = '';
  let contactJourneyId = '';

  try {
    console.log('=== SETUP: Criando Tenant, Contato e Jornada de Teste ===');
    
    // 1. Criar Tenant no Plano Pro
    const tenant = await prisma.tenant.create({
      data: {
        name: `JourneyTest Tenant ${timestamp}`,
        slug: `journey-tenant-${timestamp}`,
        status: 'active',
        plan: 'pro',
      },
    });
    tenantId = tenant.id;
    console.log(`✅ Tenant criado: ${tenantId} (Plano: pro)`);

    // 2. Criar Contato de Teste
    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name: 'Carlos Eduardo Santos',
        phone: '+5511988887777',
        normalizedPhone: '+5511988887777',
        email: 'carloseduardo@gmail.com',
        type: 'lead',
        source: 'manual',
        status: 'lead',
        temperature: 'warm',
        score: 10,
        totalPurchased: 150.00,
        firstInteractionAt: new Date(),
        lastInteractionAt: new Date(),
        marketingOptOut: false
      },
    });
    contactId = contact.id;
    console.log(`✅ Contato criado: ${contactId} (${contact.name})`);

    // 3. Criar Jornada de Teste no Banco de Dados
    const journey = await prisma.journey.create({
      data: {
        tenantId,
        name: 'Jornada Pós-Venda Óticas Teste',
        description: 'Jornada premium para óculos de sol',
        trigger: 'sale_completed',
        isActive: true,
        steps: {
          create: [
            {
              name: 'Agradecimento Imediato',
              delayValue: 10,
              delayUnit: 'minutes',
              message: 'Olá {primeiroNome}, obrigado pela sua compra na {empresa}! Seu produto {produto} de valor {valor} foi faturado em {dataCompra}.',
              order: 1,
              isActive: true
            },
            {
              name: 'Feedback de 7 Dias',
              delayValue: 7,
              delayUnit: 'days',
              message: 'Oi {nome}! Faz 7 dias que você adquiriu o {produto} conosco na {empresa}. Tudo certo com ele? Qualquer dúvida, fale com o atendente {atendente}.',
              order: 2,
              isActive: true
            }
          ]
        }
      },
      include: {
        steps: true
      }
    });
    journeyId = journey.id;
    console.log(`✅ Jornada criada com ${journey.steps.length} etapas.`);

    // --- Cenário 1: Disparar a Jornada para o Contato ---
    console.log('\n--- Cenário 1: Disparo da Jornada por Gatilho ---');
    const contextData = {
      companyName: 'Óticas Lux',
      productName: 'Ray-Ban Aviator Classic',
      value: 899.90,
      createdAt: new Date().toISOString(),
      operatorName: 'Mariana Silva'
    };

    const triggered = await JourneyEngineService.triggerJourneyForContact(
      tenantId,
      contactId,
      'sale_completed',
      contextData
    );

    const scenario1Passed = triggered === true;
    console.log(`${scenario1Passed ? '✅' : '❌'} Disparo executado: ${triggered}`);
    results.push({
      testName: 'Disparar jornada com sucesso para contato ativo',
      passed: scenario1Passed,
      evidence: { triggered },
    });

    // --- Cenário 2: Verificar a Instância da Jornada do Contato ---
    console.log('\n--- Cenário 2: Verificar ContactJourney criada ---');
    const contactJourney = await prisma.contactJourney.findFirst({
      where: {
        tenantId,
        contactId,
        journeyId,
        status: 'active'
      }
    });

    const scenario2Passed = contactJourney !== null;
    if (contactJourney) {
      contactJourneyId = contactJourney.id;
    }
    console.log(`${scenario2Passed ? '✅' : '❌'} ContactJourney encontrada: ID ${contactJourneyId}`);
    results.push({
      testName: 'Criar registro ContactJourney com status active',
      passed: scenario2Passed,
      evidence: { contactJourney },
    });

    // --- Cenário 3: Verificar Agendamento das Etapas e Substituição de Variáveis ---
    console.log('\n--- Cenário 3: Validar ScheduledMessages geradas ---');
    const scheduledMessages = await prisma.scheduledMessage.findMany({
      where: {
        tenantId,
        contactId,
        journeyId,
        contactJourneyId,
        status: 'pending'
      },
      orderBy: {
        step: {
          order: 'asc'
        }
      },
      include: {
        step: true
      }
    });

    const hasTwoMessages = scheduledMessages.length === 2;
    let variablesPassed = false;
    let datesPassed = false;

    if (hasTwoMessages) {
      const msg1 = scheduledMessages[0];
      const msg2 = scheduledMessages[1];

      // Verificar substituição de variáveis
      const expectedText1 = 'Olá Carlos, obrigado pela sua compra na Óticas Lux! Seu produto Ray-Ban Aviator Classic de valor R$ 899,90 foi faturado em';
      const expectedText2 = 'Oi Carlos Eduardo Santos! Faz 7 dias que você adquiriu o Ray-Ban Aviator Classic conosco na Óticas Lux. Tudo certo com ele? Qualquer dúvida, fale com o atendente Mariana Silva.';
      
      const containsMsg1 = msg1.content.includes('Carlos') && msg1.content.includes('Óticas Lux') && msg1.content.includes('Ray-Ban') && msg1.content.includes('899,90');
      const containsMsg2 = msg2.content.includes('Carlos Eduardo Santos') && msg2.content.includes('Mariana Silva');

      variablesPassed = containsMsg1 && containsMsg2;
      console.log(`- Mensagem 1: "${msg1.content}"`);
      console.log(`- Mensagem 2: "${msg2.content}"`);
      console.log(`- Variáveis corretas: ${variablesPassed}`);

      // Verificar as datas de agendamento calculadas
      const now = new Date();
      const diff1 = msg1.scheduledAt.getTime() - now.getTime(); // Deveria ser ~10 minutos (600.000 ms)
      const diff2 = msg2.scheduledAt.getTime() - now.getTime(); // Deveria ser ~7 dias (604.800.000 ms)

      const isMinutesDiffOk = diff1 > 0 && diff1 < 15 * 60 * 1000;
      const isDaysDiffOk = diff2 > 6 * 24 * 60 * 60 * 1000 && diff2 < 8 * 24 * 60 * 60 * 1000;
      datesPassed = isMinutesDiffOk && isDaysDiffOk;
      console.log(`- Datas calculadas corretamente: ${datesPassed} (Atraso 1: ${Math.round(diff1 / 1000)}s, Atraso 2: ${Math.round(diff2 / 1000 / 60 / 60)}h)`);
    }

    const scenario3Passed = hasTwoMessages && variablesPassed && datesPassed;
    results.push({
      testName: 'Agendar mensagens corretamente com atraso e variáveis resolvidas',
      passed: scenario3Passed,
      evidence: { count: scheduledMessages.length, variablesPassed, datesPassed },
    });

    // --- Cenário 4: Processamento de Opt-Out ---
    console.log('\n--- Cenário 4: Testar fluxo de Opt-Out ---');
    const optOutHandled = await OptOutHandler.handleIncomingMessage(
      tenantId,
      contactId,
      'PARAR'
    );

    // Verificar se o opt-out foi acionado
    const contactAfter = await prisma.contact.findUnique({
      where: { id: contactId }
    });
    const contactOptedOut = contactAfter?.marketingOptOut === true;

    // Verificar se a jornada e agendamentos foram cancelados
    const journeyAfter = await prisma.contactJourney.findUnique({
      where: { id: contactJourneyId }
    });
    const journeyCancelled = journeyAfter?.status === 'cancelled';

    const remainingScheduled = await prisma.scheduledMessage.findMany({
      where: { contactJourneyId }
    });
    const allCancelled = remainingScheduled.every((m: any) => m.status === 'cancelled');

    const scenario4Passed = optOutHandled && contactOptedOut && journeyCancelled && allCancelled;
    console.log(`- Opt-out capturado pelo handler: ${optOutHandled}`);
    console.log(`- Flag marketingOptOut ativada no Contato: ${contactOptedOut}`);
    console.log(`- Status da Jornada cancelado: ${journeyCancelled}`);
    console.log(`- Todos os agendamentos pendentes cancelados: ${allCancelled} (${remainingScheduled.filter((m: any) => m.status === 'cancelled').length} de ${remainingScheduled.length})`);

    results.push({
      testName: 'Processar palavra-chave PARAR, ativando opt-out e cancelando fila de envios',
      passed: scenario4Passed,
      evidence: { optOutHandled, contactOptedOut, journeyCancelled, allCancelled },
    });

  } catch (error) {
    console.error('❌ Erro na execução dos testes:', error);
    results.push({
      testName: 'Fluxo Geral de Jornadas e Opt-Out',
      passed: false,
      evidence: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  } finally {
    // Limpar os dados criados no banco Neon
    console.log('\n=== CLEANUP: Removendo dados temporários do banco ===');
    if (tenantId) {
      try {
        await prisma.tenant.delete({
          where: { id: tenantId }
        });
        console.log('✅ Tenant e dados vinculados removidos com sucesso.');
      } catch (cleanupErr) {
        console.error('⚠️ Falha ao limpar tenant temporário:', cleanupErr);
      }
    }
    await prisma.$disconnect();
  }

  return results;
}

async function main() {
  console.log('=== TESTE DE VALIDAÇÃO: CUSTOMER JOURNEY AUTOMATION (PÓS-VENDA) ===');
  console.log('Iniciando Teste E2E de Motor de Jornadas e Opt-out...\n');

  const results = await runTests();

  console.log('\n=== RESULTADO DOS CENÁRIOS ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total de testes: ${results.length}`);
  console.log(`Aprovados: ${passed}`);
  console.log(`Falhos: ${failed}`);
  console.log(`Taxa de Sucesso: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n✅ TEST 13 (AFTER-SALES MOTOR): APROVADO');
    process.exit(0);
  } else {
    console.log('\n❌ TEST 13 (AFTER-SALES MOTOR): FALHOU');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}: ${r.error || 'Verifique evidências'}`);
    });
    process.exit(1);
  }
}

main().catch(console.error);
