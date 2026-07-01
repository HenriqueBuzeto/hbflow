import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Limpar dados existentes (cuidado em produção!)
  console.log('🧹 Cleaning existing data...');
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.contactTag.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.task.deleteMany();
  await prisma.dealActivity.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.userDepartment.deleteMany();
  await prisma.department.deleteMany();
  await prisma.flowSession.deleteMany();
  await prisma.flowEdge.deleteMany();
  await prisma.flowNode.deleteMany();
  await prisma.flow.deleteMany();
  await prisma.automationExecution.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.slaRule.deleteMany();
  await prisma.whatsappConnection.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.quickReply.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('✅ Data cleaned');

  // Criar Tenant Demo
  console.log('🏢 Creating demo tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      name: 'HBFlow Demo',
      slug: 'hbflow-demo',
      plan: 'pro',
      isActive: true,
    },
  });

  // Criar Roles
  console.log('👥 Creating roles...');
  const adminRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Administrador com acesso total ao sistema',
    },
  });

  // Criar Permissões
  console.log('🔐 Creating permissions...');
  const permissions = [
    'dashboard.view',
    'inbox.view',
    'inbox.claim',
    'inbox.transfer',
    'inbox.resolve',
    'contacts.view',
    'contacts.create',
    'contacts.edit',
    'contacts.delete',
    'pipeline.view',
    'pipeline.edit',
    'deals.view',
    'deals.create',
    'deals.edit',
    'deals.delete',
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'tasks.delete',
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',
    'reports.view',
    'settings.view',
    'settings.edit',
    'ai.agents.view',
    'ai.agents.edit',
    'flows.view',
    'flows.create',
    'flows.edit',
    'campaigns.view',
    'campaigns.create',
    'campaigns.edit',
  ];

  for (const permName of permissions) {
    await prisma.permission.create({
      data: {
        tenantId: tenant.id,
        name: permName,
        description: `${permName} permission`,
      },
    });
  }

  // Criar Usuários
  console.log('👤 Creating users...');
  const hiquePasswordHash = await bcrypt.hash('Hique03@', 12);
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Henrique Buzeto (Financeiro)',
      email: 'hbdevstudio@gmail.com',
      passwordHash: hiquePasswordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  // Criar Departments
  console.log('🏗️ Creating departments...');
  const vendasDept = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      name: 'Vendas',
      description: 'Departamento de vendas',
      color: '#10B981',
      icon: 'DollarSign',
      distributionMode: 'workload',
      slaFirstResponseMinutes: 10,
      slaResolutionMinutes: 30,
      isActive: true,
    },
  });

  const suporteDept = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      name: 'Suporte',
      description: 'Departamento de suporte técnico',
      color: '#3B82F6',
      icon: 'Headphones',
      distributionMode: 'round_robin',
      slaFirstResponseMinutes: 15,
      slaResolutionMinutes: 60,
      isActive: true,
    },
  });

  const financeiroDept = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      name: 'Financeiro',
      description: 'Departamento financeiro',
      color: '#F59E0B',
      icon: 'CreditCard',
      distributionMode: 'manual',
      slaFirstResponseMinutes: 30,
      slaResolutionMinutes: 120,
      isActive: true,
    },
  });

  // Associar usuários aos departamentos
  await prisma.userDepartment.createMany({
    data: [
      { tenantId: tenant.id, userId: adminUser.id, departmentId: vendasDept.id, priority: 1 },
      { tenantId: tenant.id, userId: adminUser.id, departmentId: suporteDept.id, priority: 1 },
      { tenantId: tenant.id, userId: adminUser.id, departmentId: financeiroDept.id, priority: 1 },
    ],
  });

  // Criar Pipeline
  console.log('📊 Creating pipeline...');
  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'Pipeline de Vendas',
    },
  });

  const pipelineStages = [
    { name: 'Novo Lead', position: 0 },
    { name: 'Em Atendimento', position: 1 },
    { name: 'Proposta Enviada', position: 2 },
    { name: 'Negociação', position: 3 },
    { name: 'Fechado Ganho', position: 4 },
    { name: 'Fechado Perdido', position: 5 },
  ];

  for (const stage of pipelineStages) {
    await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        name: stage.name,
        position: stage.position,
      },
    });
  }

  // Criar Quick Replies
  console.log('💬 Creating quick replies...');
  await prisma.quickReply.createMany({
    data: [
      {
        tenantId: tenant.id,
        shortcut: '/obrigado',
        message: 'Obrigado pelo contato! Em breve retornaremos.',
      },
      {
        tenantId: tenant.id,
        shortcut: '/aguarde',
        message: 'Por favor, aguarde um momento enquanto verificamos suas informações.',
      },
      {
        tenantId: tenant.id,
        shortcut: '/horario',
        message: 'Nosso horário de atendimento é de Seg a Sex, das 9h às 18h.',
      },
    ],
  });

  // Criar Message Templates
  await prisma.messageTemplate.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: 'Boas-vindas',
        category: 'UTILITY',
        language: 'pt_BR',
        body: 'Olá! Bem-vindo à HBFlow. Como podemos ajudar?',
        status: 'approved',
      },
      {
        tenantId: tenant.id,
        name: 'Confirmação de Pedido',
        category: 'UTILITY',
        language: 'pt_BR',
        body: 'Seu pedido foi confirmado e será enviado em breve.',
        status: 'approved',
      },
    ],
  });

  // Criar Agentes de IA (15 standard)
  console.log('🤖 Creating AI agents...');
  const agentConfigs = [
    'triage-agent',
    'sdr-agent',
    'summary-agent',
    'sentiment-agent',
    'classification-agent',
    'extraction-agent',
    'translation-agent',
    'response-generator',
    'followup-agent',
    'qualification-agent',
    'lead-scoring-agent',
    'intent-detection-agent',
    'knowledge-base-agent',
    'escalation-agent',
    'feedback-agent',
  ];

  for (const agentId of agentConfigs) {
    await prisma.agentConfig.create({
      data: {
        tenantId: tenant.id,
        agentId,
        enabled: true,
        settings: JSON.stringify({
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 1000,
        }),
      },
    });
  }

  // Criar Tags
  console.log('🏷️ Creating tags...');
  await prisma.tag.createMany({
    data: [
      { name: 'VIP', color: '#F59E0B' },
      { name: 'Novo Cliente', color: '#10B981' },
      { name: 'Em Negociação', color: '#3B82F6' },
      { name: 'Urgente', color: '#EF4444' },
      { name: 'Lead Frio', color: '#6B7280' },
    ],
  });

  // Criar Contacts Demo
  console.log('👥 Creating demo contacts...');
  const contacts = [
    {
      name: 'João Silva',
      phone: '+5511987654321',
      email: 'joao.silva@email.com',
      type: 'lead',
      status: 'lead',
      temperature: 'warm',
    },
    {
      name: 'Maria Santos',
      phone: '+5511976543210',
      email: 'maria.santos@email.com',
      type: 'customer',
      status: 'lead',
      temperature: 'hot',
    },
  ];

  const createdContacts = [];
  for (const contact of contacts) {
    const normalizedPhone = contact.phone.replace(/\D/g, '');
    const created = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        name: contact.name,
        phone: contact.phone,
        normalizedPhone,
        email: contact.email,
      },
    });
    createdContacts.push(created);
  }

  // Criar Conversations Demo
  console.log('💬 Creating demo conversations...');
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { position: 'asc' },
  });

  for (let i = 0; i < 2; i++) {
    const contact = createdContacts[i];
    const conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        assignedUserId: adminUser.id,
        status: 'open',
      },
    });

    // Criar Messages
    await prisma.message.createMany({
      data: [
        {
          tenantId: tenant.id,
          conversationId: conversation.id,
          senderType: 'contact',
          body: i === 0 ? 'Olá, gostaria de saber mais sobre seus serviços.' : 'Como posso ajudar?',
          type: 'text',
          createdAt: new Date(Date.now() - (i * 3600000 + 1800000)),
        },
        {
          tenantId: tenant.id,
          conversationId: conversation.id,
          senderType: 'user',
          senderId: adminUser.id,
          body: 'Olá! Claro, em que posso ser útil?',
          type: 'text',
          createdAt: new Date(Date.now() - (i * 3600000 + 900000)),
        },
      ],
    });

    // Criar Deal
    const deal = await prisma.deal.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: stages[i % stages.length].id,
        ownerUserId: adminUser.id,
        title: `Negócio com ${contact.name}`,
        value: Math.floor(Math.random() * 50000) + 10000,
      },
    });

    // Criar Deal Activity
    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        type: 'stage_change',
        content: `Deal movido para ${stages[i % stages.length].name}`,
      },
    });
  }

  // Criar Tasks Demo
  console.log('✅ Creating demo tasks...');
  await prisma.task.createMany({
    data: [
      {
        tenantId: tenant.id,
        contactId: createdContacts[0].id,
        assignedUserId: adminUser.id,
        title: 'Ligar para cliente - Follow-up',
        type: 'call',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'high',
        status: 'pending',
      }
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📝 Credentials:');
  console.log('   Email: hbdevstudio@gmail.com');
  console.log('   Password: Hique03@');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
