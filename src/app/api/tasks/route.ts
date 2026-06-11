import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { createTaskSchema, listTasksQuerySchema } from '@/server/validators/task.validator';
import { validateQuery, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('tasks.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const query = validateQuery(listTasksQuerySchema, searchParams);

    const { page, pageSize, search, status, priority, type, assignedUserId, contactId, dealId, conversationId, dueBefore, dueAfter, sortBy, sortOrder } = query;

    // Validate sort field (already validated by schema, but use default if not provided)
    const allowedSortFields = ['dueAt', 'createdAt', 'updatedAt', 'priority', 'status'];
    const validSortBy = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'dueAt';
    const validSortOrder = sortOrder || 'asc';

    // Build where clause
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    // Status filter
    if (status) {
      where.status = status;
    }

    // Priority filter
    if (priority) {
      where.priority = priority;
    }

    // Type filter
    if (type) {
      where.type = type;
    }

    // Assigned user filter
    if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    // Contact filter
    if (contactId) {
      where.contactId = contactId;
    }

    // Deal filter
    if (dealId) {
      where.dealId = dealId;
    }

    // Conversation filter
    if (conversationId) {
      where.conversationId = conversationId;
    }

    // Due date range filter
    if (dueBefore || dueAfter) {
      where.dueAt = {};
      if (dueAfter) where.dueAt.gte = new Date(dueAfter);
      if (dueBefore) where.dueAt.lte = new Date(dueBefore);
    }

    // Search filter (title or notes)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.task.count({ where });

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    // Fetch tasks
    const tasks = await prisma.task.findMany({
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
        deal: {
          select: {
            id: true,
            title: true,
            value: true,
          },
        },
        conversation: {
          select: {
            id: true,
            status: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
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
      action: 'TASK_LIST_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'TASK',
      requestId,
      metadata: {
        filters: { status, priority, type, assignedUserId, contactId, dealId, conversationId, dueBefore, dueAfter, search },
        pagination: { page, pageSize },
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: tasks,
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

    console.error('Error fetching tasks:', error);
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
    await requirePermission('tasks.create');

    const body = await request.json();
    const validatedData = validateBody(createTaskSchema, body);

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Validate contactId if provided
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
    }

    // Validate dealId if provided
    if (validatedData.dealId) {
      const deal = await prisma.deal.findFirst({
        where: {
          id: validatedData.dealId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!deal) {
        return NextResponse.json(
          { error: 'Deal not found' },
          { status: 404 }
        );
      }
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

    // Validate assignedUserId if provided, otherwise use authenticated user
    const assignedUserId = validatedData.assignedUserId || user.userId;

    if (validatedData.assignedUserId) {
      const assignedUser = await prisma.user.findFirst({
        where: {
          id: validatedData.assignedUserId,
          tenantId,
        },
      });

      if (!assignedUser) {
        return NextResponse.json(
          { error: 'Assigned user not found' },
          { status: 404 }
        );
      }
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        tenantId,
        title: validatedData.title,
        contactId: validatedData.contactId,
        dealId: validatedData.dealId,
        conversationId: validatedData.conversationId,
        assignedUserId,
        dueAt: validatedData.dueAt ? new Date(validatedData.dueAt) : new Date(),
        priority: validatedData.priority,
        status: validatedData.status,
        type: validatedData.type,
        notes: validatedData.notes,
        deletedAt: null,
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'TASK_CREATED',
      tenantId,
      userId: user.userId,
      entity: 'TASK',
      entityId: task.id,
      requestId,
      metadata: {
        title: task.title,
        dueAt: task.dueAt,
        priority: task.priority,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: task,
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

    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
