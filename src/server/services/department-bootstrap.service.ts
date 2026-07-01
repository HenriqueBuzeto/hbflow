import { prisma } from '@/server/db/prisma';

export class DepartmentBootstrapService {
  /**
   * Idempotently seeds default departments/queues for a tenant
   */
  static async bootstrapDefaultDepartments(tenantId: string): Promise<void> {
    // Por padrão do sistema, não criamos nenhuma fila/departamento inicial automaticamente.
    // O cliente deve cadastrar suas filas manualmente.
    return;
  }
}
