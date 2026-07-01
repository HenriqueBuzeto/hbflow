import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { InfinitePayProvider } from '@/server/services/billing/providers/infinitepay.provider';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ invoiceId: string }> }
) {
  const params = await props.params;
  const { invoiceId } = params;

  try {
    const tenantId = await requireTenant();

    // Redireciona para o checkout real da InfinitePay
    const result = await InfinitePayProvider.createCheckoutLink(invoiceId);

    return NextResponse.json({ success: true, checkoutUrl: result.checkoutUrl });
  } catch (error: any) {
    console.error('Error generating Boleto:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
