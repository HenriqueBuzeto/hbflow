import { prisma } from '@/server/db/prisma';

export interface BillingStatus {
  isBlocked: boolean;
  reason?: 'trial_expired' | 'subscription_expired' | 'account_inactive';
  currentPeriodEnd?: Date | null;
  plan?: string;
  status?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  discountPercentage: number;
  discountAmount: number;
  finalAmount: number;
  message?: string;
}

export class BillingService {
  /**
   * Verifica se o tenant está com acesso bloqueado devido ao vencimento do trial ou da assinatura
   */
  static async checkBillingStatus(tenantId: string): Promise<BillingStatus> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { billing: true }
    });

    if (!tenant) {
      return { isBlocked: true, reason: 'account_inactive' };
    }

    if (!tenant.isActive || tenant.status === 'inactive') {
      return { isBlocked: true, reason: 'account_inactive', plan: tenant.plan, status: tenant.status };
    }

    const billing = tenant.billing;
    if (!billing || !billing.currentPeriodEnd) {
      // Se não há dados de faturamento criados, bloqueia
      return { isBlocked: true, reason: 'trial_expired', plan: tenant.plan, status: tenant.status };
    }

    const now = new Date();
    const isExpired = billing.currentPeriodEnd < now;

    if (isExpired) {
      const reason = tenant.status === 'trial' ? 'trial_expired' : 'subscription_expired';
      return {
        isBlocked: true,
        reason,
        currentPeriodEnd: billing.currentPeriodEnd,
        plan: tenant.plan,
        status: tenant.status
      };
    }

    return {
      isBlocked: false,
      currentPeriodEnd: billing.currentPeriodEnd,
      plan: tenant.plan,
      status: tenant.status
    };
  }

  /**
   * Calcula o desconto por cupom ou por empresa (desconto automático baseado no nome/slug)
   */
  static async calculatePrice(
    tenantId: string,
    plan: 'starter' | 'pro',
    couponCode?: string
  ): Promise<{
    baseAmount: number;
    discountAmount: number;
    finalAmount: number;
    appliedCoupon?: string;
    companyDiscountPercentage: number;
    couponDiscountPercentage: number;
  }> {
    const baseAmount = plan === 'pro' ? 189.90 : 99.90;
    let couponDiscountPercentage = 0;
    let companyDiscountPercentage = 0;

    // 1. Verificar desconto automático por empresa (desconto por empresa parceira no slug/nome)
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) {
      const slug = tenant.slug.toLowerCase();
      const name = tenant.name.toLowerCase();
      
      // Regras de desconto por empresa
      if (slug.includes('parceiro') || name.includes('parceiro')) {
        companyDiscountPercentage = 15; // 15% de desconto automático para parceiros
      } else if (slug.includes('consultoria') || name.includes('consultoria')) {
        companyDiscountPercentage = 10; // 10% de desconto automático para consultorias
      }
    }

    // 2. Validar cupom de desconto manual
    if (couponCode) {
      const cleanCode = couponCode.trim().toUpperCase();
      if (cleanCode === 'CUPOM100') {
        couponDiscountPercentage = 100; // 100% de desconto
      } else if (cleanCode === 'HB20' || cleanCode === 'HBFLOW20') {
        couponDiscountPercentage = 20; // 20% de desconto
      } else if (cleanCode === 'START50') {
        couponDiscountPercentage = 50; // 50% de desconto
      } else {
        throw new Error('Cupom inválido ou expirado');
      }
    }

    // Calcular descontos cumulativos (limitados a 100%)
    const totalPercentage = Math.min(100, companyDiscountPercentage + couponDiscountPercentage);
    const discountAmount = Number((baseAmount * (totalPercentage / 100)).toFixed(2));
    const finalAmount = Number((baseAmount - discountAmount).toFixed(2));

    return {
      baseAmount,
      discountAmount,
      finalAmount,
      appliedCoupon: couponDiscountPercentage > 0 ? couponCode?.toUpperCase() : undefined,
      companyDiscountPercentage,
      couponDiscountPercentage
    };
  }

  /**
   * Processa cobrança via PIX
   */
  static async generatePixCharge(
    tenantId: string,
    plan: 'starter' | 'pro',
    couponCode?: string
  ): Promise<{
    finalAmount: number;
    pixPayload: string;
    pixQrCode: string;
    instantActive: boolean;
  }> {
    const priceCalculation = await this.calculatePrice(tenantId, plan, couponCode);

    // Se o valor final for 0 (devido a cupom 100%), ativa imediatamente!
    if (priceCalculation.finalAmount === 0) {
      await this.activateSubscription(tenantId, plan);
      return {
        finalAmount: 0,
        pixPayload: '',
        pixQrCode: '',
        instantActive: true
      };
    }

    // Gerar código EMV de pagamento PIX estático simulado para o piloto
    const txId = `TX${Date.now()}`;
    const payload = `00020101021226830014br.gov.bcb.pix2561pix.hbflow.com.br/invoice/${txId}5204000053039865405${priceCalculation.finalAmount.toFixed(2)}5802BR5915HBFlow%20Payments6009Sao%20Paulo62070503***6304ABCD`;
    
    // Retorna QR Code mockup em base64
    const qrCode = 'mock_pix_qr_code_base64_payload';

    return {
      finalAmount: priceCalculation.finalAmount,
      pixPayload: payload,
      pixQrCode: qrCode,
      instantActive: false
    };
  }

  /**
   * Ativa ou renova a assinatura mensal do tenant por mais 30 dias
   */
  static async activateSubscription(tenantId: string, plan: 'starter' | 'pro'): Promise<{ success: boolean }> {
    const now = new Date();
    const expiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    await prisma.$transaction(async (tx) => {
      // 1. Atualizar o plano e status do Tenant
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'active',
          plan: plan,
          isActive: true
        }
      });

      // 2. Atualizar ou criar o TenantBilling
      await tx.tenantBilling.upsert({
        where: { tenantId },
        create: {
          tenantId,
          currentPeriodStart: now,
          currentPeriodEnd: expiration
        },
        update: {
          currentPeriodStart: now,
          currentPeriodEnd: expiration
        }
      });
    });

    // 3. Criar AuditLog de ativação
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'billing.subscription.activate',
        entity: 'tenant',
        entityId: tenantId,
        metadata: {
          plan,
          activationDate: now.toISOString(),
          expirationDate: expiration.toISOString()
        }
      }
    });

    return { success: true };
  }
}
