import { WhatsAppProvider } from './whatsapp-provider.interface';
import { WhatsAppCloudProvider } from './whatsapp-cloud.provider';
import { WhatsAppQrGatewayProvider } from './whatsapp-qr-gateway.provider';
import { featureFlagService } from '@/lib/feature-flags/FeatureFlagService';

export class WhatsAppProviderFactory {
  /**
   * Retorna a instância concreta do provedor de WhatsApp com base no tipo.
   * Valida se o provedor QR Gateway está habilitado via feature flag.
   */
  static async getProvider(providerType: string, tenantId: string): Promise<WhatsAppProvider> {
    if (providerType === 'qr_gateway') {
      // Verifica na feature flag se a integração QR Code/Evolution está liberada para o tenant
      const isQrFlagEnabled = await featureFlagService.isFeatureEnabled('whatsapp_qr_gateway_enabled', tenantId);
      const isEnvEnabled = process.env.WHATSAPP_QR_GATEWAY_ENABLED === 'true' || process.env.whatsapp_qr_gateway_enabled === 'true';

      if (!isQrFlagEnabled && !isEnvEnabled) {
        throw new Error('Integração de WhatsApp QR Code/Evolution desabilitada via feature flags.');
      }

      return new WhatsAppQrGatewayProvider();
    }

    // Provedor padrão comercial oficial
    return new WhatsAppCloudProvider();
  }
}
