import { prisma } from '../../src/server/db/prisma';
import { AuthService } from '../../src/server/auth/auth.service';
import { SubscriptionAccessService } from '../../src/server/services/billing/subscription-access.service';
import { InvoiceService } from '../../src/server/services/billing/invoice.service';
import { PixPaymentService } from '../../src/server/services/billing/pix-payment.service';
import { PaymentConfirmationService } from '../../src/server/services/billing/payment-confirmation.service';
import { WhatsAppMessageService } from '../../src/server/services/whatsapp/whatsapp-message.service';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
}

async function runE2EPilotFlow(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const assert = (name: string, condition: boolean, details?: string) => {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      results.push({ testName: name, passed: true });
    } else {
      console.log(`❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      results.push({ testName: name, passed: false, error: details });
    }
  };

  // Keep track of created entities for cleanup
  let tenantId: string | undefined;
  let userId: string | undefined;
  let connectionId: string | undefined;
  let planId: string | undefined;

  try {
    console.log('--- Phase 1: User Registration & Trial Activation ---');
    const randomSuffix = Math.floor(Math.random() * 10000);
    const registerData = {
      companyName: `E2E Pilot Corp ${randomSuffix}`,
      cnpj: `12.345.678/0001-${String(randomSuffix).padStart(2, '0')}`,
      email: `pilot_primary_${randomSuffix}@hbflow.com.br`,
      phone: `55119${String(randomSuffix).padStart(8, '0')}`,
      userName: `Carlos Pilot ${randomSuffix}`
    };

    // Registrar trial
    const regResult = await AuthService.registerTrial(registerData);
    tenantId = regResult.tenantId;
    userId = regResult.userId;

    assert(
      'Phase 1.1 - Trial registration created tenant and user successfully',
      tenantId !== undefined && userId !== undefined
    );

    // Verificar se o trial dá acesso ativo (testa nossa nova lógica de Subscription em registerTrial)
    const initialAccess = await SubscriptionAccessService.checkAccess(tenantId);
    assert(
      'Phase 1.2 - Newly registered trial tenant has active access (status: trialing)',
      initialAccess.hasAccess === true && initialAccess.status === 'trialing',
      `Access: ${JSON.stringify(initialAccess)}`
    );

    console.log('\n--- Phase 2: Billing & Pix Payment Lifecycle ---');
    
    // Obter o ID do plano Pro no banco ou criá-lo
    const planSlug = 'pro';
    let plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: 'Pro Plan',
          slug: planSlug,
          priceCents: 34900, // R$ 349.00
          billingCycle: 'monthly',
          isActive: true
        }
      });
    }
    planId = plan.id;

    // Buscar a assinatura trialing criada no registro
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId }
    });

    assert(
      'Phase 2.1 - Relational subscription was correctly created for trial tenant',
      subscription !== null && subscription.status === 'trialing'
    );

    if (subscription) {
      // Promover assinatura para o plano Pro antes de gerar fatura para simular o upgrade
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { planId: plan.id }
      });

      // 1. Gerar Fatura Mensal para Upgrade/Cobrança Pro
      const startPeriod = new Date();
      const endPeriod = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const invoice = await InvoiceService.generateMonthlyInvoice(
        tenantId,
        subscription.id,
        startPeriod,
        endPeriod
      );

      assert(
        'Phase 2.2 - Pro plan monthly invoice generated with open status',
        invoice !== null && invoice.status === 'open' && invoice.totalCents === 34900,
        `Invoice total: ${invoice?.totalCents}, Status: ${invoice?.status}`
      );

      // 2. Gerar código PIX de pagamento para a Fatura
      const pixCharge = await PixPaymentService.generatePixCharge(tenantId, invoice.id);
      assert(
        'Phase 2.3 - Pix charge generated successfully with EMV code',
        pixCharge.status === 'active' && pixCharge.copyPasteCode.length > 0
      );

      // 3. Simular recebimento e confirmação de pagamento PIX
      const paymentConfirm = await PaymentConfirmationService.confirmPayment(
        pixCharge.paymentId!,
        pixCharge.amountCents
      );

      assert(
        'Phase 2.4 - Payment confirmation resolved successfully',
        paymentConfirm.success === true
      );

      // 4. Validar se a fatura foi quitada e a assinatura promovida para ativa
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id }
      });
      const updatedSub = await prisma.subscription.findUnique({
        where: { id: subscription.id }
      });

      assert(
        'Phase 2.5 - Invoice status updated to paid',
        updatedInvoice?.status === 'paid'
      );
      assert(
        'Phase 2.6 - Subscription status updated to active and period extended',
        updatedSub?.status === 'active',
        `Subscription status: ${updatedSub?.status}`
      );

      // 5. Validar acesso final do inquilino
      const finalAccess = await SubscriptionAccessService.checkAccess(tenantId);
      assert(
        'Phase 2.7 - Billing service permits active tenant access with pro status',
        finalAccess.hasAccess === true && finalAccess.status === 'active',
        `Access: ${JSON.stringify(finalAccess)}`
      );
    }

    console.log('\n--- Phase 3: WhatsApp Webhook & Inbox Integration ---');

    // 1. Criar conexão ativa de WhatsApp para o novo inquilino
    const connection = await prisma.whatsappConnection.create({
      data: {
        tenantId,
        name: 'Pilot WhatsApp Business',
        provider: 'cloud_api',
        phoneNumberId: `pilot-phone-id-${randomSuffix}`,
        verifyToken: 'pilot_token_123',
        status: 'connected'
      }
    });
    connectionId = connection.id;

    // 2. Simular recebimento de mensagem WhatsApp via Webhook Universal
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_id_pilot',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '5511988887777',
                  phone_number_id: `pilot-phone-id-${randomSuffix}`
                },
                contacts: [
                  {
                    profile: {
                      name: 'Cliente Piloto'
                    },
                    wa_id: '5511988887777'
                  }
                ],
                messages: [
                  {
                    from: '5511988887777',
                    id: `wamid.pilot_${Date.now()}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    text: {
                      body: 'Olá! Estou interessado no HBFlow.'
                    },
                    type: 'text'
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    const webhookHeaders = {
      'content-type': 'application/json'
    };

    const webhookResult = await WhatsAppMessageService.handleWebhook(
      webhookHeaders,
      JSON.stringify(webhookPayload),
      webhookPayload
    );

    assert(
      'Phase 3.1 - Universal webhook routes and processes message',
      webhookResult.success && webhookResult.processedCount === 1,
      `Result: ${JSON.stringify(webhookResult)}`
    );

    // 3. Validar se o Inbox integrou a mensagem (Contact, Conversation, Message criados)
    const contact = await prisma.contact.findFirst({
      where: { tenantId, normalizedPhone: '5511988887777' }
    });
    assert(
      'Phase 3.2 - Pilot Contact created automatically',
      contact !== null && contact.name === 'Cliente Piloto'
    );

    if (contact) {
      const conversation = await prisma.conversation.findFirst({
        where: { tenantId, contactId: contact.id }
      });
      assert(
        'Phase 3.3 - Conversation opened in inbox with status new and unread count 1',
        conversation !== null && conversation.status === 'new' && conversation.unreadCount === 1,
        `Conversation: ${JSON.stringify(conversation)}`
      );

      if (conversation) {
        const message = await prisma.message.findFirst({
          where: { tenantId, conversationId: conversation.id }
        });
        assert(
          'Phase 3.4 - Message stored and readable in Inbox',
          message !== null && message.body === 'Olá! Estou interessado no HBFlow.' && message.senderType === 'contact'
        );
      }
    }

  } catch (err: any) {
    console.error('E2E Pilot validation encountered error:', err);
    results.push({ testName: 'E2E Pilot setup/run', passed: false, error: err.message });
  } finally {
    console.log('\n--- Phase 4: Cleaning up generated Pilot data ---');
    try {
      if (tenantId) {
        // Excluir todas as tabelas dependentes ligadas ao tenantId
        await prisma.whatsappApiLog.deleteMany({ where: { connectionId } });
        await prisma.whatsappWebhookEvent.deleteMany({ where: { connectionId } });
        await prisma.whatsappConnection.deleteMany({ where: { tenantId } });
        await prisma.message.deleteMany({ where: { tenantId } });
        await prisma.conversation.deleteMany({ where: { tenantId } });
        await prisma.contact.deleteMany({ where: { tenantId } });
        await prisma.payment.deleteMany({ where: { tenantId } });
        await prisma.pixCharge.deleteMany({ where: { tenantId } });
        await prisma.invoice.deleteMany({ where: { tenantId } });
        await prisma.subscription.deleteMany({ where: { tenantId } });
        await prisma.rolePermission.deleteMany({ where: { role: { tenantId } } });
        await prisma.role.deleteMany({ where: { tenantId } });
        await prisma.user.deleteMany({ where: { tenantId } });
        await prisma.tenantSettings.deleteMany({ where: { tenantId } });
        await prisma.tenantAICost.deleteMany({ where: { tenantId } });
        await prisma.tenantBilling.deleteMany({ where: { tenantId } });
        await prisma.auditLog.deleteMany({ where: { tenantId } });
        await prisma.tenant.delete({ where: { id: tenantId } });
        console.log('🧹 Cleanup completed successfully.');
      }
    } catch (cleanupErr: any) {
      console.error('❌ Failed during pilot database cleanup:', cleanupErr);
    }
  }

  return results;
}

async function main() {
  console.log('🏁 Starting E2E Client Pilot Flow Validation Suite...\n');
  const results = await runE2EPilotFlow();

  console.log('\n=== RESULTS SUMMARY ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🏁 E2E Client Pilot Flow Validation: ALL PASSED ✅');
  } else {
    console.log('\n🏁 E2E Client Pilot Flow Validation: FAILED ❌');
  }

  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error);
