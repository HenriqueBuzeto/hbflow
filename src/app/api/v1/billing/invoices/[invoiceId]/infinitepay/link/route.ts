import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';
import { InfinitePayProvider } from '@/server/services/billing/providers/infinitepay.provider';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ invoiceId: string }> }
) {
  try {
    // 1. Validar autenticação do operador
    await requireAuth();

    // 2. Obter e validar o tenant ativo do operador
    const tenantId = await requireTenant();

    const params = await props.params;
    const { invoiceId } = params;

    // 3. Buscar a fatura e garantir que pertence ao tenant
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Fatura não encontrada para este inquilino' },
        { status: 404 }
      );
    }

    // 4. Validar status da fatura
    if (invoice.status !== 'open' && invoice.status !== 'overdue') {
      return NextResponse.json(
        { success: false, error: 'Apenas faturas abertas ou vencidas podem gerar link de pagamento' },
        { status: 400 }
      );
    }

    // 5. Validar que o valor é maior que zero
    if (invoice.totalCents <= 0) {
      return NextResponse.json(
        { success: false, error: 'Faturas de valor zero são processadas e quitadas automaticamente' },
        { status: 400 }
      );
    }

    // 6. Gerar o link do checkout InfinitePay
    const result = await InfinitePayProvider.createCheckoutLink(invoiceId);

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      slug: result.slug,
      paymentId: result.paymentId
    });
  } catch (error: any) {
    console.error('Error generating InfinitePay link:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
