import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ invoiceId: string }> }
) {
  try {
    // 1. Obter tenant do operador logado
    const tenantId = await requireTenant();

    const params = await props.params;
    const { invoiceId } = params;

    // 2. Buscar fatura específica garantindo propriedade do tenant
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        subscription: {
          include: { plan: true }
        }
      }
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Fatura não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Error fetching single invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
