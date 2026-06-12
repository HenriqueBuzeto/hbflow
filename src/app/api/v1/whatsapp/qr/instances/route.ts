import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';
import { featureFlagService } from '@/lib/feature-flags/FeatureFlagService';
import { prisma } from '@/server/db/prisma';
import { WhatsAppQrGatewayProvider } from '@/server/services/whatsapp/whatsapp-qr-gateway.provider';
import { AuditService } from '@/server/audit/audit.service';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('whatsapp.connection.manage');
    const tenantId = await requireActiveSubscription();

    const connection = await prisma.whatsappConnection.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, connection }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching active connection:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate and enforce permission
    await requirePermission('whatsapp.connection.manage');
    
    // 2. Enforce active subscription and obtain tenantId
    const tenantId = await requireActiveSubscription();

    // 3. Enforce feature flag
    const isFeatureEnabled = await featureFlagService.isFeatureEnabled('whatsapp_qr_gateway_enabled', tenantId);
    const isEnvEnabled = process.env.WHATSAPP_QR_GATEWAY_ENABLED === 'true' || process.env.whatsapp_qr_gateway_enabled === 'true';
    if (!isFeatureEnabled && !isEnvEnabled) {
      return NextResponse.json({ error: 'Modo QR Code desativado para este tenant' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: 'O nome da conexão é obrigatório' }, { status: 400 });
    }

    // 4. Create unique instance name
    const instanceName = `inst-${tenantId.substring(0, 8)}-${Date.now()}`;

    // 5. Soft-delete any existing active connections for the tenant to ensure only one is active at a time
    await prisma.whatsappConnection.updateMany({
      where: { tenantId, deletedAt: null },
      data: { deletedAt: new Date() }
    });

    // 6. Save WhatsappConnection record
    const connection = await prisma.whatsappConnection.create({
      data: {
        tenantId,
        name,
        provider: 'qr_gateway',
        instanceName,
        status: 'disconnected'
      }
    });

    // 6. Call Evolution API to create instance
    const qrProvider = new WhatsAppQrGatewayProvider();
    const result = await qrProvider.createInstance(instanceName);

    // Check if Evolution API returned an error
    const hasError = result.error || result.status >= 400 || (result.response && result.response.message);
    if (hasError) {
      // Clean up connection record from database
      await prisma.whatsappConnection.delete({ where: { id: connection.id } });
      const errMsg = result.error || result.message || (result.response && JSON.stringify(result.response)) || 'Erro ao criar instância no gateway';
      return NextResponse.json({ success: false, error: errMsg, result }, { status: 400 });
    }

    // Write audit log
    await AuditService.log({
      tenantId,
      action: 'whatsapp.connection.create',
      entity: 'connection',
      entityId: connection.id,
      metadata: { instanceName, provider: 'qr_gateway' }
    });

    return NextResponse.json({ success: true, connection, result }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating QR connection instance:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

