import { TenantContext, setTenantId, getTenantId } from '../db/tenant-context';
import { requireAuth, AuthUser } from './auth.middleware';

/**
 * Define o contexto do tenant para a requisição atual
 */
export function setTenantContext(tenantId: string): void {
  setTenantId(tenantId);
}

/**
 * Obtém o tenantId do contexto atual
 */
export function getTenantIdFromContext(): string | null {
  return getTenantId();
}

/**
 * Verifica se há um tenant definido no contexto
 */
export function hasTenantContext(): boolean {
  return getTenantId() !== null;
}

/**
 * Garante que o tenant esteja definido no contexto.
 * Usa o tenantId do usuário autenticado.
 */
export async function requireTenant(): Promise<string> {
  const user = await requireAuth();
  
  if (!user.tenantId) {
    throw new Error('USER_HAS_NO_TENANT');
  }

  setTenantContext(user.tenantId);

  return user.tenantId;
}

/**
 * Limpa o contexto do tenant (útil para testes ou cleanup)
 */
export function clearTenantContext(): void {
  TenantContext.clearTenant();
}
