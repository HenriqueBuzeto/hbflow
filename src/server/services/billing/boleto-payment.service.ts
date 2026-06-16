import { prisma } from '../../db/prisma';
import { AuditService } from '../../audit/audit.service';

export class BoletoPaymentService {
  /**
   * Gera um boleto bancário simulado para pagar uma Fatura
   */
  static async generateBoleto(tenantId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new Error('INVOICE_NOT_FOUND');
    }

    if (invoice.status === 'paid') {
      throw new Error('INVOICE_ALREADY_PAID');
    }

    // 1. Criar registro de Pagamento pendente no banco
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
        provider: 'manual_boleto',
        method: 'boleto',
        status: 'pending',
        amountCents: invoice.totalCents
      }
    });

    // 2. Gerar linha digitável e código de barras simulado
    const txId = `${Date.now()}`;
    const barCode = `341917900101043510047910201500087923700000${invoice.totalCents.toString().padStart(6, '0')}`;
    const lineDigit = `34191.79006 10104.351004 47910.201502 7 923700000${invoice.totalCents.toString().padStart(6, '0')}`;
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 dias úteis

    // Atualizar o pagamento com as informações do boleto no metadataJson
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalId: txId,
        metadataJson: JSON.stringify({
          barCode,
          lineDigit,
          dueDate: expiresAt.toISOString(),
          bankName: 'Banco Itaú S.A.'
        })
      }
    });

    await AuditService.log({
      tenantId,
      action: 'BOLETO_GENERATED',
      entity: 'payment',
      entityId: payment.id,
      metadata: { invoiceId, amountCents: invoice.totalCents }
    });

    await AuditService.logSystemEvent({
      tenantId,
      eventType: 'BOLETO_GENERATED',
      severity: 'info',
      message: `Boleto Bancário Itaú de R$ ${(invoice.totalCents / 100).toFixed(2)} gerado para fatura ${invoice.invoiceNumber}`,
      metadata: { paymentId: payment.id }
    });

    return {
      success: true,
      paymentId: payment.id,
      amountCents: invoice.totalCents,
      barCode,
      lineDigit,
      dueDate: expiresAt,
      bankName: 'Banco Itaú S.A.'
    };
  }
}
