import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { AuditService } from '@/server/audit/audit.service';

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ tenantId: string; discountId: string }> }
) {
  const params = await props.params;
  const { tenantId, discountId } = params;
  try {
    const user = await requireAuth();

    // Admin validation
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true }
    });

    if (fullUser?.role?.name !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem remover descontos de inquilino' }, { status: 403 });
    }

    const discount = await prisma.tenantDiscount.update({
      where: { id: discountId },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    await AuditService.log({
      tenantId,
      userId: user.userId,
      action: 'TENANT_DISCOUNT_REMOVED',
      entity: 'tenant_discount',
      entityId: discountId,
      metadata: { reason: discount.reason }
    });

    await AuditService.logSystemEvent({
      tenantId,
      eventType: 'TENANT_DISCOUNT_REMOVED',
      severity: 'info',
      message: `Desconto manual ${discountId} foi removido do inquilino.`,
      metadata: { tenantDiscountId: discountId }
    });

    return NextResponse.json({ success: true, discount });
  } catch (error: any) {
    console.error('Error deleting tenant discount:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
