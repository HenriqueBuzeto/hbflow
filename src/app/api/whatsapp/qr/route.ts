import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppQrGatewayProvider } from '@/server/services/whatsapp/whatsapp-qr-gateway.provider';

/**
 * GET - Busca o QR Code ou status da conexão do QR Gateway
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instanceName');

    if (!instanceName) {
      return NextResponse.json({ error: 'Parâmetro instanceName é obrigatório' }, { status: 400 });
    }

    const qrProvider = new WhatsAppQrGatewayProvider();
    const result = await qrProvider.getQrCode(instanceName);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar QR Code da Evolution API:', error);
    return NextResponse.json({ error: error.message || 'Falha de comunicação com o Gateway' }, { status: 500 });
  }
}

/**
 * POST - Cria uma nova instância do WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceName } = body;

    if (!instanceName) {
      return NextResponse.json({ error: 'Parâmetro instanceName é obrigatório' }, { status: 400 });
    }

    const qrProvider = new WhatsAppQrGatewayProvider();
    const result = await qrProvider.createInstance(instanceName);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar instância na Evolution API:', error);
    return NextResponse.json({ error: error.message || 'Falha de comunicação com o Gateway' }, { status: 500 });
  }
}
