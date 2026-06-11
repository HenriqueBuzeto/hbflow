import { PrismaClient } from '@prisma/client';
import { FeatureFlagService, FeatureFlagConfig } from '../src/lib/feature-flags/FeatureFlagService';

const prisma = new PrismaClient();
const featureFlagService = new FeatureFlagService();

const CORE_FEATURE_FLAGS: FeatureFlagConfig[] = [
  {
    key: 'global_request_id',
    name: 'Global Request ID',
    description: 'Enable global request ID tracking across all API calls and logs',
    category: 'general',
    isEnabled: true,
    rolloutPercentage: 100,
    owner: 'system',
  },
  {
    key: 'soft_delete_enforcement',
    name: 'Soft Delete Enforcement',
    description: 'Enforce soft delete across all entities instead of physical delete',
    category: 'security',
    isEnabled: true,
    rolloutPercentage: 100,
    owner: 'system',
  },
  {
    key: 'concurrency_protection',
    name: 'Concurrency Protection',
    description: 'Enable optimistic locking and transaction-based concurrency protection',
    category: 'security',
    isEnabled: true,
    rolloutPercentage: 100,
    owner: 'system',
  },
  {
    key: 'api_versioning',
    name: 'API Versioning',
    description: 'Enable API versioning with /api/v1 structure',
    category: 'api',
    isEnabled: true,
    rolloutPercentage: 100,
    owner: 'system',
  },
  {
    key: 'ai_agents_enabled',
    name: 'AI Agents Enabled',
    description: 'Enable AI agent functionality for conversation automation',
    category: 'ai',
    isEnabled: false,
    rolloutPercentage: 0,
    owner: 'system',
  },
  {
    key: 'whatsapp_cloud_api',
    name: 'WhatsApp Cloud API',
    description: 'Enable WhatsApp Cloud API integration',
    category: 'whatsapp',
    isEnabled: false,
    rolloutPercentage: 0,
    owner: 'system',
  },
  {
    key: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Enable advanced analytics and reporting features',
    category: 'performance',
    isEnabled: false,
    rolloutPercentage: 0,
    owner: 'system',
  },
  {
    key: 'trial_system',
    name: 'Trial System',
    description: 'Enable 3-day trial system for new tenants',
    category: 'billing',
    isEnabled: false,
    rolloutPercentage: 0,
    owner: 'system',
  },
];

async function seedFeatureFlags() {
  console.log('=== SEEDING CORE FEATURE FLAGS ===\n');

  for (const flagConfig of CORE_FEATURE_FLAGS) {
    try {
      const existing = await featureFlagService.getFeatureFlag(flagConfig.key);
      
      if (existing) {
        console.log(`✅ Feature flag "${flagConfig.key}" already exists`);
      } else {
        await featureFlagService.createFeatureFlag(flagConfig);
        console.log(`✅ Created feature flag "${flagConfig.key}"`);
      }
    } catch (error) {
      console.error(`❌ Failed to create feature flag "${flagConfig.key}":`, error);
    }
  }

  console.log('\n=== FEATURE FLAGS SEEDING COMPLETE ===');
}

seedFeatureFlags()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding feature flags:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
