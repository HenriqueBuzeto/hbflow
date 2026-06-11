import { randomUUID } from 'crypto';

/**
 * Extract or generate a request ID from the request
 * Reads x-request-id header, or generates a new UUID-based ID
 */
export function getRequestId(request: Request): string {
  const headerId = request.headers.get('x-request-id');
  if (headerId && headerId.trim()) {
    return headerId.trim();
  }
  return `req_${randomUUID()}`;
}
