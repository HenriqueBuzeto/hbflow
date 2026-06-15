import { AsyncLocalStorage } from 'async_hooks';

// Armazenamento assíncrono isolado por ciclo de vida da requisição (Thread-Local Storage no Node.js)
const tenantLocalStorage = new AsyncLocalStorage<string>();

export class TenantContext {
  // Mantido para compatibilidade estática básica (ex: scripts stand-alone), mas o local storage tem precedência
  private static fallbackTenantId: string | null = null;

  static setTenant(tenantId: string): void {
    this.fallbackTenantId = tenantId;
  }

  static getTenant(): string | null {
    const activeStore = tenantLocalStorage.getStore();
    if (activeStore) {
      return activeStore;
    }
    return this.fallbackTenantId;
  }

  static clearTenant(): void {
    this.fallbackTenantId = null;
  }

  /**
   * Executa uma função assíncrona injetando o tenantId no escopo isolado da requisição atual.
   */
  static async withTenant<T>(tenantId: string, callback: () => Promise<T>): Promise<T> {
    return tenantLocalStorage.run(tenantId, callback);
  }
}

export function getTenantId(): string {
  const tenantId = TenantContext.getTenant();
  if (!tenantId) {
    throw new Error('Tenant context not set');
  }
  return tenantId;
}

export function setTenantId(tenantId: string): void {
  TenantContext.setTenant(tenantId);
}
