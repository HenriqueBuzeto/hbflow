import { prisma } from './prisma';

export class TenantContext {
  private static currentTenantId: string | null = null;

  static setTenant(tenantId: string): void {
    this.currentTenantId = tenantId;
  }

  static getTenant(): string | null {
    return this.currentTenantId;
  }

  static clearTenant(): void {
    this.currentTenantId = null;
  }

  static async withTenant<T>(tenantId: string, callback: () => Promise<T>): Promise<T> {
    const previousTenant = this.currentTenantId;
    this.currentTenantId = tenantId;
    try {
      return await callback();
    } finally {
      this.currentTenantId = previousTenant;
    }
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
