import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';
import { BillingCalculatorService } from '@/server/services/billing/billing-calculator.service';
import { InvoiceService } from '@/server/services/billing/invoice.service';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Código do cupom é obrigatório' }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, deletedAt: null },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Assinatura ativa não encontrada' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Simular e validar o cupom usando o BillingCalculatorService
    // Se o cupom for inválido, o BillingCalculatorService lançará um erro com a causa exata
    const calculation = await BillingCalculatorService.calculate(
      tenantId,
      subscription.planId,
      cleanCode
    );

    // Buscar o cupom para obter sua duração
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode }
    });

    if (!coupon) {
      return NextResponse.json({ success: false, error: 'Cupom não encontrado' }, { status: 404 });
    }

    // 2. Aplicar o cupom
    if (coupon.duration === 'forever') {
      // Cupom permanente: desativa cupons permanentes anteriores do tenant
      await prisma.tenantDiscount.updateMany({
        where: { tenantId, couponId: { not: null }, isActive: true },
        data: { isActive: false, endsAt: new Date() }
      });

      // Cria um TenantDiscount permanente ativo
      await prisma.tenantDiscount.create({
        data: {
          tenantId,
          couponId: coupon.id,
          type: coupon.type,
          value: coupon.value,
          reason: `Cupom ${coupon.code} aplicado permanentemente`,
          startsAt: new Date(),
          isActive: true
        }
      });

      // Recalcular fatura em aberto (se existir) para refletir o cupom imediatamente
      const openInvoice = await prisma.invoice.findFirst({
        where: { tenantId, status: { in: ['draft', 'open'] }, deletedAt: null }
      });
      if (openInvoice) {
        await InvoiceService.generateMonthlyInvoice(
          tenantId,
          subscription.id,
          openInvoice.billingPeriodStart,
          openInvoice.billingPeriodEnd
        );
      }
    } else if (coupon.duration === 'once') {
      // Cupom de uso único (primeira mensalidade)
      // Se houver uma fatura aberta, regenera informando o cupom para que ela registre o desconto
      const openInvoice = await prisma.invoice.findFirst({
        where: { tenantId, status: { in: ['draft', 'open'] }, deletedAt: null }
      });
      if (openInvoice) {
        await InvoiceService.generateMonthlyInvoice(
          tenantId,
          subscription.id,
          openInvoice.billingPeriodStart,
          openInvoice.billingPeriodEnd,
          coupon.code
        );
      }
    }

    return NextResponse.json({
      success: true,
      subtotalCents: calculation.baseAmountCents,
      discountCents: calculation.discountCents,
      totalCents: calculation.totalCents,
      couponCode: coupon.code,
      duration: coupon.duration
    });
  } catch (error: any) {
    console.error('Error applying coupon:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 400 }
    );
  }
}
