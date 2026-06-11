import { NextResponse } from 'next/server';
import { healthService } from '@/lib/health/HealthService';
import { HealthCheckResponse } from '@/lib/health/types';

export async function GET() {
  try {
    const health = await healthService.checkOverall();
    
    return NextResponse.json<HealthCheckResponse>(health, {
      status: health.status === 'unhealthy' ? 503 : 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        latencyMs: 0,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
      { status: 503 }
    );
  }
}
