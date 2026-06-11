import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { updateTaskSchema, taskIdParamsSchema } from '@/server/validators/task.validator';
import { validateParams, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validatedParams = validateParams(taskIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('tasks.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find task by id + tenantId + deletedAt null
    const task = await prisma.task.findFirst({
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
        comments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Log audit event
    await AuditService.log({
      action: 'TASK_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'TASK',
      entityId: id,
      requestId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: task,
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

    console.error('Error fetching task:', error);
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
    const validatedParams = validateParams(taskIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('tasks.update');

    const body = await request.json();
    const validatedData = validateBody(updateTaskSchema, body);

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find task by id + tenantId + deletedAt null
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
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

      if (validatedData.contactId !== existingTask.contactId) {
        changedFields.contactId = { from: existingTask.contactId, to: validatedData.contactId };
      }
    }

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

      if (validatedData.dealId !== existingTask.dealId) {
        changedFields.dealId = { from: existingTask.dealId, to: validatedData.dealId };
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

      if (validatedData.conversationId !== existingTask.conversationId) {
        changedFields.conversationId = { from: existingTask.conversationId, to: validatedData.conversationId };
      }
    }

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

      if (validatedData.assignedUserId !== existingTask.assignedUserId) {
        changedFields.assignedUserId = { from: existingTask.assignedUserId, to: validatedData.assignedUserId };
      }
    }

    // Track other field changes
    if (validatedData.title && validatedData.title !== existingTask.title) {
      changedFields.title = { from: existingTask.title, to: validatedData.title };
    }
    if (validatedData.dueAt && validatedData.dueAt !== existingTask.dueAt?.toISOString()) {
      changedFields.dueAt = { from: existingTask.dueAt, to: validatedData.dueAt };
    }
    if (validatedData.priority && validatedData.priority !== existingTask.priority) {
      changedFields.priority = { from: existingTask.priority, to: validatedData.priority };
    }
    if (validatedData.type && validatedData.type !== existingTask.type) {
      changedFields.type = { from: existingTask.type, to: validatedData.type };
    }
    if (validatedData.notes !== undefined && validatedData.notes !== existingTask.notes) {
      changedFields.notes = { from: existingTask.notes, to: validatedData.notes };
    }

    // Handle status changes
    let completedAt = existingTask.completedAt;

    if (validatedData.status === 'completed' && !existingTask.completedAt) {
      completedAt = new Date();
      changedFields.completedAt = { from: null, to: completedAt };
    } else if (validatedData.status && validatedData.status !== 'completed' && existingTask.completedAt) {
      completedAt = null;
      changedFields.completedAt = { from: existingTask.completedAt, to: null };
    }

    if (validatedData.status && validatedData.status !== existingTask.status) {
      changedFields.status = { from: existingTask.status, to: validatedData.status };
    }

    // Update task
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.contactId && { contactId: validatedData.contactId }),
        ...(validatedData.dealId && { dealId: validatedData.dealId }),
        ...(validatedData.conversationId && { conversationId: validatedData.conversationId }),
        ...(validatedData.assignedUserId && { assignedUserId: validatedData.assignedUserId }),
        ...(validatedData.dueAt && { dueAt: new Date(validatedData.dueAt) }),
        ...(validatedData.priority && { priority: validatedData.priority }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.type && { type: validatedData.type }),
        ...(completedAt !== existingTask.completedAt && { completedAt }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'TASK_UPDATED',
      tenantId,
      userId: user.userId,
      entity: 'TASK',
      entityId: id,
      requestId,
      metadata: { changedFields },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: task,
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

    console.error('Error updating task:', error);
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
    const validatedParams = validateParams(taskIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('tasks.delete');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find task by id + tenantId + deletedAt null
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Perform soft delete
    const deletedAt = new Date();
    const task = await prisma.task.update({
      where: { id },
      data: {
        deletedAt,
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'TASK_DELETED',
      tenantId,
      userId: user.userId,
      entity: 'TASK',
      entityId: id,
      requestId,
      metadata: { deletedAt: deletedAt.toISOString() },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
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

    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
