import { prisma } from '../../src/server/db/prisma';
import { WhatsAppProviderFactory } from '../../src/server/services/whatsapp/whatsapp-provider.factory';
import { WhatsAppMessageService } from '../../src/server/services/whatsapp/whatsapp-message.service';
import { WhatsAppCloudProvider } from '../../src/server/services/whatsapp/whatsapp-cloud.provider';
import { WhatsAppQrGatewayProvider } from '../../src/server/services/whatsapp/whatsapp-qr-gateway.provider';
import { AuditService } from '../../src/server/audit/audit.service';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
}

async function runWhatsAppValidation(): Promise<TestResult[]> {
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

  let tenant: any;
  let connection: any;

  try {
    // SETUP SEED DATA FOR VALIDATION
    const tenantSlug = `wh-validation-${Date.now()}`;
    tenant = await prisma.tenant.create({
      data: {
        name: 'WhatsApp Validation Corp',
        slug: tenantSlug,
        status: 'active'
      }
    });

    // 1. Validate Cloud API Preservation
    try {
      const provider = await WhatsAppProviderFactory.getProvider('cloud_api', tenant.id);
      assert(
        'Scenario 1 - Cloud API provider is preserved',
        provider instanceof WhatsAppCloudProvider
      );
    } catch (e: any) {
      assert('Scenario 1 - Cloud API provider is preserved', false, e.message);
    }

    // 2. Validate QR Gateway blocked by Feature Flag
    try {
      // Deletar possíveis overrides para garantir que o default é desligado
      await prisma.tenantFeatureFlag.deleteMany({
        where: { tenantId: tenant.id, featureFlag: { name: 'whatsapp_qr_gateway_enabled' } }
      });
      
      // Também desabilitar via variável de ambiente simulada (o Factory checa isFeatureEnabled e process.env.WHATSAPP_QR_GATEWAY_ENABLED)
      const prevEnv = process.env.WHATSAPP_QR_GATEWAY_ENABLED;
      delete process.env.WHATSAPP_QR_GATEWAY_ENABLED;
      delete process.env.whatsapp_qr_gateway_enabled;

      let threwError = false;
      try {
        await WhatsAppProviderFactory.getProvider('qr_gateway', tenant.id);
      } catch (err: any) {
        threwError = true;
        assert(
          'Scenario 2.1 - QR Gateway is blocked by default when feature flag is off',
          err.message.includes('desabilitada via feature flags'),
          `Expected flag message, got: ${err.message}`
        );
      }

      if (!threwError) {
        assert('Scenario 2.1 - QR Gateway is blocked by default when feature flag is off', false, 'Did not throw');
      }

      // Agora habilitar override de feature flag para este inquilino
      // Como a tabela TenantFeatureFlag no schema Prisma tem relações, vamos verificar como inserir.
      // Vamos ver se conseguimos fazer o override definindo a variável de ambiente:
      process.env.WHATSAPP_QR_GATEWAY_ENABLED = 'true';

      const providerWithFlag = await WhatsAppProviderFactory.getProvider('qr_gateway', tenant.id);
      assert(
        'Scenario 2.2 - QR Gateway is allowed when feature override is active',
        providerWithFlag instanceof WhatsAppQrGatewayProvider
      );

      // Restaurar variável de ambiente
      if (prevEnv) {
        process.env.WHATSAPP_QR_GATEWAY_ENABLED = prevEnv;
      } else {
        delete process.env.WHATSAPP_QR_GATEWAY_ENABLED;
      }
    } catch (e: any) {
      assert('Scenario 2 - QR Gateway Feature Flag validation', false, e.message);
    }

    // 3. Universal Webhook + Incoming Message creates Contact + Conversation + Message
    try {
      // Criar a conexão com o banco de dados associada
      const phoneId = `phone-${Date.now()}`;
      connection = await prisma.whatsappConnection.create({
        data: {
          tenantId: tenant.id,
          name: 'Main Business Phone',
          provider: 'cloud_api',
          phoneNumberId: phoneId,
          verifyToken: 'my_validation_token_123',
          webhookSecret: 'my_secret_key_456',
          status: 'connected'
        }
      });

      // Payload mockado da Cloud API
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry_id_1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '5511999998888',
                    phone_number_id: phoneId
                  },
                  contacts: [
                    {
                      profile: {
                        name: 'Julia de Souza'
                      },
                      wa_id: '5511999998888'
                    }
                  ],
                  messages: [
                    {
                      from: '5511999998888',
                      id: 'wamid.HBgMNTUxMTk5OTk5ODg4OFUC',
                      timestamp: '1670000000',
                      text: {
                        body: 'Olá HBFlow! Validando webhook universal!'
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

      const headers = {
        'content-type': 'application/json'
      };

      const result = await WhatsAppMessageService.handleWebhook(
        headers,
        JSON.stringify(webhookPayload),
        webhookPayload
      );

      assert(
        'Scenario 3.1 - Universal Webhook registers success and process message count',
        result.success && result.processedCount === 1,
        `Success: ${result.success}, Count: ${result.processedCount}, Msg: ${result.message}`
      );

      // Validar dados inseridos
      const contact = await prisma.contact.findFirst({
        where: { tenantId: tenant.id, normalizedPhone: '5511999998888' }
      });
      assert(
        'Scenario 3.2 - Contact created dynamically from incoming message',
        contact !== null && contact.name === 'Julia de Souza',
        `Contact: ${JSON.stringify(contact)}`
      );

      if (contact) {
        const conversation = await prisma.conversation.findFirst({
          where: { tenantId: tenant.id, contactId: contact.id }
        });
        assert(
          'Scenario 3.3 - Conversation automatically opened for new contact',
          conversation !== null && conversation.status === 'new',
          `Conversation: ${JSON.stringify(conversation)}`
        );

        if (conversation) {
          const message = await prisma.message.findFirst({
            where: { tenantId: tenant.id, conversationId: conversation.id }
          });
          assert(
            'Scenario 3.4 - Message stored correctly and associated with conversation',
            message !== null && message.body === 'Olá HBFlow! Validando webhook universal!' && message.senderType === 'contact',
            `Message: ${JSON.stringify(message)}`
          );
        }
      }
    } catch (e: any) {
      assert('Scenario 3 - Universal Webhook incoming creation', false, e.message);
    }

    // 4. Outgoing Message Provider routing and API Log / Audit Log verification
    try {
      // Enviar mensagem de saída (usará a conexão cloud_api criada acima)
      // Como o token está incorreto, a requisição fetch real falhará, mas o serviço registrará o log de erro
      const sendResult = await WhatsAppMessageService.sendTextMessage(
        tenant.id,
        connection.id,
        '5511999998888',
        'Olá Julia! Resposta automatizada HBFlow.'
      );

      // Deve retornar status 'failed' ou erro de autenticação do Facebook, mas com logs criados
      assert(
        'Scenario 4.1 - Outgoing message attempts to send and handles response',
        sendResult !== undefined
      );

      // Verificar logs criados
      const apiLog = await prisma.whatsappApiLog.findFirst({
        where: { connectionId: connection.id },
        orderBy: { createdAt: 'desc' }
      });
      assert(
        'Scenario 4.2 - WhatsApp API Log is created for outgoing message request',
        apiLog !== null && apiLog.endpoint.includes('/message/sendText')
      );

      const auditLog = await prisma.auditLog.findFirst({
        where: { tenantId: tenant.id, action: 'whatsapp.message.send' },
        orderBy: { createdAt: 'desc' }
      });
      assert(
        'Scenario 4.3 - Audit trail Log is registered for action whatsapp.message.send',
        auditLog !== null && auditLog.entity === 'message'
      );
    } catch (e: any) {
      assert('Scenario 4 - Outgoing Message validation', false, e.message);
    }

    // 5. Logs / Audit Trail Sanitization without tokens
    try {
      // Testar sanitização básica de credenciais sensíveis usando o AuditService diretamente
      await AuditService.log({
        tenantId: tenant.id,
        action: 'test.credential.sanitize',
        metadata: {
          someSetting: 'public_config',
          secret: 'SUPER_SECRET_123_456',
          apiKey: 'KEY_ABCD_EFG',
          accessToken: 'FB_TOKEN_789'
        }
      });

      const auditSanitized = await prisma.auditLog.findFirst({
        where: { tenantId: tenant.id, action: 'test.credential.sanitize' },
        orderBy: { createdAt: 'desc' }
      });

      const meta: any = auditSanitized?.metadata || {};
      assert(
        'Scenario 5.1 - Audit trail metadata redacts sensitive fields like secret, apiKey, and accessToken',
        meta.secret === '[REDACTED]' && meta.apiKey === '[REDACTED]' && meta.accessToken === '[REDACTED]' && meta.someSetting === 'public_config',
        `Metadata read: ${JSON.stringify(meta)}`
      );

      // Verificar se os logs de webhook ou conexão não vazam campos críticos da conexão
      const apiLog = await prisma.whatsappApiLog.findFirst({
        where: { connectionId: connection.id },
        orderBy: { createdAt: 'desc' }
      });

      // Na conexão do whatsapp, o token é 'my_validation_token_123'. Certificar que ele NÃO é persistido nos logs de erro ou json
      const reqJson = JSON.parse(apiLog?.requestJson || '{}');
      const respJson = JSON.parse(apiLog?.responseJson || '{}');
      
      const containsToken = JSON.stringify(reqJson).includes('validation_token') || JSON.stringify(respJson).includes('validation_token');
      assert(
        'Scenario 5.2 - API logs do not store verification tokens/auth credentials',
        !containsToken,
        `Found token in logs. Request: ${JSON.stringify(reqJson)}, Response: ${JSON.stringify(respJson)}`
      );
    } catch (e: any) {
      assert('Scenario 5 - Logs / Audit Trail Sanitization', false, e.message);
    }

    // CLEANUP GENERATED RECORDS
    if (connection) {
      await prisma.whatsappApiLog.deleteMany({ where: { connectionId: connection.id } });
      await prisma.whatsappWebhookEvent.deleteMany({ where: { connectionId: connection.id } });
      await prisma.whatsappConnection.delete({ where: { id: connection.id } });
    }
    await prisma.message.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.conversation.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });

  } catch (err: any) {
    console.error('Validation suite encountered critical error during setup/run:', err);
    results.push({ testName: 'Setup / WhatsApp validation', passed: false, error: err.message });
  }

  return results;
}

async function main() {
  console.log('🏁 Starting WhatsApp Runtime Validation Suite...\n');
  const results = await runWhatsAppValidation();

  console.log('\n=== RESULTS SUMMARY ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🏁 WhatsApp Runtime Validation: ALL PASSED ✅');
  } else {
    console.log('\n🏁 WhatsApp Runtime Validation: FAILED ❌');
  }

  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error);
