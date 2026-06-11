import { requireAuth } from './auth.middleware';
import { SubscriptionAccessService } from '../services/billing/subscription-access.service';
import { prisma } from '../db/prisma';

/**
 * Middleware/Guard para garantir que o tenant do usuário autenticado possui assinatura ativa.
 * Suporta superAdminBypass para administradores globais.
 */
export async function requireActiveSubscription(): Promise<string> {
  const user = await requireAuth();

  if (!user.tenantId) {
    throw new Error('USER_HAS_NO_TENANT');
  }

  // 1. superAdminBypass: verificar se o usuário é Henrique Boss (Admin principal) ou Admin da hbflow
  const fullUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { role: true, tenant: true }
  });

  const isSuperAdmin =
    fullUser?.email === 'henrique@hbflow.com' ||
    (fullUser?.role?.name === 'Admin' && fullUser?.tenant?.slug === 'hbflow');

  if (isSuperAdmin) {
    // SuperAdmin possui bypass total para fins de suporte, faturamento e auditoria
    return user.tenantId;
  }

  // 2. Validar assinatura e acesso comercial do tenant
  const access = await SubscriptionAccessService.checkAccess(user.tenantId);
  if (!access.hasAccess) {
    throw new Error('SUBSCRIPTION_REQUIRED');
  }

  return user.tenantId;
}
