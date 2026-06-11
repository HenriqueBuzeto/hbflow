import { NextRequest, NextResponse } from 'next/server';
import { healthAlertService } from '@/lib/health/HealthAlertService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    healthAlertService.resolveAlert(id);
    
    return NextResponse.json({
      success: true,
      message: `Alert ${id} resolved`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to resolve alert',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
