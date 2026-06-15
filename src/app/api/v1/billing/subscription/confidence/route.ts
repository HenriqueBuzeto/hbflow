import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';

export async function POST() {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();

    // 1. Fetch overdue/open invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['open', 'overdue'] },
        deletedAt: null
      },
      orderBy: { dueDate: 'asc' }
    });

    if (overdueInvoices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Não há faturas pendentes ou vencidas para liberação por confiança.' },
        { status: 400 }
      );
    }

    const oldestInvoice = overdueInvoices[0];

    // 2. Fetch TenantSettings to read/write settingsJson
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    let currentSettings: Record<string, any> = {};
    if (settings?.settingsJson) {
      try {
        currentSettings = JSON.parse(settings.settingsJson);
      } catch (e) {
        console.error('Failed to parse settingsJson, initializing empty:', e);
      }
    }

    // 3. Check if confidence payment was already used for this specific invoice
    if (currentSettings.lastConfidenceUsedInvoiceId === oldestInvoice.id) {
      return NextResponse.json(
        { success: false, error: 'A liberação por confiança já foi utilizada para a fatura pendente atual. Por favor, efetue o pagamento.' },
        { status: 400 }
      );
    }

    // 4. Calculate grace period limit: 3 days from now
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

    // 5. Update settingsJson properties
    currentSettings.confidenceActiveUntil = gracePeriodEnd.toISOString();
    currentSettings.lastConfidenceUsedInvoiceId = oldestInvoice.id;
    currentSettings.lastConfidenceUsedAt = new Date().toISOString();

    // 6. Save back to database
    await prisma.tenantSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        settingsJson: JSON.stringify(currentSettings)
      },
      update: {
        settingsJson: JSON.stringify(currentSettings)
      }
    });

    // 7. Log a system event for auditing
    await prisma.systemEvent.create({
      data: {
        tenantId,
        eventType: 'billing.confidence_payment',
        severity: 'info',
        message: `Acesso comercial liberado temporariamente por confiança (promessa de pagamento) até ${gracePeriodEnd.toLocaleDateString('pt-BR')}. Fatura ID: ${oldestInvoice.id}`,
        metadata: JSON.stringify({
          invoiceId: oldestInvoice.id,
          invoiceNumber: oldestInvoice.invoiceNumber,
          activatedBy: user.userId,
          expiresAt: gracePeriodEnd.toISOString()
        })
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Acesso comercial liberado temporariamente por 72 horas!',
      confidenceActiveUntil: gracePeriodEnd.toISOString()
    });

  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error activating confidence payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
