import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FeatureFlagConfig {
  key: string;
  name: string;
  description?: string;
  category: 'general' | 'security' | 'performance' | 'ui' | 'api' | 'ai' | 'whatsapp' | 'billing';
  isEnabled: boolean;
  rolloutPercentage: number;
  owner?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export class FeatureFlagService {
  async createFeatureFlag(config: FeatureFlagConfig) {
    return prisma.featureFlag.create({
      data: {
        key: config.key,
        name: config.name,
        description: config.description,
        category: config.category,
        isEnabled: config.isEnabled,
        rolloutPercentage: config.rolloutPercentage,
        owner: config.owner,
        expiresAt: config.expiresAt,
        metadataJson: JSON.stringify(config.metadata || {}),
      },
    });
  }

  async getFeatureFlag(key: string) {
    return prisma.featureFlag.findUnique({
      where: { key },
    });
  }

  async getAllFeatureFlags() {
    return prisma.featureFlag.findMany({
      where: { deletedAt: null },
      orderBy: { category: 'asc' },
    });
  }

  async isFeatureEnabled(key: string, tenantId?: string): Promise<boolean> {
    // Check tenant-specific override first
    if (tenantId) {
      const tenantOverride = await prisma.tenantFeatureFlag.findUnique({
        where: {
          tenantId_featureFlagId: {
            tenantId,
            featureFlagId: key,
          },
        },
      });

      if (tenantOverride) {
        return tenantOverride.isEnabled;
      }
    }

    // Check global feature flag
    const featureFlag = await this.getFeatureFlag(key);
    if (!featureFlag) {
      return false;
    }

    // Check if expired
    if (featureFlag.expiresAt && featureFlag.expiresAt < new Date()) {
      return false;
    }

    // Check if globally enabled
    if (!featureFlag.isEnabled) {
      return false;
    }

    // For gradual rollout, use hash-based deterministic check
    if (featureFlag.rolloutPercentage < 100) {
      const hash = this.hashString(`${tenantId || 'global'}-${key}`);
      const percentage = hash % 100;
      return percentage < featureFlag.rolloutPercentage;
    }

    return true;
  }

  async setTenantOverride(tenantId: string, featureFlagKey: string, isEnabled: boolean, userId: string) {
    return prisma.tenantFeatureFlag.upsert({
      where: {
        tenantId_featureFlagId: {
          tenantId,
          featureFlagId: featureFlagKey,
        },
      },
      create: {
        tenantId,
        featureFlagId: featureFlagKey,
        isEnabled,
        overriddenBy: userId,
      },
      update: {
        isEnabled,
        overriddenBy: userId,
        overriddenAt: new Date(),
      },
    });
  }

  async updateFeatureFlag(key: string, updates: Partial<FeatureFlagConfig>) {
    return prisma.featureFlag.update({
      where: { key },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.category && { category: updates.category }),
        ...(updates.isEnabled !== undefined && { isEnabled: updates.isEnabled }),
        ...(updates.rolloutPercentage !== undefined && { rolloutPercentage: updates.rolloutPercentage }),
        ...(updates.owner && { owner: updates.owner }),
        ...(updates.expiresAt !== undefined && { expiresAt: updates.expiresAt }),
        ...(updates.metadata && { metadataJson: JSON.stringify(updates.metadata) }),
      },
    });
  }

  async deleteFeatureFlag(key: string) {
    return prisma.featureFlag.update({
      where: { key },
      data: { deletedAt: new Date() },
    });
  }

  async getFeatureFlagsByCategory(category: string) {
    return prisma.featureFlag.findMany({
      where: {
        category,
        deletedAt: null,
      },
    });
  }

  async getExpiredFeatureFlags() {
    return prisma.featureFlag.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isEnabled: true,
        deletedAt: null,
      },
    });
  }

  async getExpiredFlags() {
    return this.getExpiredFeatureFlags();
  }

  async disableExpiredFlags() {
    const expiredFlags = await this.getExpiredFeatureFlags();
    for (const flag of expiredFlags) {
      await this.updateFeatureFlag(flag.key, { isEnabled: false });
    }
    return expiredFlags.length;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const featureFlagService = new FeatureFlagService();
