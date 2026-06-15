import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { AuditService } from '@/server/audit/audit.service';
import { REQUEST_ID_HEADER } from '@/lib/request-id/requestId';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Find settings or create them with defaults if they don't exist
    let settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId }
    });

    if (!settings) {
      settings = await prisma.tenantSettings.create({
        data: {
          tenantId: user.tenantId,
          brandingName: 'HBFlow Workspace',
          brandingColor: '#7C3AED',
          defaultLanguage: 'pt_BR',
          defaultTimezone: 'America/Sao_Paulo',
          businessHoursJson: JSON.stringify({
            timezone: 'America/Sao_Paulo',
            workdays: [1, 2, 3, 4, 5], // Mon-Fri
            startHour: '08:00',
            endHour: '18:00',
            outOfOfficeMessage: 'Olá! Nosso horário de atendimento é de segunda a sexta, das 08:00 às 18:00. Retornaremos o seu contato assim que possível.'
          }),
          settingsJson: JSON.stringify({
            allowSignature: true,
            signaturePosition: 'end',
            firstResponseSlaMinutes: 15,
            subsequentSlaMinutes: 15,
            totalResolutionSlaMinutes: 120,
            maxWorkload: 10,
            routingMode: 'round_robin', // round_robin | workload | manual
            enableQueueOverflow: false,
            overflowThresholdMinutes: 10,
            overflowTargetDepartmentId: '',
            enableAutoClose: false,
            autoCloseInactivityHours: 24,
            enableAiTriage: false,
            aiTimeoutMinutes: 5,
            aiTone: 'friendly', // friendly | formal | technical | direct
            webhookUrl: '',
            webhookToken: '',
            forceMfa: false,
            restrictExportToAdmins: true,
            sessionTimeoutHours: 8
          })
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error: any) {
    console.error('Error fetching tenant settings:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Authorization check: Only Admin, Gestor, or Supervisor can modify global settings
    const operator = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    const isAuthorized = operator && ['Admin', 'Gestor', 'Supervisor'].includes(operator.role?.name || '');
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Permissão insuficiente para alterar configurações' }, { status: 403 });
    }

    const body = await request.json();
    const {
      brandingName,
      defaultLanguage,
      defaultTimezone,
      businessHoursJson,
      settingsJson
    } = body;

    // Find original settings for audit comparison
    const originalSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId }
    });

    // Perform update
    const updatedSettings = await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      update: {
        brandingName: brandingName !== undefined ? brandingName : undefined,
        defaultLanguage: defaultLanguage !== undefined ? defaultLanguage : undefined,
        defaultTimezone: defaultTimezone !== undefined ? defaultTimezone : undefined,
        businessHoursJson: businessHoursJson !== undefined ? businessHoursJson : undefined,
        settingsJson: settingsJson !== undefined ? settingsJson : undefined,
      },
      create: {
        tenantId: user.tenantId,
        brandingName: brandingName || 'HBFlow Workspace',
        defaultLanguage: defaultLanguage || 'pt_BR',
        defaultTimezone: defaultTimezone || 'America/Sao_Paulo',
        businessHoursJson: businessHoursJson || '{}',
        settingsJson: settingsJson || '{}'
      }
    });

    // Audit log tracking
    const requestId = request.headers.get(REQUEST_ID_HEADER) || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    await AuditService.log({
      action: 'settings.update',
      tenantId: user.tenantId,
      userId: user.userId,
      entity: 'TenantSettings',
      entityId: updatedSettings.id,
      requestId,
      ipAddress,
      userAgent,
      metadata: {
        brandingName,
        defaultLanguage,
        defaultTimezone,
        changedFields: Object.keys(body)
      }
    });

    return NextResponse.json({
      success: true,
      settings: updatedSettings
    });
  } catch (error: any) {
    console.error('Error updating tenant settings:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
