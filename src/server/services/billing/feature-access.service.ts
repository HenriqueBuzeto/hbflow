import { prisma } from '../../db/prisma';

export class FeatureAccessService {
  /**
   * Decide se um tenant tem acesso a uma determinada feature comercial.
   * Respeita o plano do tenant e a tabela TenantPlanFeature (sobreposição manual).
   */
  static async checkFeature(tenantId: string, feature: string): Promise<boolean> {
    if (!tenantId) return false;

    // 1. Buscar o Tenant e possíveis sobreposições manuais de features
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        planFeatures: {
          where: { feature, isActive: true }
        }
      }
    });

    if (!tenant) return false;

    // Se o inquilino estiver bloqueado por faturamento vencido, bloqueia todas as features
    if (tenant.isBlocked) return false;

    // 2. Se houver sobreposição manual na tabela TenantPlanFeature, ela tem precedência
    if (tenant.planFeatures.length > 0) {
      return tenant.planFeatures[0].value === 'true';
    }

    // 3. Regras padrão baseadas no plano comercial do Tenant
    const plan = tenant.plan ? tenant.plan.toLowerCase() : 'starter';

    if (feature === 'after_sales_enabled') {
      // Starter = false, Pro = true, Enterprise = true
      return plan === 'pro' || plan === 'enterprise' || plan === 'pro-test';
    }

    if (feature === 'chat_interno_enabled') {
      // Starter = false, Pro = true, Enterprise = true
      return plan === 'pro' || plan === 'enterprise' || plan === 'pro-test';
    }

    return false;
  }
}
