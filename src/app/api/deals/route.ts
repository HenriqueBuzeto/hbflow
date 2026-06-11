import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { createDealSchema, listDealsQuerySchema } from '@/server/validators/deal.validator';
import { validateQuery, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('deals.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = validateQuery(listDealsQuerySchema, searchParams);

    const { page, pageSize, search, status, pipelineId, stageId, ownerUserId, contactId, conversationId, source, minValue, maxValue, sortBy, sortOrder } = query;

    // Validate sort field (already validated by schema, but use default if not provided)
    const allowedSortFields = ['createdAt', 'updatedAt', 'expectedCloseDate', 'value', 'probability'];
    const validSortBy = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = sortOrder || 'desc';

    // Build where clause
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    // Status filter
    if (status) {
      where.status = status;
    }

    // Pipeline filter
    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    // Stage filter
    if (stageId) {
      where.stageId = stageId;
    }

    // Owner user filter
    if (ownerUserId) {
      where.ownerUserId = ownerUserId;
    }

    // Contact filter
    if (contactId) {
      where.contactId = contactId;
    }

    // Conversation filter
    if (conversationId) {
      where.conversationId = conversationId;
    }

    // Source filter
    if (source) {
      where.source = source;
    }

    // Value range filter
    if (minValue || maxValue) {
      where.value = {};
      if (minValue) where.value.gte = parseFloat(minValue);
      if (maxValue) where.value.lte = parseFloat(maxValue);
    }

    // Search filter (title or contact.name)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get total count
    const total = await prisma.deal.count({ where });

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    // Fetch deals
    const deals = await prisma.deal.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
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
        pipeline: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [validSortBy]: validSortOrder,
      },
      skip,
      take: pageSize,
    });

    // Log audit event
    await AuditService.log({
      action: 'DEAL_LIST_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'DEAL',
      requestId,
      metadata: {
        filters: { status, pipelineId, stageId, ownerUserId, contactId, conversationId, source, minValue, maxValue, search },
        pagination: { page, pageSize },
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: deals,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
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

    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('deals.create');

    const body = await request.json();
    const validatedData = validateBody(createDealSchema, body);

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Validate contactId belongs to same tenant and is not deleted
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

    // Validate conversationId if provided
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
    }

    // Validate pipelineId and stageId belong to tenant
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

    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: validatedData.stageId,
        pipelineId: validatedData.pipelineId,
      },
    });

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage not found' },
        { status: 404 }
      );
    }

    // Validate ownerUserId if provided
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
    }

    // Create deal
    const deal = await prisma.deal.create({
      data: {
        tenantId,
        contactId: validatedData.contactId,
        conversationId: validatedData.conversationId,
        pipelineId: validatedData.pipelineId,
        stageId: validatedData.stageId,
        ownerUserId: validatedData.ownerUserId,
        title: validatedData.title,
        value: validatedData.value,
        probability: validatedData.probability,
        expectedCloseDate: validatedData.expectedCloseDate ? new Date(validatedData.expectedCloseDate) : undefined,
        status: validatedData.status || 'open',
        source: validatedData.source,
        notes: validatedData.notes,
        deletedAt: null,
      },
    });

    // Handle products if provided
    if (validatedData.products && validatedData.products.length > 0) {
      for (const product of validatedData.products) {
        await prisma.dealProduct.create({
          data: {
            dealId: deal.id,
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
      action: 'DEAL_CREATED',
      tenantId,
      userId: user.userId,
      entity: 'DEAL',
      entityId: deal.id,
      requestId,
      metadata: {
        title: deal.title,
        value: deal.value,
        contactId: deal.contactId,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: deal,
    }, { status: 201 });

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

    console.error('Error creating deal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
