import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Basic protection using CRON_SECRET if configured
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date();

    // 1. Fetch conversations that have exceeded their SLA limits and are still active
    const breachedConversations = await prisma.conversation.findMany({
      where: {
        status: { in: ['new', 'open', 'pending'] },
        OR: [
          {
            slaFirstResponseDueAt: {
              lt: now
            }
          },
          {
            slaResolutionDueAt: {
              lt: now
            }
          }
        ],
        deletedAt: null


      },
      include: {
        contact: true,
        tenant: true
      }
    });

    let notificationsCreated = 0;
    const details: any[] = [];

    // 2. Iterate through each breached conversation to alert supervisors
    for (const c of breachedConversations) {
      // Check if we've already triggered a breach event alert for this conversation
      const alreadyTriggered = await prisma.conversationSlaEvent.findFirst({
        where: {
          conversationId: c.id,
          eventType: 'breached'
        }
      });

      if (alreadyTriggered) continue;

      // Log the event to database to prevent duplicate notifications
      await prisma.conversationSlaEvent.create({
        data: {
          conversationId: c.id,
          eventType: 'breached',
          triggeredAt: now
        }
      });

      // Find all supervisors, managers, or admins belonging to this tenant
      const supervisors = await prisma.user.findMany({
        where: {
          tenantId: c.tenantId,
          isActive: true,
          deletedAt: null,
          role: {
            name: {
              in: ['Supervisor', 'Gestor', 'Admin']
            }
          }
        }
      });

      // Fallback: If no supervisors with formal role names are found, get all active tenant users
      const alertTargets = supervisors.length > 0 
        ? supervisors 
        : await prisma.user.findMany({
            where: { tenantId: c.tenantId, isActive: true, deletedAt: null }
          });

      // Send a notification record for each supervisor
      for (const supervisor of alertTargets) {
        await prisma.notification.create({
          data: {
            tenantId: c.tenantId,
            userId: supervisor.id,
            title: '🚨 SLA Estourado!',
            message: `O atendimento de ${c.contact.name} excedeu o limite de SLA departamental.`,
            type: 'sla'
          }
        });
        notificationsCreated++;
      }

      details.push({
        conversationId: c.id,
        contact: c.contact.name,
        slaLimitAt: c.slaFirstResponseDueAt || c.slaResolutionDueAt || null,
        notifiedUsersCount: alertTargets.length
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: breachedConversations.length,
      alertsCreated: notificationsCreated,
      breaches: details
    });
  } catch (error: any) {
    console.error('Error executing SLA cron monitor:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
