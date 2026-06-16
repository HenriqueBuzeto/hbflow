import { NextRequest, NextResponse } from 'next/server';
import { infinitePayWebhookSchema } from '@/server/validators/billing.validator';
import { InfinitePayProvider } from '@/server/services/billing/providers/infinitepay.provider';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 1. Validar payload estruturalmente com Zod
    const payload = infinitePayWebhookSchema.parse(body);

    // 2. Processar a quitação de faturas/assinaturas no provider
    await InfinitePayProvider.handleWebhook(payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in InfinitePay webhook:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Bad Request' },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
