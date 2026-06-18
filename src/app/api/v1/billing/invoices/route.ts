import { NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { InvoiceService } from '@/server/services/billing/invoice.service';

export async function GET() {
  try {
    // Permite buscar faturas mesmo com acesso expirado para permitir o pagamento
    const tenantId = await requireTenant();
    await requirePermission('billing.read');

    // Saneia faturas duplicadas antes de listar
    await InvoiceService.cleanupDuplicateInvoices(tenantId);

    const invoices = await prisma.invoice.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        pixCharges: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
