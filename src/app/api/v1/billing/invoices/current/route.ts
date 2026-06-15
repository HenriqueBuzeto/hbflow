import { NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { prisma } from '@/server/db/prisma';

export async function GET() {
  try {
    const tenantId = await requireTenant();

    // Busca fatura aberta ou atrasada
    let invoice = await prisma.invoice.findFirst({
      where: {
        tenantId,
        status: { in: ['open', 'overdue'] },
        deletedAt: null
      },
      include: {
        subscription: {
          include: { plan: true }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        pixCharges: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Se a fatura aberta/atrasada tiver um preço antigo que mudou, atualiza no banco
    if (invoice && invoice.subscription?.plan) {
      const correctPrice = invoice.subscription.plan.priceCents;
      if (invoice.subtotalCents !== correctPrice) {
        const discountCents = invoice.discountCents;
        const newTotal = Math.max(0, correctPrice - discountCents);
        invoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            subtotalCents: correctPrice,
            totalCents: newTotal
          },
          include: {
            subscription: {
              include: { plan: true }
            },
            payments: {
              orderBy: { createdAt: 'desc' }
            },
            pixCharges: {
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      }
    }

    // Se não tiver nenhuma aberta/atrasada, pega a última paga/geral
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: { tenantId, deletedAt: null },
        include: {
          subscription: {
            include: { plan: true }
          },
          payments: {
            orderBy: { createdAt: 'desc' }
          },
          pixCharges: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Error fetching current invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
