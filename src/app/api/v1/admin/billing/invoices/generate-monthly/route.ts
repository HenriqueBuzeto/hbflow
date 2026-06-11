import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { generateInvoiceSchema } from '@/server/validators/billing.validator';
import { InvoiceService } from '@/server/services/billing/invoice.service';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem gerar faturas' }, { status: 403 });
    }

    const body = await request.json();
    const data = generateInvoiceSchema.parse(body);
    const couponCode = body.couponCode;

    // Achar assinatura ativa do tenant
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId: data.tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Assinatura não encontrada para o inquilino informado' }, { status: 400 });
    }

    const invoice = await InvoiceService.generateMonthlyInvoice(
      data.tenantId,
      subscription.id,
      new Date(data.billingPeriodStart),
      new Date(data.billingPeriodEnd),
      couponCode
    );

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
