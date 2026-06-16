import { prisma } from '../../../db/prisma';
import { AuditService } from '../../../audit/audit.service';

export class InfinitePayProvider {
  private static getBaseUrl() {
    return process.env.INFINITEPAY_BASE_URL || 'https://api.checkout.infinitepay.io';
  }

  private static getHandle() {
    return process.env.INFINITEPAY_HANDLE || 'hbstudiodev';
  }

  /**
   * Cria um link de pagamento na InfinitePay
   */
  static async createCheckoutLink(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscription: {
          include: { plan: true }
        },
        tenant: true
      }
    });

    if (!invoice) {
      throw new Error('INVOICE_NOT_FOUND');
    }

    if (invoice.totalCents <= 0) {
      throw new Error('INVOICE_TOTAL_MUST_BE_GREATER_THAN_ZERO');
    }

    // 1. Criar ou obter registro de Pagamento pendente
    let payment = await prisma.payment.findFirst({
      where: {
        invoiceId,
        provider: 'infinitepay',
        status: 'pending'
      }
    });

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          tenantId: invoice.tenantId,
          invoiceId: invoice.id,
          provider: 'infinitepay',
          method: 'pix', // Padrão
          status: 'pending',
          amountCents: invoice.totalCents
        }
      });
    }

    // 2. Preparar payload para a InfinitePay
    const planName = invoice.subscription?.plan?.name || 'Assinatura';
    const periodStartStr = invoice.billingPeriodStart.toLocaleDateString('pt-BR');
    const periodEndStr = invoice.billingPeriodEnd.toLocaleDateString('pt-BR');
    const description = `HBFlow - ${planName} - ${periodStartStr} a ${periodEndStr}`;

    const payload: Record<string, any> = {
      handle: this.getHandle(),
      items: [
        {
          description,
          quantity: 1,
          price: invoice.totalCents
        }
      ],
      order_nsu: invoice.id,
      redirect_url: process.env.INFINITEPAY_REDIRECT_URL || 'https://hbflow.vercel.app/billing/success',
      webhook_url: process.env.INFINITEPAY_WEBHOOK_URL || 'https://hbflow.vercel.app/api/webhooks/infinitepay'
    };

    // Customer opcional se preenchido
    const customer: Record<string, any> = {};
    if (invoice.tenant.name) customer.name = invoice.tenant.name;
    if (invoice.tenant.email) customer.email = invoice.tenant.email;
    if (invoice.tenant.phone) customer.phone_number = invoice.tenant.phone;

    if (Object.keys(customer).length > 0) {
      payload.customer = customer;
    }

    // 3. Chamar API da InfinitePay
    const response = await fetch(`${this.getBaseUrl()}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('InfinitePay creation error:', result);
      throw new Error(result.message || 'Erro ao gerar link de pagamento na InfinitePay');
    }

    const checkoutUrl = result.url || result.checkout_url;
    const slug = result.slug;

    if (!checkoutUrl) {
      throw new Error('INFINITEPAY_LINK_CREATION_FAILED_NO_URL');
    }

    // 4. Salvar dados no metadata do Pagamento
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadataJson: JSON.stringify({
          invoice_slug: slug,
          slug: slug,
          order_nsu: invoice.id,
          checkout_url: checkoutUrl
        })
      }
    });

    return { checkoutUrl, slug, paymentId: payment.id };
  }

  /**
   * Processa o Webhook da InfinitePay
   */
  static async handleWebhook(payload: any) {
    const {
      invoice_slug,
      amount,
      paid_amount,
      capture_method,
      transaction_nsu,
      order_nsu,
      receipt_url,
      installments
    } = payload;

    // 1. Validar order_nsu corresponde a uma Invoice existente
    const invoice = await prisma.invoice.findUnique({
      where: { id: order_nsu },
      include: { tenant: true }
    });

    if (!invoice) {
      throw new Error('INVOICE_NOT_FOUND_FOR_WEBHOOK');
    }

    // 2. Buscar o pagamento pendente associado
    const payment = await prisma.payment.findFirst({
      where: {
        invoiceId: invoice.id,
        provider: 'infinitepay',
        status: 'pending'
      }
    });

    if (!payment) {
      // Idempotência: Se já estiver paga, apenas retorna 200
      if (invoice.status === 'paid') {
        return { success: true, alreadyProcessed: true };
      }
      throw new Error('PENDING_PAYMENT_NOT_FOUND_FOR_WEBHOOK');
    }

    // 3. Validar amount ou paid_amount compatível com invoice.totalCents
    if (paid_amount !== invoice.totalCents && amount !== invoice.totalCents) {
      throw new Error('WEBHOOK_AMOUNT_MISMATCH');
    }

    const now = new Date();
    const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 4. Executar transação de quitação (idempotente)
    await prisma.$transaction(async (tx) => {
      // Atualizar Payment para paid
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'paid',
          method: capture_method || 'pix',
          externalId: transaction_nsu,
          paidAt: now,
          metadataJson: JSON.stringify({
            invoice_slug,
            slug: invoice_slug,
            order_nsu,
            capture_method,
            paid_amount,
            installments: installments || 1,
            receipt_url
          })
        }
      });

      // Atualizar Invoice para paid
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'paid',
          paidAt: now
        }
      });

      // Atualizar Assinatura
      if (invoice.subscriptionId) {
        await tx.subscription.update({
          where: { id: invoice.subscriptionId },
          data: {
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriodEnd
          }
        });
      }
    });

    // 5. AuditLog e SystemEvent
    await AuditService.log({
      tenantId: invoice.tenantId,
      action: 'PAYMENT_CONFIRMED',
      entity: 'payment',
      entityId: payment.id,
      metadata: { provider: 'infinitepay', amountCents: paid_amount, transaction_nsu }
    });

    await AuditService.logSystemEvent({
      tenantId: invoice.tenantId,
      eventType: 'INVOICE_PAID',
      severity: 'info',
      message: `Fatura ${invoice.invoiceNumber} paga via InfinitePay (${capture_method}). Assinatura renovada.`,
      metadata: { invoiceId: invoice.id, paymentId: payment.id }
    });

    return { success: true };
  }

  /**
   * Consulta o status do pagamento na InfinitePay e confirma se pago
   */
  static async checkPaymentStatus(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true }
    });

    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    if (payment.status === 'paid') {
      return { success: true, paid: true };
    }

    const metadata = payment.metadataJson ? JSON.parse(payment.metadataJson) : {};
    const slug = metadata.slug || metadata.invoice_slug;

    if (!slug) {
      throw new Error('PAYMENT_SLUG_NOT_FOUND_IN_METADATA');
    }

    const payload = {
      handle: this.getHandle(),
      order_nsu: payment.invoiceId,
      transaction_nsu: payment.externalId || "",
      slug
    };

    const response = await fetch(`${this.getBaseUrl()}/payment_check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('InfinitePay payment_check error:', result);
      return { success: false, paid: false };
    }

    if (result.paid === true) {
      const txNsu = result.transaction_nsu || metadata.transaction_nsu || "CHECK_AUTO";
      
      const now = new Date();
      const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'paid',
            externalId: txNsu,
            paidAt: now,
            metadataJson: JSON.stringify({
              ...metadata,
              transaction_nsu: txNsu,
              receipt_url: result.receipt_url || metadata.receipt_url
            })
          }
        });

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            status: 'paid',
            paidAt: now
          }
        });

        if (payment.invoice.subscriptionId) {
          await tx.subscription.update({
            where: { id: payment.invoice.subscriptionId },
            data: {
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: nextPeriodEnd
            }
          });
        }
      });

      await AuditService.log({
        tenantId: payment.tenantId,
        action: 'PAYMENT_CONFIRMED',
        entity: 'payment',
        entityId: payment.id,
        metadata: { provider: 'infinitepay', check_status: true }
      });

      await AuditService.logSystemEvent({
        tenantId: payment.tenantId,
        eventType: 'INVOICE_PAID',
        severity: 'info',
        message: `Fatura ${payment.invoice.invoiceNumber} confirmada via consulta de status da InfinitePay. Assinatura renovada.`,
        metadata: { invoiceId: payment.invoiceId, paymentId: payment.id }
      });

      return { success: true, paid: true };
    }

    return { success: true, paid: false };
  }
}
