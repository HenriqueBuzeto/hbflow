import { NextResponse } from 'next/server';
import { healthAlertService } from '@/lib/health/HealthAlertService';
import { HealthAlert } from '@/lib/health/types';

export async function GET() {
  try {
    const alerts = await healthAlertService.checkAlerts();
    const summary = healthAlertService.getAlertSummary();
    
    return NextResponse.json({
      alerts,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        alerts: [],
        summary: {
          total: 0,
          active: 0,
          resolved: 0,
          bySeverity: { critical: 0, warning: 0 },
          byType: {
            operational_score: 0,
            db_latency: 0,
            redis_offline: 0,
            queue_backlog: 0,
            ai_failure: 0,
          },
        },
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
