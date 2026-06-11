import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppMessageService } from '@/server/services/whatsapp/whatsapp-message.service';
import { prisma } from '@/server/db/prisma';

/**
 * GET - WhatsApp Cloud API Webhook Verification (Challenge Check)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
      if (mode === 'subscribe') {
        // Procurar por qualquer conexão com esse token de validação
        const connection = await prisma.whatsappConnection.findFirst({
          where: { verifyToken: token, deletedAt: null }
        });

        const isEnvValid = token === process.env.WHATSAPP_VERIFY_TOKEN;

        if (connection || isEnvValid) {
          console.log('Webhook do WhatsApp verificado e ativo com sucesso!');
          return new NextResponse(challenge, { status: 200 });
        }
      }
    }

    return new NextResponse('Token de validação inválido', { status: 403 });
  } catch (error: any) {
    console.error('Erro de verificação do Webhook:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

/**
 * POST - Recebimento de eventos e mensagens (Cloud API + Evolution/Baileys)
 */
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    let bodyJson: any;

    try {
      bodyJson = JSON.parse(bodyText);
    } catch (e) {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    // Mapear headers para um Record<string, string>
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Delegar processamento para o WhatsAppMessageService
    const result = await WhatsAppMessageService.handleWebhook(headers, bodyText, bodyJson);

    if (!result.success) {
      return NextResponse.json({ error: result.message || 'Webhook processing failed' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      processedCount: result.processedCount, 
      message: result.message 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook POST handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
