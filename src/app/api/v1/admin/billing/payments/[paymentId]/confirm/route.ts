import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { confirmPaymentSchema } from '@/server/validators/billing.validator';
import { PaymentConfirmationService } from '@/server/services/billing/payment-confirmation.service';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  const params = await props.params;
  const { paymentId } = params;
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem confirmar pagamentos' }, { status: 403 });
    }

    const body = await request.json();
    const data = confirmPaymentSchema.parse(body);

    const result = await PaymentConfirmationService.confirmPayment(paymentId, data.amountCents);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
