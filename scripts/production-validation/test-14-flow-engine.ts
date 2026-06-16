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
const { FlowEngineService } = require('../../src/server/services/whatsapp/flow-engine.service');

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
  let conversationId = '';
  let connectionId = '';
  let vendasDeptId = '';

  try {
    console.log('=== SETUP: Criando Tenant, Departamentos e Conexão de Teste ===');
    
    // 1. Criar Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: `FlowTest Tenant ${timestamp}`,
        slug: `flow-tenant-${timestamp}`,
        status: 'active',
        plan: 'pro',
      },
    });
    tenantId = tenant.id;
    console.log(`✅ Tenant criado: ${tenantId}`);

    // 2. Criar Departamento de Vendas
    const vendasDept = await prisma.department.create({
      data: {
        tenantId,
        name: 'Vendas',
        description: 'Setor Comercial de Teste',
        color: '#7C3AED',
        icon: 'ShoppingBag',
        distributionMode: 'manual',
        greetingMessage: 'Olá! Você foi encaminhado para Vendas. Em que posso ajudar?',
        isActive: true
      }
    });
    vendasDeptId = vendasDept.id;
    console.log(`✅ Departamento Vendas criado: ${vendasDeptId}`);

    // 3. Criar Conexão WhatsApp simulada
    const connection = await prisma.whatsappConnection.create({
      data: {
        tenantId,
        name: 'Conexão Simulação Teste',
        provider: 'cloud_api',
        phoneNumber: '+5511999991111',
        phoneNumberId: `sim_${timestamp}`,
        status: 'connected'
      }
    });
    connectionId = connection.id;
    console.log(`✅ Conexão WhatsApp simulada criada: ${connectionId}`);

    // 4. Criar Contato de Teste
    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name: 'Renata Passatuti',
        phone: '+5511988880000',
        normalizedPhone: '5511988880000',
        type: 'lead',
        source: 'whatsapp',
        status: 'lead'
      }
    });
    contactId = contact.id;
    console.log(`✅ Contato criado: ${contactId} (${contact.name})`);

    // 5. Criar Conversa de Teste
    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        contactId,
        channelId: connectionId,
        status: 'new',
        subject: `Mensagem via WhatsApp - ${contact.name}`
      }
    });
    conversationId = conversation.id;
    console.log(`✅ Conversa criada: ${conversationId}`);

    // --- Cenário 1: Primeira mensagem do cliente (Olá) ---
    console.log('\n--- Cenário 1: Cliente envia "Olá" (Dispara Triagem) ---');
    
    // Criar a primeira mensagem do cliente no banco
    await prisma.message.create({
      data: {
        tenantId,
        conversationId,
        senderType: 'contact',
        senderName: contact.name,
        body: 'Olá',
        type: 'text',
        status: 'delivered'
      }
    });

    await FlowEngineService.processMessage(
      tenantId,
      conversationId,
      contactId,
      'Olá',
      connectionId
    );

    // Verificar se a sessão de fluxo foi iniciada
    const session = await prisma.flowSession.findFirst({
      where: { conversationId, tenantId }
    });

    const scenario1Passed = session !== null && session.status === 'active' && session.currentNodeId === 'node-choice';
    console.log(`${scenario1Passed ? '✅' : '❌'} Sessão de fluxo ativa no nó de menu: ${session?.currentNodeId}`);

    // Verificar se as mensagens automáticas foram criadas no banco
    const autoMessages = await prisma.message.findMany({
      where: { conversationId, senderType: 'automation' }
    });

    console.log(`Mensagens automatizadas geradas: ${autoMessages.length}`);
    autoMessages.forEach((m: any) => console.log(` - [${m.senderType}]: ${m.body.substring(0, 40)}...`));

    results.push({
      testName: 'Disparar fluxo inicial ao receber mensagem',
      passed: scenario1Passed && autoMessages.length >= 2,
      evidence: { sessionId: session?.id, currentNodeId: session?.currentNodeId, autoMessagesCount: autoMessages.length }
    });

    // --- Cenário 2: Cliente seleciona a opção "1" ---
    console.log('\n--- Cenário 2: Cliente responde "1" (Roteamento Comercial) ---');

    // Registrar resposta "1" do cliente no banco
    await prisma.message.create({
      data: {
        tenantId,
        conversationId,
        senderType: 'contact',
        senderName: contact.name,
        body: '1',
        type: 'text',
        status: 'delivered'
      }
    });

    await FlowEngineService.processMessage(
      tenantId,
      conversationId,
      contactId,
      '1',
      connectionId
    );

    // Verificar se a sessão avançou e foi transferida/encerrada
    const sessionAfter = await prisma.flowSession.findFirst({
      where: { conversationId, tenantId }
    });

    // Verificar se a conversa foi atualizada com o setor correto
    const conversationAfter = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    const scenario2Passed = sessionAfter?.status === 'transferred' && conversationAfter?.departmentId === vendasDeptId;
    console.log(`${scenario2Passed ? '✅' : '❌'} Sessão finalizada como transferida: ${sessionAfter?.status}`);
    console.log(`Departamento final da conversa: ${conversationAfter?.departmentId} (Esperado Vendas: ${vendasDeptId})`);

    // Verificar se a saudação do departamento foi inserida
    const salesWelcome = await prisma.message.findFirst({
      where: {
        conversationId,
        senderType: 'automation',
        body: { contains: 'encaminhado para Vendas' }
      }
    });

    console.log(`Mensagem de boas-vindas do departamento de vendas criada: ${salesWelcome ? 'Sim' : 'Não'}`);

    results.push({
      testName: 'Avançar e rotear conversa com resposta válida',
      passed: scenario2Passed && salesWelcome !== null,
      evidence: { sessionStatus: sessionAfter?.status, departmentId: conversationAfter?.departmentId, salesWelcomeBody: salesWelcome?.body }
    });

  } catch (error: any) {
    console.error('❌ Erro durante a execução dos testes:', error);
    results.push({
      testName: 'Execução de Testes sem Erros Graves',
      passed: false,
      evidence: null,
      error: error.message || String(error)
    });
  } finally {
    console.log('\n=== CLEANUP: Removendo registros criados ===');
    try {
      if (conversationId) await prisma.message.deleteMany({ where: { conversationId } });
      if (conversationId) await prisma.flowSession.deleteMany({ where: { conversationId } });
      if (conversationId) await prisma.routingLog.deleteMany({ where: { conversationId } });
      if (conversationId) await prisma.conversation.delete({ where: { id: conversationId } });
      if (contactId) await prisma.contact.delete({ where: { id: contactId } });
      if (connectionId) await prisma.whatsappConnection.delete({ where: { id: connectionId } });
      if (vendasDeptId) await prisma.department.delete({ where: { id: vendasDeptId } });
      
      // Deletar o fluxo bootstrapped se foi criado
      if (tenantId) {
        const flow = await prisma.flow.findFirst({ where: { tenantId } });
        if (flow) {
          await prisma.flowNode.deleteMany({ where: { flowId: flow.id } });
          await prisma.flowEdge.deleteMany({ where: { flowId: flow.id } });
          await prisma.flow.delete({ where: { id: flow.id } });
        }
        await prisma.tenant.delete({ where: { id: tenantId } });
      }
      console.log('✅ Banco de dados limpo com sucesso.');
    } catch (cleanErr) {
      console.error('⚠️ Falha ao limpar o banco:', cleanErr);
    }

    await prisma.$disconnect();
  }

  return results;
}

runTests().then((results) => {
  console.log('\n=== RESULTADOS FINAIS DOS TESTES ===');
  let allPassed = true;
  results.forEach((r) => {
    console.log(`- ${r.passed ? '✅ PASSED' : '❌ FAILED'}: ${r.testName}`);
    if (!r.passed) {
      allPassed = false;
      if (r.error) console.log(`  Erro: ${r.error}`);
    }
  });

  if (allPassed) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
    process.exit(0);
  } else {
    console.log('\n❌ ALGUNS TESTES FALHARAM.');
    process.exit(1);
  }
});
