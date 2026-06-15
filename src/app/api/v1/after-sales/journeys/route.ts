import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireFeature } from '@/server/middleware/feature.middleware';

/**
 * GET - Listar jornadas ativas do tenant
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireFeature('after_sales_enabled');

    const journeys = await prisma.journey.findMany({
      where: {
        tenantId,
        deletedAt: null
      },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(journeys);
  } catch (error: any) {
    console.error('Error fetching journeys:', error);
    if (error.message === 'FEATURE_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'Módulo indisponível para o seu plano (Requer Upgrade).' }, { status: 403 });
    }
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST - Criar uma nova jornada de cliente e suas etapas
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireFeature('after_sales_enabled');
    const body = await request.json();

    const { name, description, trigger, triggerConfig, steps } = body;

    if (!name || !trigger) {
      return NextResponse.json({ error: 'Os campos nome e gatilho são obrigatórios.' }, { status: 400 });
    }

    const newJourney = await prisma.$transaction(async (tx) => {
      // 1. Criar a Jornada
      const journey = await tx.journey.create({
        data: {
          tenantId,
          name,
          description,
          trigger,
          triggerConfig: triggerConfig ? JSON.stringify(triggerConfig) : null,
          isActive: true
        }
      });

      // 2. Criar as etapas (steps) associadas se houver
      if (steps && Array.isArray(steps) && steps.length > 0) {
        const stepsData = steps.map((step: any, idx: number) => ({
          journeyId: journey.id,
          name: step.name || `Etapa ${idx + 1}`,
          delayValue: Number(step.delayValue) || 1,
          delayUnit: step.delayUnit || 'days',
          message: step.message || '',
          channel: step.channel || 'whatsapp',
          isActive: step.isActive !== false,
          order: step.order !== undefined ? Number(step.order) : idx
        }));

        await tx.journeyStep.createMany({
          data: stepsData
        });
      }

      // 3. Registrar auditoria do log
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'journey.created',
          entity: 'journey',
          entityId: journey.id,
          metadata: {
            name,
            trigger,
            stepsCount: steps?.length || 0
          }
        }
      });

      return journey;
    });

    // Buscar a jornada completa criada com as etapas
    const fullJourney = await prisma.journey.findUnique({
      where: { id: newJourney.id },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(fullJourney, { status: 201 });
  } catch (error: any) {
    console.error('Error creating journey:', error);
    if (error.message === 'FEATURE_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'Módulo indisponível para o seu plano (Requer Upgrade).' }, { status: 403 });
    }
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
