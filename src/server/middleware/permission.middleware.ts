import { PermissionService } from '../auth/permission.service';
import { requireAuth, AuthUser } from './auth.middleware';

/**
 * Verifica se o usuário tem uma permissão específica.
 * Lança erro se não tiver.
 */
export async function requirePermission(permission: string): Promise<void> {
  const user = await requireAuth();
  
  const hasPermission = await PermissionService.hasPermission(user.userId, permission);
  
  if (!hasPermission) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Verifica se o usuário tem pelo menos uma das permissões listadas.
 * Lança erro se não tiver nenhuma.
 */
export async function requireAnyPermission(...permissions: string[]): Promise<void> {
  const user = await requireAuth();
  
  const hasPermission = await PermissionService.hasAnyPermission(user.userId, permissions);
  
  if (!hasPermission) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Verifica se o usuário tem todas as permissões listadas.
 * Lança erro se não tiver todas.
 */
export async function requireAllPermissions(...permissions: string[]): Promise<void> {
  const user = await requireAuth();
  
  const hasPermission = await PermissionService.hasAllPermissions(user.userId, permissions);
  
  if (!hasPermission) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Verifica se o usuário tem uma permissão específica.
 * Retorna true/false sem lançar erro.
 */
export async function checkPermission(permission: string): Promise<boolean> {
  try {
    const user = await requireAuth();
    return await PermissionService.hasPermission(user.userId, permission);
  } catch (error) {
    return false;
  }
}
