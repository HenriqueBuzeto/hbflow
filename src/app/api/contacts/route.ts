import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';
import { getTenantId } from '@/server/db/tenant-context';
import { createContactSchema, listContactsQuerySchema } from '@/server/validators/contact.validator';
import { validateQuery, validateBody, handleValidationError } from '@/server/validators/validation.helper';
import { AuditService } from '@/server/audit/audit.service';
import { getRequestId } from '@/server/audit/request-id';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('contacts.read');

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const query = validateQuery(listContactsQuerySchema, searchParams);

    const { page, pageSize, search, status, temperature, source, assignedUserId, tag, sortBy, sortOrder } = query;

    // Validate sort field (already validated by schema, but use default if not provided)
    const allowedSortFields = ['name', 'createdAt', 'updatedAt', 'lastInteractionAt', 'temperature'];
    const validSortBy = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Build where clause
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    // Search filter (name, phone, email, document)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { document: { contains: search } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Temperature filter
    if (temperature) {
      where.temperature = temperature;
    }

    // Source filter
    if (source) {
      where.source = source;
    }

    // Assigned user filter
    if (assignedUserId) {
      where.responsibleUserId = assignedUserId;
    }

    // Tag filter
    if (tag) {
      where.contactTags = {
        some: {
          tag: {
            name: { contains: tag, mode: 'insensitive' },
          },
        },
      };
    }

    // Get total count
    const total = await prisma.contact.count({ where });

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;

    // Fetch contacts
    const contacts = await prisma.contact.findMany({
      where,
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
      orderBy: {
        [validSortBy]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    // Log audit event
    await AuditService.log({
      action: 'CONTACT_LIST_VIEWED',
      tenantId,
      userId: user.userId,
      entity: 'CONTACT',
      requestId,
      metadata: {
        filters: { search, status, temperature, source, assignedUserId, tag },
        pagination: { page, pageSize },
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: contacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          status: contact.status,
          temperature: contact.temperature,
          source: contact.source,
          tags: contact.contactTags.map(ct => ct.tag),
          assignedUser: contact.responsibleUser,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
          lastInteractionAt: contact.lastInteractionAt,
        })),
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

    console.error('Error fetching contacts:', error);
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
    await requirePermission('contacts.create');

    const body = await request.json();
    const validatedData = validateBody(createContactSchema, body);

    // Get request ID from header or generate new
    const requestId = getRequestId(request);

    // Normalize phone (simple version - full normalization will be in Phase 4)
    const normalizedPhone = validatedData.phone.replace(/\D/g, '');

    // Create contact with deletedAt: null for soft delete compatibility
    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name: validatedData.name,
        phone: validatedData.phone,
        normalizedPhone,
        email: validatedData.email || null,
        responsibleUserId: validatedData.responsibleUserId || null,
        deletedAt: null,
      },
    });

    // Handle tags if provided
    if (validatedData.tags && validatedData.tags.length > 0) {
      for (const tagName of validatedData.tags) {
        // Find or create tag
        let tag = await prisma.tag.findFirst({
          where: { name: tagName },
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: tagName },
          });
        }

        // Create contact-tag relationship
        await prisma.contactTag.create({
          data: {
            contactId: contact.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Handle notes if provided
    if (validatedData.notes) {
      await prisma.contactNote.create({
        data: {
          contactId: contact.id,
          userId: user.userId,
          content: validatedData.notes,
        },
      });
    }

    // Log audit event
    await AuditService.log({
      action: 'CONTACT_CREATED',
      tenantId,
      userId: user.userId,
      entity: 'CONTACT',
      entityId: contact.id,
      requestId,
      metadata: {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: contact,
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

    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
