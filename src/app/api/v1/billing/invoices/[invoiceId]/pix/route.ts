import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { PixPaymentService } from '@/server/services/billing/pix-payment.service';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ invoiceId: string }> }
) {
  const params = await props.params;
  const { invoiceId } = params;
  try {
    const tenantId = await requireTenant();

    const pixCharge = await PixPaymentService.generatePixCharge(tenantId, invoiceId);

    return NextResponse.json({ success: true, pixCharge });
  } catch (error: any) {
    console.error('Error generating PIX charge:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
