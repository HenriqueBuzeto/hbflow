import { requireAuth } from './auth.middleware';
import { FeatureAccessService } from '../services/billing/feature-access.service';

/**
 * Middleware para garantir que o tenant do usuário autenticado possui uma determinada feature comercial ativada.
 * Lança erro FEATURE_NOT_AVAILABLE caso o plano não permita o acesso.
 */
export async function requireFeature(featureKey: string): Promise<string> {
  const user = await requireAuth();

  if (!user.tenantId) {
    throw new Error('USER_HAS_NO_TENANT');
  }

  // Validar se o tenant possui a feature ativa
  const hasFeature = await FeatureAccessService.checkFeature(user.tenantId, featureKey);

  if (!hasFeature) {
    throw new Error('FEATURE_NOT_AVAILABLE');
  }

  return user.tenantId;
}
