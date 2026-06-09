import { HBAgent } from './agent.types';
import { triageAgent } from '../starter/triage-agent';
import { faqAgent } from '../starter/faq-agent';
import { summaryAgent } from '../starter/summary-agent';
import { sdrAgent } from '../pro/sdr-agent';
import { salesAgent } from '../pro/sales-agent';
import { followupAgent } from '../pro/followup-agent';
import { billingAgent } from '../pro/billing-agent';
import { sentimentAgent } from '../pro/sentiment-agent';
import { supervisorAgent } from '../enterprise/supervisor-agent';
import { salesCoachAgent } from '../enterprise/sales-coach-agent';
import { attendantCopilotAgent } from '../enterprise/attendant-copilot-agent';
import { commercialManagerAgent } from '../enterprise/commercial-manager-agent';
import { forecastAgent } from '../enterprise/forecast-agent';
import { auditAgent } from '../enterprise/audit-agent';
import { workflowAgent } from '../enterprise/workflow-agent';
import { isAgentAllowedForPlan, TenantPlan } from './agent-permissions';

export const agentRegistry: HBAgent[] = [
  triageAgent,
  faqAgent,
  summaryAgent,
  sdrAgent,
  salesAgent,
  followupAgent,
  billingAgent,
  sentimentAgent,
  supervisorAgent,
  salesCoachAgent,
  attendantCopilotAgent,
  commercialManagerAgent,
  forecastAgent,
  auditAgent,
  workflowAgent
];

export const getAvailableAgentsForPlan = (plan: TenantPlan): HBAgent[] => {
  return agentRegistry.filter((agent) => isAgentAllowedForPlan(agent.plan, plan));
};
