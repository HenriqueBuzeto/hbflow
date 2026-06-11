import { NextRequest, NextResponse } from 'next/server';
import { flagDebtService } from '@/lib/feature-flags/FlagDebtService';
import { getRequestIdFromHeaders } from '@/lib/request-id/requestId';

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers) || 'unknown';
  
  try {
    const report = await flagDebtService.generateDebtReport();
    return NextResponse.json({ requestId, report });
  } catch (error) {
    return NextResponse.json(
      { requestId, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers) || 'unknown';
  
  try {
    const result = await flagDebtService.cleanupExpiredFlags();
    return NextResponse.json({ requestId, result });
  } catch (error) {
    return NextResponse.json(
      { requestId, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
