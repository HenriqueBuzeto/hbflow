import { NextResponse } from 'next/server';
import { healthService } from '@/lib/health/HealthService';

export async function GET() {
  try {
    const [openai, groq] = await Promise.all([
      healthService.checkOpenAI(),
      healthService.checkGroq(),
    ]);
    
    return NextResponse.json({
      openai,
      groq,
      timestamp: new Date().toISOString(),
    }, {
      status: (openai.status === 'unhealthy' || groq.status === 'unhealthy') ? 503 : 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        openai: { name: 'OpenAI', status: 'unhealthy', latencyMs: 0, lastCheck: new Date().toISOString(), errorCount: 0, successCount: 0 },
        groq: { name: 'Groq', status: 'unhealthy', latencyMs: 0, lastCheck: new Date().toISOString(), errorCount: 0, successCount: 0 },
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
