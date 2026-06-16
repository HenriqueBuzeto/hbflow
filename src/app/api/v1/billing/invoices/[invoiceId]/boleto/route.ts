import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { BoletoPaymentService } from '@/server/services/billing/boleto-payment.service';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ invoiceId: string }> }
) {
  const params = await props.params;
  const { invoiceId } = params;

  try {
    const tenantId = await requireTenant();

    const boletoCharge = await BoletoPaymentService.generateBoleto(tenantId, invoiceId);

    return NextResponse.json(boletoCharge);
  } catch (error: any) {
    console.error('Error generating Boleto:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
