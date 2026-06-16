import { prisma } from '../../db/prisma';
import { AuditService } from '../../audit/audit.service';
import { PaymentConfirmationService } from './payment-confirmation.service';

export interface CreditCardData {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export class CreditCardPaymentService {
  /**
   * Processa uma transação simulada de Cartão de Crédito para pagar uma Fatura
   */
  static async processPayment(tenantId: string, invoiceId: string, cardData: CreditCardData) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: true }
    });

    if (!invoice) {
      throw new Error('INVOICE_NOT_FOUND');
    }

    if (invoice.status === 'paid') {
      throw new Error('INVOICE_ALREADY_PAID');
    }

    // 1. Simular validação do cartão
    const cleanNumber = cardData.number.replace(/\s/g, '');
    if (cleanNumber.length < 16) {
      throw new Error('CARD_NUMBER_INVALID');
    }

    // Cartões iniciados com 9999 simulam erro de saldo insuficiente
    if (cleanNumber.startsWith('9999')) {
      // Registrar falha na auditoria
      await AuditService.log({
        tenantId,
        action: 'CREDIT_CARD_DECLINED',
        entity: 'invoice',
        entityId: invoiceId,
        metadata: { reason: 'SALDO_INSUFICIENTE', amountCents: invoice.totalCents }
      });

      throw new Error('TRANSACTION_DECLINED_INSUFFICIENT_FUNDS');
    }

    const lastFour = cleanNumber.slice(-4);
    const now = new Date();

    // 2. Criar registro de Pagamento pendente no banco
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
        provider: 'manual_credit_card',
        method: 'credit_card',
        status: 'pending',
        amountCents: invoice.totalCents,
        metadataJson: JSON.stringify({
          cardBrand: cleanNumber.startsWith('4') ? 'visa' : cleanNumber.startsWith('5') ? 'mastercard' : 'unknown',
          cardLastFour: lastFour,
          holderName: cardData.holder
        })
      }
    });

    // 3. Confirmar o pagamento e atualizar a assinatura usando o PaymentConfirmationService
    const confirmationResult = await PaymentConfirmationService.confirmPayment(payment.id, invoice.totalCents);

    await AuditService.log({
      tenantId,
      action: 'CREDIT_CARD_CHARGE_SUCCESS',
      entity: 'payment',
      entityId: payment.id,
      metadata: { invoiceId, lastFour, cardBrand: cleanNumber.startsWith('4') ? 'Visa' : 'Mastercard' }
    });

    return {
      success: true,
      paymentId: payment.id,
      amountCents: invoice.totalCents,
      cardLastFour: lastFour,
      invoiceStatus: 'paid'
    };
  }
}
