import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { PixPaymentService } from '@/server/services/billing/pix-payment.service';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ chargeId: string }> }
) {
  const params = await props.params;
  const { chargeId } = params;
  try {
    // Permite verificar o status com acesso bloqueado/expirado
    await requireTenant();

    const status = await PixPaymentService.checkChargeStatus(chargeId);

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('Error fetching PIX status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
