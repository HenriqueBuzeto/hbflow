import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { createMessageSchema, messageIdParamsSchema, conversationIdParamsSchema } from '@/server/validators/message.validator';
import { validateParams, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('messages.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    const { id: conversationId } = await params;

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Verify conversation belongs to tenant and is not deleted
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
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

    // Get total count
    const total = await prisma.message.count({
      where: {
        conversationId,
        tenantId,
        deletedAt: null,
      },
    });

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
      skip,
      take: pageSize,
    });

    // Log audit event
    await AuditService.log({
      action: 'MESSAGE_LIST_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'MESSAGE',
      requestId,
      metadata: { conversationId, pagination: { page, pageSize } },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: messages,
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

    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const validatedParams = validateParams(conversationIdParamsSchema, await params);
    const { id: conversationId } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('messages.create');

    const body = await request.json();
    const validatedData = validateBody(createMessageSchema, body);

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Verify conversation belongs to tenant and is not deleted
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
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

    // Override conversationId from params
    const messageData = {
      ...validatedData,
      conversationId,
      tenantId,
      deletedAt: null,
    };

    // Create message
    const message = await prisma.message.create({
      data: messageData,
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'MESSAGE_CREATED',
      tenantId,
      userId: user.userId,
      entity: 'MESSAGE',
      entityId: message.id,
      requestId,
      metadata: { conversationId, type: message.type },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: message,
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

    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
