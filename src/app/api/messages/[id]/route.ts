import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { updateMessageSchema, messageIdParamsSchema } from '@/server/validators/message.validator';
import { validateParams, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validatedParams = validateParams(messageIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('messages.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find message by id + tenantId + deletedAt null
    const message = await prisma.message.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        conversation: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Log audit event
    await AuditService.log({
      action: 'MESSAGE_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'MESSAGE',
      entityId: id,
      requestId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: message,
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

    console.error('Error fetching message:', error);
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
    const validatedParams = validateParams(messageIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('messages.update');

    const body = await request.json();
    const validatedData = validateBody(updateMessageSchema, body);

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find message by id + tenantId + deletedAt null
    const existingMessage = await prisma.message.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Track changed fields for audit log
    const changedFields: Record<string, { from: any; to: any }> = {};

    if (validatedData.body && validatedData.body !== existingMessage.body) {
      changedFields.body = { from: existingMessage.body, to: validatedData.body };
    }
    if (validatedData.type && validatedData.type !== existingMessage.type) {
      changedFields.type = { from: existingMessage.type, to: validatedData.type };
    }
    if (validatedData.isRead !== undefined && validatedData.isRead !== existingMessage.isRead) {
      changedFields.isRead = { from: existingMessage.isRead, to: validatedData.isRead };
    }
    if (validatedData.status && validatedData.status !== existingMessage.status) {
      changedFields.status = { from: existingMessage.status, to: validatedData.status };
    }

    // Update message
    const message = await prisma.message.update({
      where: { id },
      data: {
        ...(validatedData.body && { body: validatedData.body }),
        ...(validatedData.type && { type: validatedData.type }),
        ...(validatedData.mediaUrl !== undefined && { mediaUrl: validatedData.mediaUrl || null }),
        ...(validatedData.mimeType && { mimeType: validatedData.mimeType }),
        ...(validatedData.fileName && { fileName: validatedData.fileName }),
        ...(validatedData.fileSize && { fileSize: validatedData.fileSize }),
        ...(validatedData.latitude !== undefined && { latitude: validatedData.latitude }),
        ...(validatedData.longitude !== undefined && { longitude: validatedData.longitude }),
        ...(validatedData.signatureUsed && { signatureUsed: validatedData.signatureUsed }),
        ...(validatedData.isRead !== undefined && { isRead: validatedData.isRead }),
        ...(validatedData.channelMessageId && { channelMessageId: validatedData.channelMessageId }),
        ...(validatedData.provider && { provider: validatedData.provider }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.errorText !== undefined && { errorText: validatedData.errorText }),
        ...(validatedData.metadataJson && { metadataJson: validatedData.metadataJson }),
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'MESSAGE_UPDATED',
      tenantId,
      userId: user.userId,
      entity: 'MESSAGE',
      entityId: id,
      requestId,
      metadata: { changedFields },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: message,
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

    console.error('Error updating message:', error);
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
    const validatedParams = validateParams(messageIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('messages.delete');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find message by id + tenantId + deletedAt null
    const existingMessage = await prisma.message.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Perform soft delete
    const deletedAt = new Date();
    const message = await prisma.message.update({
      where: { id },
      data: {
        deletedAt,
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'MESSAGE_DELETED',
      tenantId,
      userId: user.userId,
      entity: 'MESSAGE',
      entityId: id,
      requestId,
      metadata: { deletedAt: deletedAt.toISOString() },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: message.id,
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

    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
