const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_CONTEXT = 'request-id';

export function generateRequestId(): string {
  // Simple UUID-like implementation that works in Edge Runtime
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getRequestIdFromHeaders(headers: Headers): string | undefined {
  const value = headers.get(REQUEST_ID_HEADER);
  return value || undefined;
}

export function setRequestIdInHeaders(headers: Headers, requestId: string): void {
  headers.set(REQUEST_ID_HEADER, requestId);
}

export { REQUEST_ID_HEADER, REQUEST_ID_CONTEXT };
