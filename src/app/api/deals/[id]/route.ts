import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { updateDealSchema, dealIdParamsSchema } from '@/server/validators/deal.validator';
import { validateParams, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validatedParams = validateParams(dealIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('deals.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find deal by id + tenantId + deletedAt null
    const deal = await prisma.deal.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        conversation: {
          select: {
            id: true,
            status: true,
          },
        },
        pipeline: {
          select: {
            id: true,
            name: true,
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
          },
        },
        ownerUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        products: true,
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
        stageHistory: {
          orderBy: {
            movedAt: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Log audit event
    await AuditService.log({
      action: 'DEAL_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'DEAL',
      entityId: id,
      requestId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: deal,
    });

  } catch (error) {
    // Handle validation errors first
    const validationError = handleValidationError(error);
    if (validationError) return validationError;

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      if (error.message === 'USER_HAS_NO_TENANT') {
        return NextResponse.json(
          { error: 'User has no tenant' },
          { status: 400 }
        );
      }
    }

    console.error('Error fetching deal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validatedParams = validateParams(dealIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('deals.update');

    const body = await request.json();
    const validatedData = validateBody(updateDealSchema, body);

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find deal by id + tenantId + deletedAt null
    const existingDeal = await prisma.deal.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingDeal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Track changed fields for audit log
    const changedFields: Record<string, { from: any; to: any }> = {};

    // Validate relationships if provided
    if (validatedData.contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: validatedData.contactId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!contact) {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 404 }
        );
      }

      if (validatedData.contactId !== existingDeal.contactId) {
        changedFields.contactId = { from: existingDeal.contactId, to: validatedData.contactId };
      }
    }

    if (validatedData.conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: validatedData.conversationId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      if (validatedData.conversationId !== existingDeal.conversationId) {
        changedFields.conversationId = { from: existingDeal.conversationId, to: validatedData.conversationId };
      }
    }

    if (validatedData.pipelineId) {
      const pipeline = await prisma.pipeline.findFirst({
        where: {
          id: validatedData.pipelineId,
          tenantId,
        },
      });

      if (!pipeline) {
        return NextResponse.json(
          { error: 'Pipeline not found' },
          { status: 404 }
        );
      }

      if (validatedData.pipelineId !== existingDeal.pipelineId) {
        changedFields.pipelineId = { from: existingDeal.pipelineId, to: validatedData.pipelineId };
      }
    }

    if (validatedData.stageId) {
      const stage = await prisma.pipelineStage.findFirst({
        where: {
          id: validatedData.stageId,
          pipelineId: validatedData.pipelineId || existingDeal.pipelineId,
        },
      });

      if (!stage) {
        return NextResponse.json(
          { error: 'Stage not found' },
          { status: 404 }
        );
      }

      if (validatedData.stageId !== existingDeal.stageId) {
        changedFields.stageId = { from: existingDeal.stageId, to: validatedData.stageId };
        // TODO: Documented for Phase 4 SQL/Triggers - Create stage history entry if structure exists
      }
    }

    if (validatedData.ownerUserId) {
      const ownerUser = await prisma.user.findFirst({
        where: {
          id: validatedData.ownerUserId,
          tenantId,
        },
      });

      if (!ownerUser) {
        return NextResponse.json(
          { error: 'Owner user not found' },
          { status: 404 }
        );
      }

      if (validatedData.ownerUserId !== existingDeal.ownerUserId) {
        changedFields.ownerUserId = { from: existingDeal.ownerUserId, to: validatedData.ownerUserId };
      }
    }

    // Track other field changes
    if (validatedData.title && validatedData.title !== existingDeal.title) {
      changedFields.title = { from: existingDeal.title, to: validatedData.title };
    }
    if (validatedData.value !== undefined && validatedData.value !== existingDeal.value) {
      changedFields.value = { from: existingDeal.value, to: validatedData.value };
    }
    if (validatedData.probability !== undefined && validatedData.probability !== existingDeal.probability) {
      changedFields.probability = { from: existingDeal.probability, to: validatedData.probability };
    }
    if (validatedData.status && validatedData.status !== existingDeal.status) {
      changedFields.status = { from: existingDeal.status, to: validatedData.status };
    }
    if (validatedData.source !== undefined && validatedData.source !== existingDeal.source) {
      changedFields.source = { from: existingDeal.source, to: validatedData.source };
    }

    // Handle status changes
    let wonAt = existingDeal.wonAt;
    let lostAt = existingDeal.lostAt;

    if (validatedData.status === 'won' && !existingDeal.wonAt) {
      wonAt = new Date();
      changedFields.wonAt = { from: null, to: wonAt };
    }
    if (validatedData.status === 'lost' && !existingDeal.lostAt) {
      lostAt = new Date();
      changedFields.lostAt = { from: null, to: lostAt };
    }

    // Update deal
    const deal = await prisma.deal.update({
      where: { id },
      data: {
        ...(validatedData.contactId && { contactId: validatedData.contactId }),
        ...(validatedData.conversationId !== undefined && { conversationId: validatedData.conversationId }),
        ...(validatedData.pipelineId && { pipelineId: validatedData.pipelineId }),
        ...(validatedData.stageId && { stageId: validatedData.stageId }),
        ...(validatedData.ownerUserId !== undefined && { ownerUserId: validatedData.ownerUserId }),
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.value !== undefined && { value: validatedData.value }),
        ...(validatedData.probability !== undefined && { probability: validatedData.probability }),
        ...(validatedData.expectedCloseDate && { expectedCloseDate: new Date(validatedData.expectedCloseDate) }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.source !== undefined && { source: validatedData.source }),
        ...(validatedData.lossReasonId && { lossReasonId: validatedData.lossReasonId }),
        ...(wonAt !== existingDeal.wonAt && { wonAt }),
        ...(lostAt !== existingDeal.lostAt && { lostAt }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
    });

    // Handle products if provided
    if (validatedData.products) {
      // Delete existing products
      await prisma.dealProduct.deleteMany({
        where: { dealId: id },
      });

      // Create new products
      for (const product of validatedData.products) {
        await prisma.dealProduct.create({
          data: {
            dealId: id,
            name: product.name,
            description: product.description,
            quantity: product.quantity,
            unitPrice: product.unitPrice,
            totalPrice: product.quantity * product.unitPrice,
          },
        });
      }
    }

    // Log audit event
    await AuditService.log({
      action: 'DEAL_UPDATED',
      tenantId,
      userId: user.userId,
      entity: 'DEAL',
      entityId: id,
      requestId,
      metadata: { changedFields },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: deal,
    });

  } catch (error) {
    // Handle validation errors first
    const validationError = handleValidationError(error);
    if (validationError) return validationError;

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      if (error.message === 'USER_HAS_NO_TENANT') {
        return NextResponse.json(
          { error: 'User has no tenant' },
          { status: 400 }
        );
      }

      // Zod validation errors
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation failed', details: error.message },
          { status: 400 }
        );
      }
    }

    console.error('Error updating deal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validatedParams = validateParams(dealIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('deals.delete');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find deal by id + tenantId + deletedAt null
    const existingDeal = await prisma.deal.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingDeal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Perform soft delete
    const deletedAt = new Date();
    const deal = await prisma.deal.update({
      where: { id },
      data: {
        deletedAt,
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'DEAL_DELETED',
      tenantId,
      userId: user.userId,
      entity: 'DEAL',
      entityId: id,
      requestId,
      metadata: { deletedAt: deletedAt.toISOString() },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: deal.id,
        deletedAt: deletedAt.toISOString(),
      },
    });

  } catch (error) {
    // Handle validation errors first
    const validationError = handleValidationError(error);
    if (validationError) return validationError;

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      if (error.message === 'USER_HAS_NO_TENANT') {
        return NextResponse.json(
          { error: 'User has no tenant' },
          { status: 400 }
        );
      }
    }

    console.error('Error deleting deal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
