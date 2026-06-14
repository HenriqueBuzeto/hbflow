import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { updateConversationSchema, conversationIdParamsSchema } from '@/server/validators/conversation.validator';
import { validateParams, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validatedParams = validateParams(conversationIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('conversations.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find conversation by id + tenantId + deletedAt null
    const conversation = await prisma.conversation.findFirst({
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
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 30,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get last message
    const lastMessage = conversation.messages[0] || null;

    // Log audit event
    await AuditService.log({
      action: 'CONVERSATION_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'CONVERSATION',
      entityId: id,
      requestId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...conversation,
        lastMessage,
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

    console.error('Error fetching conversation:', error);
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
    const validatedParams = validateParams(conversationIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('conversations.update');

    const body = await request.json();
    const validatedData = validateBody(updateConversationSchema, body);

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find conversation by id + tenantId + deletedAt null
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Track changed fields for audit log
    const changedFields: Record<string, { from: any; to: any }> = {};

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

      if (validatedData.departmentId !== existingConversation.departmentId) {
        changedFields.departmentId = { from: existingConversation.departmentId, to: validatedData.departmentId };
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

      if (validatedData.assignedUserId !== existingConversation.assignedUserId) {
        changedFields.assignedUserId = { from: existingConversation.assignedUserId, to: validatedData.assignedUserId };
      }
    }

    // Track other field changes
    if (validatedData.status && validatedData.status !== existingConversation.status) {
      changedFields.status = { from: existingConversation.status, to: validatedData.status };
    }
    if (validatedData.priority && validatedData.priority !== existingConversation.priority) {
      changedFields.priority = { from: existingConversation.priority, to: validatedData.priority };
    }
    if (validatedData.subject !== undefined && validatedData.subject !== existingConversation.subject) {
      changedFields.subject = { from: existingConversation.subject, to: validatedData.subject };
    }

    // Update conversation with optimistic locking using version field to prevent race conditions
    const conversation = await prisma.$transaction(async (tx) => {
      // Get current conversation with version for optimistic locking
      const currentConversation = await tx.conversation.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
        },
      });

      if (!currentConversation) {
        throw new Error('Conversation not found');
      }

      // Check if this is a claim operation and validate it
      if (validatedData.assignedUserId) {
        if (!currentConversation.assignedUserId) {
          // This is a first-time claim - proceed
          console.log(`Conversation ${id} being claimed by user ${validatedData.assignedUserId}`);
        } else if (currentConversation.assignedUserId !== validatedData.assignedUserId) {
          // This is a reassignment attempt - block it to prevent conflicts
          console.log(`Conversation ${id} already assigned to ${currentConversation.assignedUserId}, claim attempt by ${validatedData.assignedUserId}`);
          throw new Error('CONVERSATION_ALREADY_CLAIMED');
        }
      }

      // Perform the update using optimistic locking with version
      try {
        return await tx.conversation.update({
          where: { 
            id,
            tenantId,
            deletedAt: null,
            version: currentConversation.version, // Optimistic locking - only update if version hasn't changed
          },
          data: {
            ...(validatedData.departmentId && { departmentId: validatedData.departmentId }),
            ...(validatedData.assignedUserId !== undefined && { assignedUserId: validatedData.assignedUserId }),
            ...(validatedData.status && { status: validatedData.status }),
            ...(validatedData.priority && { priority: validatedData.priority }),
            ...(validatedData.subject !== undefined && { subject: validatedData.subject }),
            ...(validatedData.unreadCount !== undefined && { unreadCount: validatedData.unreadCount }),
            version: { increment: 1 }, // Increment version on successful update
          },
        });
      } catch (error: any) {
        // If optimistic locking fails (record not found), it means another transaction updated it first
        if (error.code === 'P2025') {
          throw new Error('CONVERSATION_CONCURRENTLY_MODIFIED');
        }
        throw error;
      }
    });

    // Log audit event
    await AuditService.log({
      action: 'CONVERSATION_UPDATED',
      tenantId,
      userId: user.userId,
      entity: 'CONVERSATION',
      entityId: id,
      requestId,
      metadata: { changedFields },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: conversation,
    });

  } catch (error) {
    console.error('Error updating conversation:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

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

      if (error.message === 'CONVERSATION_ALREADY_CLAIMED') {
        return NextResponse.json(
          { error: 'Conversation already claimed by another user' },
          { status: 409 }
        );
      }

      if (error.message === 'CONVERSATION_CONCURRENTLY_MODIFIED') {
        return NextResponse.json(
          { error: 'Conversation was modified by another user, please try again' },
          { status: 409 }
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
    const validatedParams = validateParams(conversationIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('conversations.delete');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find conversation by id + tenantId + deletedAt null
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Perform soft delete
    const deletedAt = new Date();
    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        deletedAt,
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'CONVERSATION_DELETED',
      tenantId,
      userId: user.userId,
      entity: 'CONVERSATION',
      entityId: id,
      requestId,
      metadata: { deletedAt: deletedAt.toISOString() },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: conversation.id,
        deletedAt: deletedAt.toISOString(),
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

    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
