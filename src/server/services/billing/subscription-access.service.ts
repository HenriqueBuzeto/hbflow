import { prisma } from '../../db/prisma';

export interface SubscriptionAccessResult {
  hasAccess: boolean;
  status: string;
  reason?: 'trial_expired' | 'subscription_expired' | 'suspended' | 'cancelled' | 'inactive';
  currentPeriodEnd?: Date | null;
}

export class SubscriptionAccessService {
  /**
   * Decide se um tenant tem acesso ativo ou se deve ser bloqueado
   */
  static async checkAccess(tenantId: string): Promise<SubscriptionAccessResult> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!tenant) {
      return { hasAccess: false, status: 'inactive', reason: 'inactive' };
    }

    if (!tenant.isActive || tenant.status === 'inactive') {
      return { hasAccess: false, status: 'inactive', reason: 'inactive' };
    }

    const now = new Date();

    // 0. Verificar se existe uma liberação por confiança (confidence grace period) ativa
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });
    if (tenantSettings?.settingsJson) {
      try {
        const settings = JSON.parse(tenantSettings.settingsJson);
        if (settings.confidenceActiveUntil) {
          const confidenceUntil = new Date(settings.confidenceActiveUntil);
          if (confidenceUntil >= now) {
            return { hasAccess: true, status: 'confidence_grace', currentPeriodEnd: confidenceUntil };
          }
        }
      } catch (e) {
        console.error('Error parsing settingsJson for confidence check:', e);
      }
    }

    // 1. Verificar se existe uma cortesia/isenção manual ativa de acesso gratuito (free_access)
    const activeFreeDiscounts = await prisma.tenantDiscount.findFirst({
      where: {
        tenantId,
        type: 'free_access',
        isActive: true,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } }
        ],
        deletedAt: null
      }
    });

    if (activeFreeDiscounts) {
      return { hasAccess: true, status: 'free' };
    }

    const subscriptions = tenant.subscriptions;
    if (subscriptions.length === 0) {
      // Se não há dados de assinatura, bloqueia por padrão
      return { hasAccess: false, status: 'inactive', reason: 'inactive' };
    }

    const subscription = subscriptions[0]; // Assinatura mais recente

    // 2. Acesso liberado para status 'free' (cortesia permanente)
    if (subscription.status === 'free') {
      return { hasAccess: true, status: 'free' };
    }

    // 3. Acesso liberado para status 'trialing' se estiver dentro do prazo
    if (subscription.status === 'trialing') {
      const trialEnd = subscription.trialEndsAt || subscription.currentPeriodEnd;
      if (trialEnd && trialEnd >= now) {
        return { hasAccess: true, status: 'trialing', currentPeriodEnd: trialEnd };
      }
      return { hasAccess: false, status: 'trialing', reason: 'trial_expired', currentPeriodEnd: trialEnd };
    }

    // 4. Acesso liberado para status 'active' se estiver dentro do período
    if (subscription.status === 'active') {
      if (subscription.currentPeriodEnd >= now) {
        return { hasAccess: true, status: 'active', currentPeriodEnd: subscription.currentPeriodEnd };
      }
      return { hasAccess: false, status: 'active', reason: 'subscription_expired', currentPeriodEnd: subscription.currentPeriodEnd };
    }

    // 5. Bloqueio para qualquer outro status (suspended, past_due, cancelled)
    const reasonMap: Record<string, 'trial_expired' | 'subscription_expired' | 'suspended' | 'cancelled'> = {
      past_due: 'subscription_expired',
      suspended: 'suspended',
      cancelled: 'cancelled'
    };

    return {
      hasAccess: false,
      status: subscription.status,
      reason: reasonMap[subscription.status] || 'subscription_expired',
      currentPeriodEnd: subscription.currentPeriodEnd
    };
  }
}
