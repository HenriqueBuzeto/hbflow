import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { createConversationSchema, listConversationsQuerySchema } from '@/server/validators/conversation.validator';
import { validateQuery, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('conversations.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const query = validateQuery(listConversationsQuerySchema, searchParams);

    const { page, pageSize, search, status, priority, departmentId, assignedUserId, contactId, channelId, sortBy, sortOrder } = query;

    // Validate sort field (already validated by schema, but use default if not provided)
    const allowedSortFields = ['lastMessageAt', 'createdAt', 'updatedAt', 'priority', 'status'];
    const validSortBy = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'lastMessageAt';
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

    // Priority filter
    if (priority) {
      where.priority = priority;
    }

    // Department filter
    if (departmentId) {
      where.departmentId = departmentId;
    }

    // Assigned user filter
    if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    // Contact filter
    if (contactId) {
      where.contactId = contactId;
    }

    // Search filter (contact name/phone or subject)
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search } } },
      ];
    }

    // Get total count
    const total = await prisma.conversation.count({ where });

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    // Fetch conversations
    const conversations = await prisma.conversation.findMany({
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
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: {
        [validSortBy]: validSortOrder,
      },
      skip,
      take: pageSize,
    });

    // Log audit event
    await AuditService.log({
      action: 'CONVERSATION_LIST_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'CONVERSATION',
      requestId,
      metadata: {
        filters: { status, priority, departmentId, assignedUserId, contactId, channelId, search },
        pagination: { page, pageSize },
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: conversations,
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

    // Handle specific error types
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

    console.error('Error fetching conversations:', error);
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
    await requirePermission('conversations.create');

    const body = await request.json();
    const validatedData = validateBody(createConversationSchema, body);

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

    // Validate departmentId if provided
    if (validatedData.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: validatedData.departmentId,
          tenantId,
        },
      });

      if (!department) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }
    }

    // Validate assignedUserId if provided
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

    // Initialize waitStartedAt if status is new/open
    const waitStartedAt = (validatedData.status === 'new' || validatedData.status === 'open') 
      ? new Date() 
      : undefined;

    // Resolve channelId automatically if not provided
    let channelId = validatedData.channelId;
    if (!channelId) {
      const activeConnection = await prisma.whatsappConnection.findFirst({
        where: {
          tenantId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      if (activeConnection) {
        channelId = activeConnection.id;
      }
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        contactId: validatedData.contactId,
        departmentId: validatedData.departmentId,
        assignedUserId: validatedData.assignedUserId,
        status: validatedData.status,
        priority: validatedData.priority,
        subject: validatedData.subject || 'Atendimento iniciado por operador',
        channelId,
        waitStartedAt,
        deletedAt: null,
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'CONVERSATION_CREATED',
      tenantId,
      userId: user.userId,
      entity: 'CONVERSATION',
      entityId: conversation.id,
      requestId,
      metadata: {
        contactId: conversation.contactId,
        subject: conversation.subject,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: conversation,
    }, { status: 201 });

  } catch (error) {
    // Handle validation errors first
    const validationError = handleValidationError(error);
    if (validationError) return validationError;

    // Handle specific error types
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

    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
