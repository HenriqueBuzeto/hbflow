import { prisma } from '../../db/prisma';
import { AuditService } from '../../audit/audit.service';

export class PaymentConfirmationService {
  /**
   * Confirma um pagamento e estende/renova a assinatura correspondente
   */
  static async confirmPayment(paymentId: string, amountCents: number) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    if (payment.status === 'paid') {
      return { success: true, alreadyPaid: true };
    }

    if (payment.amountCents !== amountCents) {
      throw new Error('CONFIRMATION_AMOUNT_MISMATCH');
    }

    const now = new Date();
    // Estende por 30 dias a partir de agora
    const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      // 1. Atualizar status do pagamento
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'paid',
          paidAt: now
        }
      });

      // 2. Atualizar status da fatura
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: 'paid',
          paidAt: now
        }
      });

      // 3. Atualizar status da cobrança Pix associada
      await tx.pixCharge.updateMany({
        where: { paymentId: paymentId },
        data: { status: 'paid' }
      });

      // 4. Atualizar Assinatura
      if (payment.invoice.subscriptionId) {
        const sub = payment.invoice.subscription;
        const targetStatus = sub && sub.status === 'free' ? 'free' : 'active';
        
        await tx.subscription.update({
          where: { id: payment.invoice.subscriptionId },
          data: {
            status: targetStatus,
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriodEnd
          }
        });
      }
    });

    // 5. Emitir AuditLogs e SystemEvents
    await AuditService.log({
      tenantId: payment.tenantId,
      action: 'PAYMENT_CONFIRMED',
      entity: 'payment',
      entityId: payment.id,
      metadata: { amountCents, invoiceId: payment.invoiceId }
    });

    if (payment.invoice.subscriptionId) {
      await AuditService.log({
        tenantId: payment.tenantId,
        action: 'SUBSCRIPTION_ACTIVATED',
        entity: 'subscription',
        entityId: payment.invoice.subscriptionId,
        metadata: { currentPeriodEnd: nextPeriodEnd.toISOString() }
      });
    }

    await AuditService.logSystemEvent({
      tenantId: payment.tenantId,
      eventType: 'PAYMENT_CONFIRMED',
      severity: 'info',
      message: `Pagamento de R$ ${(amountCents / 100).toFixed(2)} confirmado para fatura ${payment.invoice.invoiceNumber}. Assinatura reativada/renovada.`,
      metadata: { paymentId }
    });

    return { success: true };
  }
}
