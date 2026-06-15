import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireFeature } from '@/server/middleware/feature.middleware';

/**
 * GET - Obter uma jornada específica
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ journeyId: string }> }
) {
  try {
    const tenantId = await requireFeature('after_sales_enabled');
    const { journeyId } = await props.params;

    const journey = await prisma.journey.findFirst({
      where: {
        id: journeyId,
        tenantId,
        deletedAt: null
      },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!journey) {
      return NextResponse.json({ error: 'Jornada não encontrada.' }, { status: 404 });
    }

    return NextResponse.json(journey);
  } catch (error: any) {
    if (error.message === 'FEATURE_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'Módulo indisponível para o seu plano.' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT - Editar/Atualizar uma jornada e reconstruir suas etapas
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ journeyId: string }> }
) {
  try {
    const tenantId = await requireFeature('after_sales_enabled');
    const { journeyId } = await props.params;
    const body = await request.json();

    const { name, description, trigger, triggerConfig, isActive, steps } = body;

    // Verificar existência
    const existing = await prisma.journey.findFirst({
      where: { id: journeyId, tenantId, deletedAt: null }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Jornada não encontrada.' }, { status: 404 });
    }

    const updatedJourney = await prisma.$transaction(async (tx) => {
      // 1. Atualizar campos básicos
      const journey = await tx.journey.update({
        where: { id: journeyId },
        data: {
          name: name !== undefined ? name : existing.name,
          description: description !== undefined ? description : existing.description,
          trigger: trigger !== undefined ? trigger : existing.trigger,
          triggerConfig: triggerConfig !== undefined ? (triggerConfig ? JSON.stringify(triggerConfig) : null) : existing.triggerConfig,
          isActive: isActive !== undefined ? isActive : existing.isActive
        }
      });

      // 2. Se etapas forem fornecidas, fazemos um soft delete nas antigas e criamos as novas
      if (steps && Array.isArray(steps)) {
        // Soft delete de todas as etapas atuais
        await tx.journeyStep.updateMany({
          where: { journeyId: journey.id, deletedAt: null },
          data: { deletedAt: new Date() }
        });

        // Criar as novas etapas
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

      // 3. Registrar auditoria
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'journey.updated',
          entity: 'journey',
          entityId: journey.id,
          metadata: {
            name: journey.name,
            trigger: journey.trigger,
            isActive: journey.isActive,
            stepsRebuilt: !!steps
          }
        }
      });

      return journey;
    });

    // Buscar completa
    const full = await prisma.journey.findUnique({
      where: { id: updatedJourney.id },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(full);
  } catch (error: any) {
    console.error('Error updating journey:', error);
    if (error.message === 'FEATURE_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'Módulo indisponível para o seu plano.' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE - Soft delete na jornada e cancelar agendamentos futuros atrelados
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ journeyId: string }> }
) {
  try {
    const tenantId = await requireFeature('after_sales_enabled');
    const { journeyId } = await props.params;

    // Verificar existência
    const existing = await prisma.journey.findFirst({
      where: { id: journeyId, tenantId, deletedAt: null }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Jornada não encontrada.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Soft delete da Jornada
      await tx.journey.update({
        where: { id: journeyId },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      });

      // 2. Soft delete das etapas
      await tx.journeyStep.updateMany({
        where: { journeyId, deletedAt: null },
        data: { deletedAt: new Date() }
      });

      // 3. Cancelar agendamentos pendentes associados a esta jornada
      await tx.scheduledMessage.updateMany({
        where: {
          tenantId,
          journeyId,
          status: 'pending',
          deletedAt: null
        },
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      });

      // 4. Cancelar execuções de contatos
      await tx.contactJourney.updateMany({
        where: {
          tenantId,
          journeyId,
          status: 'active',
          deletedAt: null
        },
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      });

      // 5. Registrar auditoria
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'journey.deleted',
          entity: 'journey',
          entityId: journeyId,
          metadata: {
            name: existing.name
          }
        }
      });
    });

    return NextResponse.json({ success: true, message: 'Jornada e agendamentos cancelados.' });
  } catch (error: any) {
    console.error('Error deleting journey:', error);
    if (error.message === 'FEATURE_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'Módulo indisponível para o seu plano.' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST - Clonar/Duplicar Jornada existente
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ journeyId: string }> }
) {
  try {
    const tenantId = await requireFeature('after_sales_enabled');
    const { journeyId } = await props.params;

    // Buscar a jornada e suas etapas
    const original = await prisma.journey.findFirst({
      where: { id: journeyId, tenantId, deletedAt: null },
      include: {
        steps: {
          where: { deletedAt: null }
        }
      }
    });

    if (!original) {
      return NextResponse.json({ error: 'Jornada não encontrada.' }, { status: 404 });
    }

    const cloned = await prisma.$transaction(async (tx) => {
      // Criar cópia
      const journey = await tx.journey.create({
        data: {
          tenantId,
          name: `${original.name} (Cópia)`,
          description: original.description,
          trigger: original.trigger,
          triggerConfig: original.triggerConfig,
          isActive: false // criar desativada por segurança
        }
      });

      // Copiar etapas
      if (original.steps.length > 0) {
        const stepsData = original.steps.map((step: any) => ({
          journeyId: journey.id,
          name: step.name,
          delayValue: step.delayValue,
          delayUnit: step.delayUnit,
          message: step.message,
          channel: step.channel,
          isActive: step.isActive,
          order: step.order
        }));

        await tx.journeyStep.createMany({
          data: stepsData
        });
      }

      // Auditoria
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'journey.created',
          entity: 'journey',
          entityId: journey.id,
          metadata: {
            clonedFrom: original.id,
            name: journey.name
          }
        }
      });

      return journey;
    });

    const fullCloned = await prisma.journey.findUnique({
      where: { id: cloned.id },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(fullCloned, { status: 201 });
  } catch (error: any) {
    console.error('Error duplicating journey:', error);
    if (error.message === 'FEATURE_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'Módulo indisponível para o seu plano.' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
