import { PrismaClient } from '@prisma/client';
import { featureFlagService } from './FeatureFlagService';

const prisma = new PrismaClient();

export interface FlagDebtReport {
  totalFlags: number;
  enabledFlags: number;
  disabledFlags: number;
  expiredFlags: number;
  flagsWithoutOwner: number;
  flagsWithoutExpiration: number;
  flagsWithRollout: number;
  flagsByCategory: Record<string, number>;
  debtScore: number; // 0-100, higher is worse
  recommendations: string[];
}

export class FlagDebtService {
  /**
   * Generate a comprehensive flag debt report
   * This helps prevent accumulation of unused or poorly managed feature flags
   */
  async generateDebtReport(): Promise<FlagDebtReport> {
    const allFlags = await featureFlagService.getAllFeatureFlags();
    const expiredFlags = await featureFlagService.getExpiredFlags();
    
    const flagsWithoutOwner = allFlags.filter(f => !f.owner).length;
    const flagsWithoutExpiration = allFlags.filter(f => !f.expiresAt).length;
    const flagsWithRollout = allFlags.filter(f => f.rolloutPercentage > 0 && f.rolloutPercentage < 100).length;
    
    const flagsByCategory: Record<string, number> = {};
    allFlags.forEach(flag => {
      flagsByCategory[flag.category] = (flagsByCategory[flag.category] || 0) + 1;
    });
    
    const enabledFlags = allFlags.filter(f => f.isEnabled).length;
    const disabledFlags = allFlags.filter(f => !f.isEnabled).length;
    
    // Calculate debt score (0-100, higher is worse)
    const debtScore = this.calculateDebtScore({
      totalFlags: allFlags.length,
      expiredFlags: expiredFlags.length,
      flagsWithoutOwner,
      flagsWithoutExpiration,
      flagsWithRollout,
    });
    
    const recommendations = this.generateRecommendations({
      totalFlags: allFlags.length,
      expiredFlags: expiredFlags.length,
      flagsWithoutOwner,
      flagsWithoutExpiration,
      flagsWithRollout,
      debtScore,
    });
    
    return {
      totalFlags: allFlags.length,
      enabledFlags,
      disabledFlags,
      expiredFlags: expiredFlags.length,
      flagsWithoutOwner,
      flagsWithoutExpiration,
      flagsWithRollout,
      flagsByCategory,
      debtScore,
      recommendations,
    };
  }
  
  private calculateDebtScore(metrics: {
    totalFlags: number;
    expiredFlags: number;
    flagsWithoutOwner: number;
    flagsWithoutExpiration: number;
    flagsWithRollout: number;
  }): number {
    let score = 0;
    
    // Expired flags contribute heavily to debt
    score += (metrics.expiredFlags / Math.max(metrics.totalFlags, 1)) * 40;
    
    // Flags without owner contribute to debt
    score += (metrics.flagsWithoutOwner / Math.max(metrics.totalFlags, 1)) * 20;
    
    // Flags without expiration contribute to debt (except permanent flags)
    score += (metrics.flagsWithoutExpiration / Math.max(metrics.totalFlags, 1)) * 15;
    
    // Gradual rollouts in progress contribute to debt
    score += (metrics.flagsWithRollout / Math.max(metrics.totalFlags, 1)) * 10;
    
    // Too many flags contribute to debt
    if (metrics.totalFlags > 20) {
      score += ((metrics.totalFlags - 20) / 100) * 15;
    }
    
    return Math.min(100, Math.round(score));
  }
  
  private generateRecommendations(metrics: {
    totalFlags: number;
    expiredFlags: number;
    flagsWithoutOwner: number;
    flagsWithoutExpiration: number;
    flagsWithRollout: number;
    debtScore: number;
  }): string[] {
    const recommendations: string[] = [];
    
    if (metrics.expiredFlags > 0) {
      recommendations.push(`${metrics.expiredFlags} expired flags should be disabled or removed`);
    }
    
    if (metrics.flagsWithoutOwner > 0) {
      recommendations.push(`${metrics.flagsWithoutOwner} flags without owner should be assigned ownership`);
    }
    
    if (metrics.flagsWithoutExpiration > 5) {
      recommendations.push('Consider setting expiration dates for temporary feature flags');
    }
    
    if (metrics.flagsWithRollout > 3) {
      recommendations.push(`${metrics.flagsWithRollout} gradual rollouts in progress - consider completing them`);
    }
    
    if (metrics.totalFlags > 25) {
      recommendations.push('Consider removing unused feature flags to reduce complexity');
    }
    
    if (metrics.debtScore > 50) {
      recommendations.push('Flag debt is high - schedule monthly review to clean up flags');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Feature flag management is healthy - continue regular reviews');
    }
    
    return recommendations;
  }
  
  /**
   * Automatically disable expired flags
   * This should be run periodically (e.g., daily via cron)
   */
  async cleanupExpiredFlags(): Promise<{ disabled: number; errors: number }> {
    try {
      const disabled = await featureFlagService.disableExpiredFlags();
      return { disabled, errors: 0 };
    } catch (error) {
      console.error('Error cleaning up expired flags:', error);
      return { disabled: 0, errors: 1 };
    }
  }
  
  /**
   * Get flags that should be reviewed for cleanup
   */
  async getFlagsForCleanup(): Promise<any[]> {
    const allFlags = await featureFlagService.getAllFeatureFlags();
    const now = new Date();
    
    return allFlags.filter(flag => {
      // Flag is disabled and hasn't been updated in 30 days
      if (!flag.isEnabled) {
        const lastUpdated = new Date(flag.updatedAt);
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 30) {
          return true;
        }
      }
      
      // Flag has expired
      if (flag.expiresAt && flag.expiresAt < now) {
        return true;
      }
      
      return false;
    });
  }
}

export const flagDebtService = new FlagDebtService();
