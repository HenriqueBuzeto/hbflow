import { NextResponse } from 'next/server';
import { operationalScoreEngine } from '@/lib/health/OperationalScoreEngine';
import { OperationalScore } from '@/lib/health/types';

export async function GET() {
  try {
    const score = await operationalScoreEngine.calculateScore();
    
    return NextResponse.json<OperationalScore>(score, {
      status: score.overall < 80 ? 503 : 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        overall: 0,
        components: {
          availability: 0,
          errorRate: 0,
          queueHealth: 0,
          dbLatency: 0,
          aiSuccess: 0,
          whatsappDelivery: 0,
        },
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
