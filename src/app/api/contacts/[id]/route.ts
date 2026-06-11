import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { updateContactSchema, contactIdParamsSchema } from '@/server/validators/contact.validator';
import { validateParams, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validatedParams = validateParams(contactIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('contacts.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find contact by id + tenantId + deletedAt null
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        contactTags: {
          include: {
            tag: true,
          },
        },
        responsibleUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Get last conversation
    const lastConversation = await prisma.conversation.findFirst({
      where: {
        contactId: id,
        tenantId,
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
      take: 1,
      select: {
        id: true,
        status: true,
        lastMessageAt: true,
        subject: true,
      },
    });

    // Get last 10 timeline events
    const timelineEvents = await prisma.contactTimelineEvent.findMany({
      where: {
        contactId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Log audit event
    await AuditService.log({
      action: 'CONTACT_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'CONTACT',
      entityId: id,
      requestId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        tags: contact.contactTags.map(ct => ct.tag),
        assignedUser: contact.responsibleUser,
        timeline: timelineEvents,
        lastConversation,
        status: contact.status,
        temperature: contact.temperature,
        source: contact.source,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
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

    console.error('Error fetching contact:', error);
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
    const validatedParams = validateParams(contactIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('contacts.update');

    const body = await request.json();
    const validatedData = validateBody(updateContactSchema, body);

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find contact by id + tenantId + deletedAt null
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Track changed fields for audit log
    const changedFields: Record<string, { from: any; to: any }> = {};

    // Normalize phone if provided
    let normalizedPhone = existingContact.normalizedPhone;
    if (validatedData.phone) {
      normalizedPhone = validatedData.phone.replace(/\D/g, '');
      if (normalizedPhone !== existingContact.normalizedPhone) {
        changedFields.phone = { from: existingContact.phone, to: validatedData.phone };
        changedFields.normalizedPhone = { from: existingContact.normalizedPhone, to: normalizedPhone };
      }
    }

    // Track other field changes
    if (validatedData.name && validatedData.name !== existingContact.name) {
      changedFields.name = { from: existingContact.name, to: validatedData.name };
    }
    if (validatedData.email !== undefined && validatedData.email !== existingContact.email) {
      changedFields.email = { from: existingContact.email, to: validatedData.email || null };
    }
    if (validatedData.assignedUserId !== undefined && validatedData.assignedUserId !== existingContact.responsibleUserId) {
      changedFields.assignedUserId = { from: existingContact.responsibleUserId, to: validatedData.assignedUserId || null };
    }
    if (validatedData.status && validatedData.status !== existingContact.status) {
      changedFields.status = { from: existingContact.status, to: validatedData.status };
    }
    if (validatedData.temperature && validatedData.temperature !== existingContact.temperature) {
      changedFields.temperature = { from: existingContact.temperature, to: validatedData.temperature };
    }
    if (validatedData.source && validatedData.source !== existingContact.source) {
      changedFields.source = { from: existingContact.source, to: validatedData.source };
    }

    // Update contact
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.phone && { 
          phone: validatedData.phone,
          normalizedPhone,
        }),
        ...(validatedData.email !== undefined && { email: validatedData.email || null }),
        ...(validatedData.assignedUserId !== undefined && { responsibleUserId: validatedData.assignedUserId || null }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.temperature && { temperature: validatedData.temperature }),
        ...(validatedData.source && { source: validatedData.source }),
      },
    });

    // Handle tags if provided
    if (validatedData.tags !== undefined) {
      // Remove existing tags
      await prisma.contactTag.deleteMany({
        where: { contactId: id },
      });

      // Add new tags
      for (const tagName of validatedData.tags) {
        let tag = await prisma.tag.findFirst({
          where: { name: tagName },
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: tagName },
          });
        }

        await prisma.contactTag.create({
          data: {
            contactId: id,
            tagId: tag.id,
          },
        });
      }

      changedFields.tags = { from: 'existing', to: validatedData.tags };
    }

    // Handle notes if provided
    if (validatedData.notes !== undefined) {
      // Find existing note
      const existingNote = await prisma.contactNote.findFirst({
        where: {
          contactId: id,
          userId: user.userId,
        },
      });

      if (existingNote) {
        await prisma.contactNote.update({
          where: { id: existingNote.id },
          data: { content: validatedData.notes },
        });
      } else if (validatedData.notes) {
        await prisma.contactNote.create({
          data: {
            contactId: id,
            userId: user.userId,
            content: validatedData.notes,
          },
        });
      }

      changedFields.notes = { from: existingNote?.content || null, to: validatedData.notes };
    }

    // Log audit event
    await AuditService.log({
      action: 'CONTACT_UPDATED',
      tenantId,
      userId: user.userId,
      entity: 'CONTACT',
      entityId: id,
      requestId,
      metadata: { changedFields },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: contact,
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

    console.error('Error updating contact:', error);
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
    const validatedParams = validateParams(contactIdParamsSchema, await params);
    const { id } = validatedParams;
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('contacts.delete');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Find contact by id + tenantId + deletedAt null
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Perform soft delete
    const deletedAt = new Date();
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        deletedAt,
      },
    });

    // Log audit event
    await AuditService.log({
      action: 'CONTACT_DELETED',
      tenantId,
      userId: user.userId,
      entity: 'CONTACT',
      entityId: id,
      requestId,
      metadata: { deletedAt: deletedAt.toISOString() },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: contact.id,
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

    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
