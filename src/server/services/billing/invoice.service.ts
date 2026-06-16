import { prisma } from '../../db/prisma';
import { BillingCalculatorService } from './billing-calculator.service';
import { AuditService } from '../../audit/audit.service';

export class InvoiceService {
  /**
   * Remove faturas duplicadas para o mesmo período civil do inquilino.
   * Preserva a fatura paga (se existir) ou a mais recente.
   */
  static async cleanupDuplicateInvoices(tenantId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    const periodsSeen = new Map<string, typeof invoices>();

    for (const inv of invoices) {
      const periodKey = `${inv.billingPeriodStart.getFullYear()}-${inv.billingPeriodStart.getMonth()}`;
      if (!periodsSeen.has(periodKey)) {
        periodsSeen.set(periodKey, []);
      }
      periodsSeen.get(periodKey)!.push(inv);
    }

    const idsToDelete: string[] = [];

    for (const [_, invList] of periodsSeen.entries()) {
      if (invList.length <= 1) continue;

      // 1. Encontrar uma fatura paga
      const paidInvoice = invList.find(i => i.status === 'paid');

      if (paidInvoice) {
        // Mantém a paga, marca todas as outras para exclusão
        for (const i of invList) {
          if (i.id !== paidInvoice.id) {
            idsToDelete.push(i.id);
          }
        }
      } else {
        // Se nenhuma for paga, mantém a mais recente (primeira por conta do orderBy: createdAt: desc)
        const [keepInvoice, ...others] = invList;
        for (const i of others) {
          idsToDelete.push(i.id);
        }
      }
    }

    if (idsToDelete.length > 0) {
      await prisma.invoice.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    }
  }

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
    // Limpar duplicidades antes de iniciar
    await InvoiceService.cleanupDuplicateInvoices(tenantId);

    // 1. Evitar duplicidade de faturas para o mesmo período (mês/ano)
    const startOfInvoiceMonth = new Date(billingPeriodStart.getFullYear(), billingPeriodStart.getMonth(), 1);
    const endOfInvoiceMonth = new Date(billingPeriodStart.getFullYear(), billingPeriodStart.getMonth() + 1, 0, 23, 59, 59, 999);

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        tenantId,
        billingPeriodStart: {
          gte: startOfInvoiceMonth,
          lte: endOfInvoiceMonth
        },
        status: { in: ['open', 'paid', 'overdue'] }
      },
      include: {
        subscription: {
          include: { plan: true }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        pixCharges: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (existingInvoice) {
      const currentPlan = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        select: { planId: true }
      });

      if (existingInvoice.status === 'paid' && existingInvoice.subscription?.planId === currentPlan?.planId) {
        // Se a fatura já estiver paga e for para o mesmo plano, apenas retorna a fatura existente
        return existingInvoice;
      }

      // Se a fatura existente não estiver paga, ou se o plano mudou (upgrade/downgrade), 
      // deletamos a fatura antiga para gerar a nova recalculada sem acumular lixo
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

    const fullInvoice = await prisma.invoice.findUnique({
      where: { id: result.id },
      include: {
        subscription: {
          include: { plan: true }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        pixCharges: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return fullInvoice || result;
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
