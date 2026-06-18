import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { AuditService } from '@/server/audit/audit.service';

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET || 'super-cron-secret-token';

    if (secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Query subscriptions in trialing state where trialEndsAt < now()
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        status: 'trialing',
        trialEndsAt: { lt: now },
        deletedAt: null
      },
      include: {
        tenant: true
      }
    });

    const updated = [];

    for (const sub of expiredTrials) {
      // Update subscription status to past_due
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: 'past_due' }
        });

        // Update tenant to reflect blocked state and past_due status
        await tx.tenant.update({
          where: { id: sub.tenantId },
          data: {
            isBlocked: true,
            subscriptionStatus: 'past_due'
          }
        });
      });

      // Audit logs
      await AuditService.log({
        tenantId: sub.tenantId,
        action: 'subscription.trial_expired',
        entity: 'subscription',
        entityId: sub.id,
        metadata: {
          trialEndsAt: sub.trialEndsAt,
          expiredAt: now.toISOString()
        }
      });

      await AuditService.logSystemEvent({
        tenantId: sub.tenantId,
        eventType: 'TRIAL_EXPIRED',
        severity: 'warning',
        message: `O teste gratuito do tenant expirou. Acesso bloqueado.`,
        metadata: { subscriptionId: sub.id }
      });

      updated.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        tenantName: sub.tenant.name
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: expiredTrials.length,
      updated
    });
  } catch (error: any) {
    console.error('Error running expire-trials cron:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
