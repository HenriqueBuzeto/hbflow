import { prisma } from '../../db/prisma';

export interface SubscriptionAccessResult {
  allowed: boolean;
  hasAccess: boolean; // For backward compatibility
  status: string;
  reason?: 'trial_expired' | 'past_due' | 'suspended' | 'cancelled' | 'no_subscription' | 'inactive' | 'subscription_expired';
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  daysRemaining?: number;
  billingUrl: string;
}

export class SubscriptionAccessService {
  /**
   * Decide se um tenant tem acesso ativo ou se deve ser bloqueado
   */
  static async checkAccess(tenantId: string): Promise<SubscriptionAccessResult> {
    const defaultBillingUrl = '/billing';

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
      return { 
        allowed: false,
        hasAccess: false, 
        status: 'inactive', 
        reason: 'inactive',
        billingUrl: defaultBillingUrl 
      };
    }

    if (!tenant.isActive || tenant.status === 'inactive') {
      return { 
        allowed: false,
        hasAccess: false, 
        status: 'inactive', 
        reason: 'inactive',
        billingUrl: defaultBillingUrl
      };
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
            const daysRemaining = Math.max(0, Math.ceil((confidenceUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            return { 
              allowed: true,
              hasAccess: true, 
              status: 'confidence_grace', 
              currentPeriodEnd: confidenceUntil,
              daysRemaining,
              billingUrl: defaultBillingUrl
            };
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
      return { 
        allowed: true,
        hasAccess: true, 
        status: 'free',
        billingUrl: defaultBillingUrl
      };
    }

    const subscriptions = tenant.subscriptions;
    if (subscriptions.length === 0) {
      return { 
        allowed: false,
        hasAccess: false, 
        status: 'inactive', 
        reason: 'no_subscription',
        billingUrl: defaultBillingUrl
      };
    }

    const subscription = subscriptions[0]; // Assinatura mais recente

    // 2. Acesso liberado para status 'free' (cortesia permanente)
    if (subscription.status === 'free') {
      return { 
        allowed: true,
        hasAccess: true, 
        status: 'free',
        billingUrl: defaultBillingUrl
      };
    }

    // 3. Acesso liberado para status 'trialing' se estiver dentro do prazo
    if (subscription.status === 'trialing') {
      const trialEnd = subscription.trialEndsAt || subscription.currentPeriodEnd;
      if (trialEnd && trialEnd >= now) {
        const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return { 
          allowed: true,
          hasAccess: true, 
          status: 'trialing', 
          trialEndsAt: subscription.trialEndsAt,
          currentPeriodEnd: trialEnd,
          daysRemaining,
          billingUrl: defaultBillingUrl
        };
      }
      return { 
        allowed: false,
        hasAccess: false, 
        status: 'trialing', 
        reason: 'trial_expired', 
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: trialEnd,
        daysRemaining: 0,
        billingUrl: defaultBillingUrl
      };
    }

    // 4. Acesso liberado para status 'active' se estiver dentro do período
    if (subscription.status === 'active') {
      if (subscription.currentPeriodEnd >= now) {
        const daysRemaining = Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return { 
          allowed: true,
          hasAccess: true, 
          status: 'active', 
          trialEndsAt: subscription.trialEndsAt,
          currentPeriodEnd: subscription.currentPeriodEnd,
          daysRemaining,
          billingUrl: defaultBillingUrl
        };
      }
      return { 
        allowed: false,
        hasAccess: false, 
        status: 'active', 
        reason: 'subscription_expired', 
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        daysRemaining: 0,
        billingUrl: defaultBillingUrl
      };
    }

    // 5. Bloqueio para qualquer outro status (suspended, past_due, cancelled)
    const reasonMap: Record<string, 'trial_expired' | 'past_due' | 'suspended' | 'cancelled' | 'subscription_expired'> = {
      past_due: 'past_due',
      suspended: 'suspended',
      cancelled: 'cancelled'
    };

    return {
      allowed: false,
      hasAccess: false,
      status: subscription.status,
      reason: reasonMap[subscription.status] || 'subscription_expired',
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      daysRemaining: 0,
      billingUrl: defaultBillingUrl
    };
  }
}
