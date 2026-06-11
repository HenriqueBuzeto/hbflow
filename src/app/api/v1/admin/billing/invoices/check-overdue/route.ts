import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { InvoiceService } from '@/server/services/billing/invoice.service';

export async function POST(request: NextRequest) {
  try {
    let isAuthorized = false;

    // 1. Cron secret token verification
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'hbflow_cron_secret_key_123';
    if (authHeader && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    }

    // 2. Administrative session verification (if cron header is not supplied)
    if (!isAuthorized) {
      try {
        const user = await requireAuth();
        const fullUser = await prisma.user.findUnique({
          where: { id: user.userId },
          include: { role: true }
        });
        if (fullUser?.role?.name === 'Admin') {
          isAuthorized = true;
        }
      } catch (e) {
        // Suppress session check errors to fall through
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 401 });
    }

    const processedCount = await InvoiceService.checkOverdueInvoices();

    return NextResponse.json({ success: true, processedCount }, { status: 200 });
  } catch (error: any) {
    console.error('Error running check-overdue billing cron:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
