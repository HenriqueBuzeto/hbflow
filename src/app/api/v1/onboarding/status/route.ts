import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireActiveSubscription();

    // 1. Perfil da Empresa (Tenant) preenchido
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    const profileCompleted = !!(tenant?.document && tenant?.email && tenant?.phone);

    // 2. Primeiro atendente secundário cadastrado (admin + secundário)
    const userCount = await prisma.user.count({
      where: { tenantId, deletedAt: null }
    });
    const usersAdded = userCount > 1;

    // 3. Primeira conexão de WhatsApp realizada (pelo menos 1 cadastrada e ativa)
    const connectionCount = await prisma.whatsappConnection.count({
      where: { tenantId, status: 'connected', deletedAt: null }
    });
    const connectionEstablished = connectionCount > 0;

    // 4. Criar a primeira tag de leads (contar se há tags vinculadas a contatos do inquilino)
    const tagCount = await prisma.contactTag.count({
      where: {
        contact: {
          tenantId
        }
      }
    });
    const tagsCreated = tagCount > 0;

    // 5. Configurar a primeira resposta rápida
    const quickReplyCount = await prisma.quickReply.count({
      where: { tenantId, isActive: true }
    });
    const quickRepliesCreated = quickReplyCount > 0;

    // 6. Enviar a primeira mensagem ativa (mensagem enviada pelo inquilino)
    const messageCount = await prisma.message.count({
      where: {
        tenantId,
        senderType: 'user'
      }
    });
    const messageSent = messageCount > 0;

    // 7. Obter status de dispensado das configurações do inquilino
    let settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });
    if (!settings) {
      settings = await prisma.tenantSettings.create({
        data: { tenantId, settingsJson: '{}' }
      });
    }
    const settingsObj = JSON.parse(settings.settingsJson || '{}');
    const onboardingDismissed = !!settingsObj.onboardingDismissed;

    return NextResponse.json({
      success: true,
      steps: {
        profileCompleted,
        usersAdded,
        connectionEstablished,
        tagsCreated,
        quickRepliesCreated,
        messageSent
      },
      onboardingDismissed
    });
  } catch (error: any) {
    console.error('Error fetching onboarding status:', error);
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ success: false, error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireActiveSubscription();
    const body = await request.json().catch(() => ({}));
    const { dismissed } = body;

    let settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });
    if (!settings) {
      settings = await prisma.tenantSettings.create({
        data: { tenantId, settingsJson: '{}' }
      });
    }

    const settingsObj = JSON.parse(settings.settingsJson || '{}');
    settingsObj.onboardingDismissed = !!dismissed;

    const updated = await prisma.tenantSettings.update({
      where: { id: settings.id },
      data: {
        settingsJson: JSON.stringify(settingsObj)
      }
    });

    return NextResponse.json({
      success: true,
      onboardingDismissed: !!settingsObj.onboardingDismissed
    });
  } catch (error: any) {
    console.error('Error updating onboarding status:', error);
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ success: false, error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
