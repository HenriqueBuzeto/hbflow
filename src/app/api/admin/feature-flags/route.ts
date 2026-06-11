import { NextRequest, NextResponse } from 'next/server';
import { featureFlagService, FeatureFlagConfig } from '@/lib/feature-flags/FeatureFlagService';
import { getRequestIdFromHeaders } from '@/lib/request-id/requestId';

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers) || 'unknown';
  
  try {
    const flags = await featureFlagService.getAllFeatureFlags();
    return NextResponse.json({ requestId, flags });
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
    const body = await request.json() as FeatureFlagConfig;
    const flag = await featureFlagService.createFeatureFlag(body);
    return NextResponse.json({ requestId, flag });
  } catch (error) {
    return NextResponse.json(
      { requestId, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
