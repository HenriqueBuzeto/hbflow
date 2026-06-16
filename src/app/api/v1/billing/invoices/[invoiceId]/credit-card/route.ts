import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { CreditCardPaymentService } from '@/server/services/billing/credit-card-payment.service';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ invoiceId: string }> }
) {
  const params = await props.params;
  const { invoiceId } = params;

  try {
    const tenantId = await requireTenant();
    const body = await request.json();
    const { number, holder, expiry, cvv } = body;

    if (!number || !holder || !expiry || !cvv) {
      return NextResponse.json(
        { success: false, error: 'Dados do cartão incompletos' },
        { status: 400 }
      );
    }

    const result = await CreditCardPaymentService.processPayment(tenantId, invoiceId, {
      number,
      holder,
      expiry,
      cvv
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error processing credit card payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
