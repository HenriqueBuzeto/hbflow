import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';
import { InfinitePayProvider } from '@/server/services/billing/providers/infinitepay.provider';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    // 1. Validar autenticação do operador
    await requireAuth();

    // 2. Obter e validar o tenant ativo do operador
    const tenantId = await requireTenant();

    const params = await props.params;
    const { paymentId } = params;

    // 3. Buscar o pagamento e garantir que pertence ao tenant
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment || payment.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Pagamento não encontrado ou não pertence a este inquilino' },
        { status: 404 }
      );
    }

    // 4. Executar checagem ativa junto ao checkout da InfinitePay
    const result = await InfinitePayProvider.checkPaymentStatus(paymentId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking InfinitePay payment status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
