import { HBAgent } from './agent.types';

export type TenantPlan = 'starter' | 'pro' | 'enterprise';

export const isAgentAllowedForPlan = (agentPlan: HBAgent['plan'], tenantPlan: TenantPlan): boolean => {
  if (tenantPlan === 'enterprise') return true; 
  if (tenantPlan === 'pro') return agentPlan !== 'enterprise'; 
  return agentPlan === 'starter'; 
};

export const getPlanMinRequirementLabel = (plan: HBAgent['plan']): string => {
  if (plan === 'starter') return 'Plano Starter';
  if (plan === 'pro') return 'Plano PRO';
  return 'Plano Enterprise';
};
