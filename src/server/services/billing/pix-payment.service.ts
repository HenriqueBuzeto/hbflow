import { prisma } from '../../db/prisma';
import { AuditService } from '../../audit/audit.service';

export class PixPaymentService {
  /**
   * Gera uma cobrança PIX para uma Fatura específica
   */
  static async generatePixCharge(tenantId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new Error('INVOICE_NOT_FOUND');
    }

    if (invoice.status === 'paid') {
      throw new Error('INVOICE_ALREADY_PAID');
    }

    // 1. Criar registro de Pagamento pendente
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
        provider: 'manual_pix',
        method: 'pix',
        status: 'pending',
        amountCents: invoice.totalCents
      }
    });

    // 2. Gerar dados do Pix simulado
    const txId = `TX${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
    const amountFloat = (invoice.totalCents / 100).toFixed(2);
    
    // Payload EMV padrão Pix
    const copyPasteCode = `00020101021226830014br.gov.bcb.pix2561pix.hbflow.com.br/invoice/${txId}5204000053039865405${amountFloat}5802BR5915HBFlow%20Payments6009Sao%20Paulo62070503***6304ABCD`;
    const qrCode = `mock_pix_qr_code_base64_for_${txId}`;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expira em 24h

    // 3. Criar registro do PixCharge
    const pixCharge = await prisma.pixCharge.create({
      data: {
        tenantId,
        invoiceId,
        paymentId: payment.id,
        amountCents: invoice.totalCents,
        qrCode,
        copyPasteCode,
        expiresAt,
        status: 'active',
        provider: 'manual_pix',
        externalId: txId
      }
    });

    await AuditService.log({
      tenantId,
      action: 'PIX_CHARGE_CREATED',
      entity: 'pix_charge',
      entityId: pixCharge.id,
      metadata: { invoiceId, paymentId: payment.id, amountCents: invoice.totalCents }
    });

    await AuditService.logSystemEvent({
      tenantId,
      eventType: 'PIX_CHARGE_CREATED',
      severity: 'info',
      message: `Cobrança Pix de R$ ${amountFloat} gerada para fatura ${invoice.invoiceNumber}`,
      metadata: { pixChargeId: pixCharge.id }
    });

    return pixCharge;
  }

  /**
   * Consulta o status atual de uma cobrança Pix no banco
   */
  static async checkChargeStatus(chargeId: string) {
    const charge = await prisma.pixCharge.findUnique({
      where: { id: chargeId },
      include: { invoice: true, payment: true }
    });

    if (!charge) {
      throw new Error('PIX_CHARGE_NOT_FOUND');
    }

    return {
      id: charge.id,
      status: charge.status,
      amountCents: charge.amountCents,
      expiresAt: charge.expiresAt,
      invoiceNumber: charge.invoice.invoiceNumber,
      invoiceStatus: charge.invoice.status
    };
  }
}
