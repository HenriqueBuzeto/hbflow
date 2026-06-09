/**
 * HBFlow AI Cost Center Manager
 * Responsável pelo controle de orçamento, contabilidade de tokens
 * e governança financeira por Tenant para evitar prejuízos na operação SaaS.
 */

export interface TenantCreditLimit {
  tenantId: string;
  monthlyLimit: number; // Limite em USD (ex: $10.00)
  monthlySpent: number; // Consumo acumulado em USD
}

class AICostCenterManager {
  private tenantLimits: Map<string, TenantCreditLimit> = new Map();

  constructor() {
    this.initDefaultLimits();
  }

  private initDefaultLimits() {
    // Configura limites fictícios iniciais para os inquilinos padrão
    this.tenantLimits.set('tenant-1', {
      tenantId: 'tenant-1',
      monthlyLimit: 15.00, // Limite Starter de $15/mês
      monthlySpent: 1.25
    });

    this.tenantLimits.set('tenant-2', {
      tenantId: 'tenant-2',
      monthlyLimit: 50.00, // Limite Pro de $50/mês
      monthlySpent: 42.80
    });
  }

  /**
   * Verifica se o tenant ainda possui saldo/crédito de IA disponível
   */
  hasAvailableBalance(tenantId: string): boolean {
    const limit = this.tenantLimits.get(tenantId);
    if (!limit) return true; // Se não configurado, libera por padrão
    return limit.monthlySpent < limit.monthlyLimit;
  }

  /**
   * Registra a cobrança de uma execução e soma ao total acumulado do tenant
   */
  chargeTenant(tenantId: string, cost: number): void {
    if (!this.tenantLimits.has(tenantId)) {
      this.tenantLimits.set(tenantId, {
        tenantId,
        monthlyLimit: 20.00, // Limite padrão
        monthlySpent: 0
      });
    }

    const limit = this.tenantLimits.get(tenantId)!;
    limit.monthlySpent = Number((limit.monthlySpent + cost).toFixed(5));
    
    console.log(`[AI Cost Center] Tenant "${tenantId}" cobrado em $${cost.toFixed(5)} | Acumulado no mês: $${limit.monthlySpent}/${limit.monthlyLimit}`);
  }

  /**
   * Retorna os detalhes de saldo do tenant
   */
  getTenantBalance(tenantId: string): TenantCreditLimit {
    return this.tenantLimits.get(tenantId) || {
      tenantId,
      monthlyLimit: 20.00,
      monthlySpent: 0
    };
  }

  /**
   * Atualiza o limite de crédito do tenant (Upgrade de plano ou compra de créditos avulsos)
   */
  updateLimit(tenantId: string, newLimit: number): void {
    if (this.tenantLimits.has(tenantId)) {
      this.tenantLimits.get(tenantId)!.monthlyLimit = newLimit;
    } else {
      this.tenantLimits.set(tenantId, {
        tenantId,
        monthlyLimit: newLimit,
        monthlySpent: 0
      });
    }
    console.log(`[AI Cost Center] Limite de crédito do Tenant "${tenantId}" atualizado para $${newLimit}`);
  }
}

export const aiCostCenter = new AICostCenterManager();
