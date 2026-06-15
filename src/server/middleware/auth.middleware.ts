import { TokenService, TokenPayload } from '../auth/token.service';
import { cookies, headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { REQUEST_ID_HEADER } from '../../lib/request-id/requestId';

export interface AuthUser extends TokenPayload {
  sessionId?: string;
}

/**
 * Extrai e valida o usuário autenticado dos cookies
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    // Track Request ID in Sentry if available in headers
    try {
      const headersList = await headers();
      const requestId = headersList.get(REQUEST_ID_HEADER);
      if (requestId) {
        Sentry.setTag('requestId', requestId);
      }
    } catch (e) {
      // Silence header reading errors
    }

    if (!accessToken) {
      return null;
    }

    const payload = TokenService.verifyToken(accessToken);
    
    if (payload) {
      // Enrich Sentry context with logged user information
      Sentry.setUser({ id: payload.userId, email: payload.email });
      Sentry.setTag('tenantId', payload.tenantId);
      Sentry.setTag('userId', payload.userId);
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado. Lança erro se não estiver.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

/**
 * Extrai o sessionId dos cookies
 */
export async function getSessionId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('sessionId')?.value || null;
  } catch (error) {
    return null;
  }
}
