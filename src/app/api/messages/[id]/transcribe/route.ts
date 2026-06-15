import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { messageIdParamsSchema } from '@/server/validators/message.validator';
import { validateParams, handleValidationError } from '@/server/validators/validation.helper';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validatedParams = validateParams(messageIdParamsSchema, await params);
    const { id } = validatedParams;

    // Verificar autenticação e permissões
    await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('messages.read');

    // Buscar a mensagem do banco de dados
    const message = await prisma.message.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
    }

    if (message.type !== 'audio' || !message.mediaUrl) {
      return NextResponse.json({ error: 'A mensagem não é um áudio ou não possui arquivo de mídia' }, { status: 400 });
    }

    // Se já estiver transcrito (não for apenas o marcador "[Áudio]")
    if (message.body && message.body !== '[Áudio]') {
      return NextResponse.json({ text: message.body });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chave de API da OpenAI não configurada no ambiente' }, { status: 500 });
    }

    // Extrair os dados binários do base64 do Data URI
    const base64Parts = message.mediaUrl.split(';base64,');
    const base64Data = base64Parts.pop();
    if (!base64Data) {
      return NextResponse.json({ error: 'Formato de arquivo de áudio inválido' }, { status: 400 });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    
    // Identificar a extensão do arquivo e mimetype
    const mimeMatch = message.mediaUrl.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/ogg';
    
    let filename = 'audio.ogg';
    if (mimeType.includes('audio/mpeg') || mimeType.includes('audio/mp3')) {
      filename = 'audio.mp3';
    } else if (mimeType.includes('audio/wav')) {
      filename = 'audio.wav';
    } else if (mimeType.includes('audio/x-m4a') || mimeType.includes('audio/m4a')) {
      filename = 'audio.m4a';
    } else if (mimeType.includes('audio/webm')) {
      filename = 'audio.webm';
    }

    // Construir FormData com o objeto File para a API Whisper da OpenAI
    const file = new File([buffer], filename, { type: mimeType });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API call failed:', errorText);
      return NextResponse.json({ error: 'Falha na comunicação com o serviço de transcrição OpenAI' }, { status: 520 });
    }

    const whisperData = await whisperResponse.json();
    const transcribedText = whisperData.text || '';

    if (transcribedText) {
      // Atualizar o corpo da mensagem com a transcrição correspondente no banco de dados
      await prisma.message.update({
        where: { id },
        data: { body: transcribedText }
      });
    }

    return NextResponse.json({ text: transcribedText });
  } catch (error: any) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;

    console.error('Erro na rota de transcrição:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
