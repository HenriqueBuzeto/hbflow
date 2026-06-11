import { TokenService, TokenPayload } from '../auth/token.service';
import { cookies } from 'next/headers';

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

    if (!accessToken) {
      return null;
    }

    const payload = TokenService.verifyToken(accessToken);
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
