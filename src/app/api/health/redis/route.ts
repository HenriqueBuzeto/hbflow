import { NextResponse } from 'next/server';
import { healthService } from '@/lib/health/HealthService';
import { ServiceHealth } from '@/lib/health/types';

export async function GET() {
  try {
    const health = await healthService.checkRedis();
    
    return NextResponse.json<ServiceHealth>(health, {
      status: health.status === 'unhealthy' ? 503 : 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        name: 'Redis',
        status: 'unhealthy' as const,
        latencyMs: 0,
        lastCheck: new Date().toISOString(),
        errorCount: 0,
        successCount: 0,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
      { status: 503 }
    );
  }
}
