export enum AgentPriority {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low"
}

export type AgentTrigger =
  | "conversation.created"
  | "message.received"
  | "message.sent"
  | "conversation.claimed"
  | "conversation.closed"
  | "deal.created"
  | "deal.stage_changed"
  | "task.due"
  | "sla.warning"
  | "sla.expired"
  | "campaign.completed"
  | "manual.run";

export type AgentAction =
  | { type: "apply_tag"; tag: string }
  | { type: "route_to_department"; departmentId: string }
  | { type: "assign_to_user"; userId: string }
  | { type: "create_deal"; payload: { title: string; value: number; products?: string } }
  | { type: "create_task"; payload: { title: string; dueInDays: number; priority: "low" | "medium" | "high"; notes?: string } }
  | { type: "send_message"; text: string; requireApproval?: boolean }
  | { type: "send_template"; templateId: string; variables: Record<string, string> }
  | { type: "create_internal_note"; text: string }
  | { type: "notify_user"; userId: string; text: string }
  | { type: "notify_role"; role: string; text: string }
  | { type: "update_contact_score"; score: number }
  | { type: "update_deal_stage"; dealId: string; stageId: string }
  | { type: "escalate_conversation"; reason: string };

export interface AgentExecutionContext {
  tenantId: string;
  currentUserId: string;
  conversationId?: string;
  contactId?: string;
  dealId?: string;
  metadata?: Record<string, unknown>;
  // Read-only state view for agents
  state: {
    getContact: (id: string) => any;
    getConversation: (id: string) => any;
    getDeal: (id: string) => any;
    getMessages: (convId: string) => any[];
    getDepartments: () => any[];
    getUsers: () => any[];
    getWhatsappConnectionStatus: () => string;
  };
}

export interface AgentResult<T = any> {
  success: boolean;
  agentId: string;
  output?: T;
  actions?: AgentAction[];
  confidence?: number;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface HBAgent<Input = any, Output = any> {
  id: string;
  name: string;
  description: string;
  plan: "starter" | "pro" | "enterprise";
  priority: AgentPriority;
  enabled: boolean;
  triggers: AgentTrigger[];
  execute(input: Input, context: AgentExecutionContext): Promise<AgentResult<Output>>;
}

export interface AgentLog {
  id: string;
  tenantId: string;
  agentId: string;
  agentName: string;
  trigger: string;
  success: boolean;
  confidence: number;
  actionsCount: number;
  cost: number;
  durationMs: number;
  inputSummary: string;
  outputSummary: string;
  createdAt: string;
}

export interface TenantAgentConfig {
  agentId: string;
  enabled: boolean;
  promptOverride?: string;
}
