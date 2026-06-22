import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';
import { PaymentConfirmationService } from '@/server/services/billing/payment-confirmation.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('billing.manage');
    await requireActiveSubscription();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const where: any = { deletedAt: null };
    if (status && status !== 'all') {
      where.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, document: true }
        },
        payments: {
          select: { id: true, status: true, amountCents: true, provider: true, method: true, paidAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error: any) {
    console.error('Error fetching admin invoices:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission('billing.manage');
    await requireActiveSubscription();

    const body = await request.json();
    const { invoiceId, action } = body;

    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'invoiceId é obrigatório' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Fatura não encontrada' }, { status: 404 });
    }

    const now = new Date();

    if (action === 'confirm') {
      // Find or create pending payment
      let payment = invoice.payments.find(p => p.status === 'pending');
      if (!payment) {
        payment = await prisma.payment.create({
          data: {
            tenantId: invoice.tenantId,
            invoiceId: invoice.id,
            provider: 'manual_pix',
            method: 'pix',
            status: 'pending',
            amountCents: invoice.totalCents
          }
        });
      }

      await PaymentConfirmationService.confirmPayment(payment.id, invoice.totalCents);

      return NextResponse.json({ success: true, message: 'Pagamento confirmado e assinatura ativada com sucesso!' });
    }

    if (action === 'confidence') {
      // Activating confidence grace period of 3 days
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId: invoice.tenantId }
      });

      let currentSettings: Record<string, any> = {};
      if (settings?.settingsJson) {
        try {
          currentSettings = JSON.parse(settings.settingsJson);
        } catch (e) {
          console.error('Failed to parse settingsJson, initializing empty:', e);
        }
      }

      currentSettings.confidenceActiveUntil = gracePeriodEnd.toISOString();
      currentSettings.lastConfidenceUsedInvoiceId = invoice.id;
      currentSettings.lastConfidenceUsedAt = now.toISOString();

      await prisma.tenantSettings.upsert({
        where: { tenantId: invoice.tenantId },
        create: {
          tenantId: invoice.tenantId,
          settingsJson: JSON.stringify(currentSettings)
        },
        update: {
          settingsJson: JSON.stringify(currentSettings)
        }
      });

      // Update tenant status to active
      await prisma.tenant.update({
        where: { id: invoice.tenantId },
        data: { status: 'active', isBlocked: false }
      });

      // Update active subscription status to active/trialing/free
      const sub = await prisma.subscription.findFirst({
        where: { tenantId: invoice.tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' }
      });
      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { currentPeriodEnd: gracePeriodEnd }
        });
      }

      // Log a system event
      await prisma.systemEvent.create({
        data: {
          tenantId: invoice.tenantId,
          eventType: 'billing.confidence_payment',
          severity: 'info',
          message: `Acesso comercial liberado manualmente pelo administrador sob confiança até ${gracePeriodEnd.toLocaleDateString('pt-BR')}. Fatura ID: ${invoice.id}`
        }
      });

      return NextResponse.json({ success: true, message: 'Acesso por confiança de 3 dias liberado com sucesso!' });
    }

    return NextResponse.json({ success: false, error: 'Ação desconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling admin invoice action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
