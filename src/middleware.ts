import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateRequestId, getRequestIdFromHeaders, setRequestIdInHeaders, REQUEST_ID_HEADER } from './lib/request-id/requestId';

export function middleware(request: NextRequest) {
  // Get or generate request ID
  const requestId = getRequestIdFromHeaders(request.headers) || generateRequestId();
  
  // Clone request to add request ID to headers
  const requestHeaders = new Headers(request.headers);
  setRequestIdInHeaders(requestHeaders, requestId);
  
  // Create response with request ID header
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Add request ID to response headers
  response.headers.set(REQUEST_ID_HEADER, requestId);
  
  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all pages except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
