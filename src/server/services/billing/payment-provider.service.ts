import { PixPaymentService } from './pix-payment.service';
import { InfinitePayProvider } from './providers/infinitepay.provider';

export class PaymentProviderService {
  /**
   * Encaminha a geração de cobrança para o provider selecionado
   */
  static async createPayment(provider: 'manual_pix' | 'infinitepay', tenantId: string, invoiceId: string) {
    if (provider === 'manual_pix') {
      return PixPaymentService.generatePixCharge(tenantId, invoiceId);
    } else if (provider === 'infinitepay') {
      return InfinitePayProvider.createCheckoutLink(invoiceId);
    }
    throw new Error('INVALID_PAYMENT_PROVIDER');
  }
}
