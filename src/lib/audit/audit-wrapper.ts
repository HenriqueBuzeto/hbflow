import { headers } from 'next/headers';
import { AuditService, AuditLogData } from '@/server/audit/audit.service';
import { getRequestIdFromHeaders } from '../request-id/requestId';

export async function auditLog(data: Omit<AuditLogData, 'requestId'>): Promise<void> {
  let requestId: string | undefined;
  
  try {
    const headersList = await headers();
    requestId = getRequestIdFromHeaders(headersList);
  } catch {
    // Headers might not be available in all contexts
  }

  return AuditService.log({
    ...data,
    requestId,
  });
}

export async function auditLogWithRequest(
  data: AuditLogData,
  requestId?: string
): Promise<void> {
  return AuditService.log(data);
}
