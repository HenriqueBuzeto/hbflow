import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';

export async function GET(request: NextRequest) {
  try {
    // 1. Validate permissions
    await requirePermission('billing.manage'); // admin privileges required
    await requireActiveSubscription();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1') || 1;
    const pageSize = parseInt(searchParams.get('pageSize') || '20') || 20;

    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;
    const requestId = searchParams.get('requestId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // 2. Build dynamic where clause for Prisma query
    const where: any = {};

    if (action) {
      where.action = action;
    }
    if (userId) {
      where.userId = userId;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (requestId) {
      where.requestId = {
        contains: requestId,
        mode: 'insensitive'
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Enforce end of day for the end date filter
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // 3. Query logs paginated with total count
    const skip = (page - 1) * pageSize;
    
    const [logs, totalCount] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          tenant: {
            select: { id: true, name: true, slug: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: pageSize
      }),
      prisma.auditLog.count({ where })
    ]);

    // 4. Load metadata list for UI filter dropdowns (Users & Tenants)
    const filtersMeta = await prisma.$transaction([
      prisma.tenant.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' }
      }),
      prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
    ]);

    return NextResponse.json({
      success: true,
      logs,
      totalCount,
      page,
      pageSize,
      tenants: filtersMeta[0],
      users: filtersMeta[1]
    });
  } catch (error: any) {
    console.error('Error fetching admin audit logs:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ success: false, error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
