import { prisma } from '../../db/prisma';
import { BillingCalculatorService } from './billing-calculator.service';
import { AuditService } from '../../audit/audit.service';

export class InvoiceService {
  /**
   * Gera a fatura mensal para o tenant
   */
  static async generateMonthlyInvoice(
    tenantId: string,
    subscriptionId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
    couponCode?: string
  ) {
    // 1. Evitar duplicidade de faturas para o mesmo período
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        tenantId,
        subscriptionId,
        billingPeriodStart,
        billingPeriodEnd,
        status: { in: ['open', 'paid', 'overdue'] }
      }
    });

    if (existingInvoice) {
      if (existingInvoice.status === 'paid') {
        throw new Error('INVOICE_ALREADY_PAID_FOR_PERIOD');
      }
      // Se a fatura existente não estiver paga, podemos deletá-la para gerar a nova recalculada
      await prisma.invoice.delete({
        where: { id: existingInvoice.id }
      });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new Error('SUBSCRIPTION_NOT_FOUND');
    }

    // 2. Calcular valores
    const calculation = await BillingCalculatorService.calculate(
      tenantId,
      subscription.planId,
      couponCode
    );

    // 3. Gerar número de fatura
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    // Vencimento em 5 dias se tiver valor, ou agora se for grátis
    const dueDate = calculation.totalCents === 0 ? now : new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // 4. Executar transação de criação
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          subscriptionId,
          invoiceNumber,
          status: calculation.totalCents === 0 ? 'paid' : 'open',
          subtotalCents: calculation.baseAmountCents,
          discountCents: calculation.discountCents,
          totalCents: calculation.totalCents,
          dueDate,
          paidAt: calculation.totalCents === 0 ? now : null,
          billingPeriodStart,
          billingPeriodEnd
        }
      });

      // Se o cupom foi aplicado e a fatura foi criada, atualizamos o contador do cupom
      if (calculation.appliedCouponId && !calculation.appliedCouponId.startsWith('mock-')) {
        await tx.coupon.update({
          where: { id: calculation.appliedCouponId },
          data: { redeemedCount: { increment: 1 } }
        });
      }

      // Se o valor final for 0, atualiza e renova a assinatura imediatamente
      if (calculation.totalCents === 0) {
        const targetStatus = subscription.status === 'free' ? 'free' : 'active';
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: targetStatus,
            currentPeriodStart: billingPeriodStart,
            currentPeriodEnd: billingPeriodEnd
          }
        });
      }

      return invoice;
    });

    // 5. AuditLogs e SystemEvents
    if (calculation.totalCents === 0) {
      await AuditService.log({
        tenantId,
        action: 'INVOICE_PAID',
        entity: 'invoice',
        entityId: result.id,
        metadata: { ...calculation.metadata, autoActivated: true }
      });

      await AuditService.logSystemEvent({
        tenantId,
        eventType: 'INVOICE_PAID',
        severity: 'info',
        message: `Fatura ${result.invoiceNumber} quitada automaticamente por isenção/cupom 100%`,
        metadata: { invoiceId: result.id }
      });
    } else {
      await AuditService.log({
        tenantId,
        action: 'INVOICE_CREATED',
        entity: 'invoice',
        entityId: result.id,
        metadata: calculation.metadata
      });

      await AuditService.logSystemEvent({
        tenantId,
        eventType: 'INVOICE_CREATED',
        severity: 'info',
        message: `Fatura mensal ${result.invoiceNumber} gerada com sucesso. Aguardando pagamento.`,
        metadata: { invoiceId: result.id, amount: result.totalCents }
      });
    }

    return result;
  }

  /**
   * Monitora e marca faturas vencidas como overdue e past_due no banco
   */
  static async checkOverdueInvoices() {
    const now = new Date();
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'open',
        dueDate: { lt: now },
        deletedAt: null
      },
      include: {
        subscription: true
      }
    });

    for (const invoice of overdueInvoices) {
      await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'overdue' }
        });

        if (invoice.subscriptionId) {
          await tx.subscription.update({
            where: { id: invoice.subscriptionId },
            data: { status: 'past_due' }
          });
        }
      });

      await AuditService.log({
        tenantId: invoice.tenantId,
        action: 'INVOICE_OVERDUE',
        entity: 'invoice',
        entityId: invoice.id,
        metadata: { invoiceNumber: invoice.invoiceNumber, dueDate: invoice.dueDate }
      });

      await AuditService.logSystemEvent({
        tenantId: invoice.tenantId,
        eventType: 'INVOICE_OVERDUE',
        severity: 'warning',
        message: `Fatura ${invoice.invoiceNumber} está atrasada. Assinatura alterada para past_due.`,
        metadata: { invoiceId: invoice.id }
      });
    }

    return overdueInvoices.length;
  }
}
