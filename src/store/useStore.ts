import { create } from 'zustand';
import { z } from 'zod';
import { AgentLog, AgentTrigger } from '@/agents/core/agent.types';
import { runOrchestrator } from '@/agents/core/agent-orchestrator';
import { agentRegistry } from '@/agents/core/agent-registry';
import { createAgentLog } from '@/agents/core/agent-logger';
import { aiWorkforceOrchestrator } from '@/ai-workforce/orchestration/workforce-orchestrator';

// Gentle Web Audio API synthesizer for calm chimes
export const playNotificationSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq: number, delay: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine'; // sine wave is the softest, calmest waveform
      osc.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
      // Soft attack (fade in)
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.08);
      // Soft decay (fade out)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };
    
    // Soothing, calm arpeggiated chord (C5 -> E5 -> G5 -> C6)
    playTone(523.25, 0, 1.5, 0.04);      // C5
    playTone(659.25, 0.08, 1.3, 0.03);   // E5
    playTone(783.99, 0.16, 1.1, 0.025);  // G5
    playTone(1046.50, 0.24, 0.9, 0.015); // C6
  } catch (e) {
    console.warn('Som de notificação bloqueado pelo navegador ou sem suporte', e);
  }
};

// Types & Interfaces
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string; // Admin, Gestor, Supervisor, Atendente, Comercial, Financeiro
  signature: string;
  sigPosition: 'start' | 'end' | 'disabled';
  filters: string[]; // e.g. ["vendas", "orcamento", "financeiro"]
  isOnline: boolean;
  presence: 'online' | 'away' | 'lunch' | 'meeting' | 'break' | 'offline';
  workload: number; // current open chats count
}

export interface WhatsappConnection {
  name: string;
  provider?: 'cloud_api' | 'qr_gateway';
  instanceName?: string;
  phoneNumber: string;
  phoneId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  status: 'connected' | 'disconnected' | 'warning';
  lastSyncedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  document: string; // CPF/CNPJ
  city: string;
  state: string;
  origin: string; // whatsapp, web, etc.
  status: 'lead' | 'customer' | 'lost';
  tags: string[];
  notes: string;
  score: number;
  totalPurchased: number;
  firstContactAt: string;
  lastContactAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'contact' | 'user' | 'system' | 'automation' | 'internal_note' | 'whisper';
  senderName: string;
  body: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'template';
  mediaUrl?: string;
  signatureUsed?: string;
  isRead: boolean;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Conversation {
  id: string;
  tenantId: string;
  contactId: string;
  assignedUserId: string | null;
  departmentId: string | null;
  status: 'new' | 'open' | 'pending' | 'closed' | 'favorite';
  unreadCount: number;
  slaLimitAt: string | null;
  claimedAt: string | null;
  waitStartedAt: string | null;
  aiLeadScore?: number;
  aiLeadLabel?: 'quente' | 'morno' | 'frio';
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface QuickReply {
  id: string;
  shortcut: string;
  message: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  body: string;
}

export interface DealActivity {
  id: string;
  dealId: string;
  type: string;
  content: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  contactId: string;
  stageId: string;
  assignedUserId: string | null;
  title: string;
  value: number;
  probability: number;
  origin: string;
  products: string;
  expectedClose: string;
  lostReason?: string;
  status: 'open' | 'won' | 'lost';
  notes: string;
  createdAt: string;
  activities: DealActivity[];
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

export interface Task {
  id: string;
  contactId: string | null;
  dealId: string | null;
  assignedUserId: string;
  title: string;
  type: 'call' | 'proposal' | 'follow_up' | 'meeting' | 'after_sales';
  dueAt: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  notes?: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  greetingMessage: string;
  awayMessage: string;
  distributionMode: 'manual' | 'workload' | 'round_robin' | 'priority';
  slaFirstResponseMinutes: number;
  slaResolutionMinutes: number;
  isActive: boolean;
}

export interface FlowNode {
  id: string;
  type: 'message' | 'question' | 'input' | 'tag_add' | 'route_department' | 'end';
  config: {
    messageText?: string;
    questionOptions?: string[]; // e.g. ["Comprar", "Financeiro"]
    tagName?: string;
    departmentId?: string;
  };
  positionX: number;
  positionY: number;
}

export interface FlowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionValue?: string; // option index or answer trigger
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowSession {
  id: string;
  flowId: string;
  conversationId: string;
  contactId: string;
  currentNodeId: string | null;
  status: 'active' | 'completed' | 'transferred';
  context: Record<string, any>;
}

export interface RoutingLog {
  id: string;
  conversationId: string;
  contactName: string;
  departmentName: string | null;
  assignedUserName: string | null;
  routingReason: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'sla' | 'assignment';
  isRead: boolean;
  createdAt: string;
}

interface State {
  tenants: Tenant[];
  currentTenantId: string;
  users: User[];
  currentUserId: string;
  whatsappConnection: WhatsappConnection;
  contacts: Contact[];
  conversations: Conversation[];
  quickReplies: QuickReply[];
  templates: MessageTemplate[];
  stages: PipelineStage[];
  deals: Deal[];
  tasks: Task[];
  departments: Department[];
  flows: Flow[];
  flowSessions: FlowSession[];
  routingLogs: RoutingLog[];
  notifications: Notification[];
  darkMode: boolean;
  agentLogs: AgentLog[];
  enabledAgentIds: string[];
  demo_mode_enabled: boolean;
}

interface Actions {
  toggleDarkMode: () => void;
  setUserPresence: (userId: string, presence: 'online' | 'away' | 'lunch' | 'meeting' | 'break' | 'offline') => void;
  // Config & Switches
  setCurrentUserId: (id: string) => void;
  setCurrentTenantId: (id: string) => void;
  updateWhatsappConnection: (config: Partial<WhatsappConnection>) => void;

  // Messaging & Claiming
  sendMessage: (conversationId: string, body: string, senderType: 'user' | 'system' | 'automation') => void;
  sendInternalNote: (conversationId: string, body: string) => void;
  sendWhisper: (conversationId: string, body: string) => void;
  receiveCustomerMessage: (phone: string, name: string, body: string) => void;
  claimConversation: (conversationId: string, userId: string) => { success: boolean; error?: string };
  takeOverConversation: (conversationId: string, userId: string) => void;
  transferConversation: (conversationId: string, targetUserId: string | null, targetDeptId: string | null) => void;
  resolveConversation: (conversationId: string) => void;

  // Contacts
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  addContact: (contact: Omit<Contact, 'id' | 'firstContactAt' | 'lastContactAt'>) => Contact;

  // Pipeline
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt' | 'activities'>) => void;
  moveDeal: (dealId: string, targetStageId: string) => void;
  updateDealStatus: (dealId: string, status: 'won' | 'lost', reason?: string) => void;

  // Departments & Flows
  addDepartment: (dept: Department) => void;
  updateDepartment: (deptId: string, updates: Partial<Department>) => void;
  addFlow: (flow: Flow) => void;
  updateFlow: (flowId: string, updates: Partial<Flow>) => void;
  triggerFlowSession: (conversationId: string, flowId: string) => void;
  executeNode: (conversationId: string, flow: Flow, node: FlowNode) => void;

  // Tasks
  addTask: (task: Omit<Task, 'id' | 'status'>) => void;
  toggleTask: (taskId: string) => void;

  // Notifications & Alerts
  addNotification: (title: string, message: string, type: 'system' | 'sla' | 'assignment') => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // AI Agents
  toggleAgent: (agentId: string) => void;
  clearAgentLogs: () => void;
  runAgentManually: (agentId: string, input: any) => Promise<any>;
  triggerAgentOrchestrator: (trigger: AgentTrigger, input: any, conversationId?: string, contactId?: string, dealId?: string) => Promise<void>;
  setDemoModeEnabled: (enabled: boolean) => void;
}

// Zod schemas for validation
export const whatsappConnectionSchema = z.object({
  name: z.string().min(2, "Nome inválido"),
  provider: z.enum(['cloud_api', 'qr_gateway']).optional(),
  instanceName: z.string().optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Telefone inválido").optional().or(z.literal('')),
  phoneId: z.string().optional().or(z.literal('')),
  wabaId: z.string().optional().or(z.literal('')),
  accessToken: z.string().optional().or(z.literal('')),
  verifyToken: z.string().optional().or(z.literal('')),
});

// Mock Initial Data
const initialTenants: Tenant[] = [
  { id: 'tenant-1', name: 'HBFlow Consultoria Ltda', slug: 'hbflow', plan: 'pro' },
  { id: 'tenant-2', name: 'Parceiro Comercial S/A', slug: 'parceiro', plan: 'enterprise' }
];

const initialUsers: User[] = [
  { id: 'user-1', name: 'João Silva', email: 'joao@hbflow.com', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces', role: 'Comercial', signature: 'Atenciosamente, João da equipe de Vendas.', sigPosition: 'end', filters: ['vendas', 'orcamento'], isOnline: true, presence: 'online', workload: 1 },
  { id: 'user-2', name: 'Maria Souza', email: 'maria@hbflow.com', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces', role: 'Financeiro', signature: 'Abraços, Maria do Setor Financeiro.', sigPosition: 'end', filters: ['financeiro', 'cobranca'], isOnline: true, presence: 'away', workload: 0 },
  { id: 'user-3', name: 'Pedro Santos', email: 'pedro@hbflow.com', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces', role: 'Supervisor', signature: 'Pedro Santos - Supervisor Técnico.', sigPosition: 'start', filters: ['manutencao', 'garantia'], isOnline: true, presence: 'lunch', workload: 1 },
  { id: 'user-4', name: 'Henrique Boss (Admin)', email: 'henrique@hbflow.com', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces', role: 'Admin', signature: 'Henrique - CEO HBFlow', sigPosition: 'disabled', filters: ['vendas', 'financeiro', 'manutencao'], isOnline: true, presence: 'online', workload: 0 }
];

const initialWhatsapp: WhatsappConnection = {
  name: 'HBFlow Oficial',
  provider: 'cloud_api',
  phoneNumber: '+55 11 99999-8888',
  phoneId: '109843789012345',
  wabaId: '234908127390841',
  accessToken: 'EAAGb0ZC9ZCsZB0BAOzG3mYnC6ZB1a...',
  verifyToken: 'hbflow_secret_token_2026',
  status: 'connected',
  lastSyncedAt: '2026-06-08T18:30:00-03:00'
};

const initialDepartments: Department[] = [
  { id: 'dept-vendas', name: 'Vendas', description: 'Atendimento comercial, orçamentos e captação de leads.', color: '#7C3AED', icon: 'ShoppingBag', greetingMessage: 'Olá! Você está no setor de Vendas. Um vendedor já vai te atender.', awayMessage: 'Olá! Nosso time comercial está fora do horário. Retornamos às 08:00.', distributionMode: 'round_robin', slaFirstResponseMinutes: 10, slaResolutionMinutes: 30, isActive: true },
  { id: 'dept-financeiro', name: 'Financeiro', description: 'Assuntos relacionados a cobranças, boletos e pagamentos.', color: '#2563EB', icon: 'CreditCard', greetingMessage: 'Olá! Encaminhando você para nosso time Financeiro. Aguarde um instante.', awayMessage: 'Olá! O financeiro atende de segunda a sexta, das 09h às 18h.', distributionMode: 'workload', slaFirstResponseMinutes: 15, slaResolutionMinutes: 45, isActive: true },
  { id: 'dept-manutencao', name: 'Manutenção', description: 'Suporte técnico, garantia e manutenção de produtos.', color: '#16A34A', icon: 'Wrench', greetingMessage: 'Olá! Setor de Manutenção. Descreva seu problema ou envie fotos do produto.', awayMessage: 'Olá! Nosso suporte técnico está offline. Deixe sua mensagem.', distributionMode: 'manual', slaFirstResponseMinutes: 20, slaResolutionMinutes: 120, isActive: true }
];

const initialContacts: Contact[] = [
  { id: 'contact-1', name: 'Mateus Oliveira', phone: '+55 11 98888-7777', email: 'mateus@email.com', document: '123.456.789-00', city: 'São Paulo', state: 'SP', origin: 'whatsapp', status: 'lead', tags: ['vendas', 'potencial-cliente'], notes: 'Interessado na compra de óculos de grau.', score: 80, totalPurchased: 0, firstContactAt: '2026-06-08T12:00:00Z', lastContactAt: '2026-06-08T19:00:00Z' },
  { id: 'contact-2', name: 'Ana Costa', phone: '+55 21 97777-6666', email: 'ana@email.com', document: '987.654.321-11', city: 'Rio de Janeiro', state: 'RJ', origin: 'whatsapp', status: 'customer', tags: ['oportunidade', 'vip'], notes: 'Cliente recorrente, faturamento alto.', score: 95, totalPurchased: 1250.00, firstContactAt: '2026-06-01T10:00:00Z', lastContactAt: '2026-06-08T18:46:00Z' },
  { id: 'contact-3', name: 'Luiza Souza', phone: '+55 31 96666-5555', email: 'luiza@email.com', document: '222.333.444-55', city: 'Belo Horizonte', state: 'MG', origin: 'whatsapp', status: 'lead', tags: ['manutencao'], notes: 'Solicitou conserto da armação de óculos de sol.', score: 60, totalPurchased: 150.00, firstContactAt: '2026-06-08T11:30:00Z', lastContactAt: '2026-06-08T18:22:00Z' }
];

const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    tenantId: 'tenant-1',
    contactId: 'contact-1',
    assignedUserId: 'user-1',
    departmentId: 'dept-vendas',
    status: 'open',
    unreadCount: 0,
    slaLimitAt: '2026-06-08T19:46:00Z',
    claimedAt: '2026-06-08T12:05:00Z',
    waitStartedAt: null,
    aiLeadScore: 75,
    aiLeadLabel: 'quente',
    createdAt: '2026-06-08T12:00:00Z',
    updatedAt: '2026-06-08T19:00:00Z',
    messages: [
      { id: 'm-1', conversationId: 'conv-1', senderType: 'contact', senderName: 'Mateus Oliveira', body: 'Olá, gostaria de saber o valor do modelo de óculos Ray-Ban.', type: 'text', isRead: true, createdAt: '2026-06-08T12:00:00Z', status: 'read' },
      { id: 'm-2', conversationId: 'conv-1', senderType: 'user', senderName: 'João Silva', body: 'Olá Mateus! Claro, temos a partir de R$ 450,00. Qual cor você prefere?', type: 'text', signatureUsed: 'Atenciosamente, João da equipe de Vendas.', isRead: true, createdAt: '2026-06-08T12:05:00Z', status: 'read' },
      { id: 'm-3', conversationId: 'conv-1', senderType: 'contact', senderName: 'Mateus Oliveira', body: 'Gostei do preto clássico.', type: 'text', isRead: true, createdAt: '2026-06-08T13:46:00Z', status: 'read' }
    ]
  },
  {
    id: 'conv-2',
    tenantId: 'tenant-1',
    contactId: 'contact-2',
    assignedUserId: null,
    departmentId: 'dept-financeiro',
    status: 'new',
    unreadCount: 1,
    slaLimitAt: '2026-06-08T19:15:00Z',
    claimedAt: null,
    waitStartedAt: '2026-06-08T18:46:00Z',
    aiLeadScore: 45,
    aiLeadLabel: 'frio',
    createdAt: '2026-06-08T10:00:00Z',
    updatedAt: '2026-06-08T18:46:00Z',
    messages: [
      { id: 'm-4', conversationId: 'conv-2', senderType: 'contact', senderName: 'Ana Costa', body: 'Preciso da segunda via do boleto vencido.', type: 'text', isRead: false, createdAt: '2026-06-08T18:46:00Z', status: 'delivered' }
    ]
  },
  {
    id: 'conv-3',
    tenantId: 'tenant-1',
    contactId: 'contact-3',
    assignedUserId: 'user-3',
    departmentId: 'dept-manutencao',
    status: 'pending',
    unreadCount: 0,
    slaLimitAt: null,
    claimedAt: '2026-06-08T11:35:00Z',
    waitStartedAt: null,
    aiLeadScore: 55,
    aiLeadLabel: 'morno',
    createdAt: '2026-06-08T11:30:00Z',
    updatedAt: '2026-06-08T18:22:00Z',
    messages: [
      { id: 'm-5', conversationId: 'conv-3', senderType: 'contact', senderName: 'Luiza Souza', body: 'Gostaria de ver se tem conserto.', type: 'text', isRead: true, createdAt: '2026-06-08T11:30:00Z', status: 'read' },
      { id: 'm-6', conversationId: 'conv-3', senderType: 'user', senderName: 'Pedro Santos', body: 'Pedro Santos - Supervisor Técnico. Olá, Luiza! Envie uma foto do estrago por favor.', type: 'text', signatureUsed: 'Pedro Santos - Supervisor Técnico.', isRead: true, createdAt: '2026-06-08T11:35:00Z', status: 'read' }
    ]
  }
];


const initialQuickReplies: QuickReply[] = [
  { id: 'q-1', shortcut: '/saudacao', message: 'Olá! Sou o atendente da HBFlow. Como posso ajudar você hoje?' },
  { id: 'q-2', shortcut: '/pix', message: 'Chave PIX CNPJ: 12.345.678/0001-99 (HBFlow Soluções S/A). Após enviar o pagamento, mande o comprovante aqui!' },
  { id: 'q-3', shortcut: '/obrigado', message: 'Obrigado pelo contato! Se precisar de algo mais, estou à disposição.' }
];

const initialTemplates: MessageTemplate[] = [
  { id: 't-1', name: 'confirmacao_pagamento', category: 'UTILITY', body: 'Olá {{nome_cliente}}! Recebemos o seu pagamento referente ao protocolo {{protocolo}}. Seu produto {{produto}} já está sendo preparado.' },
  { id: 't-2', name: 'lembrete_proposta', category: 'MARKETING', body: 'Olá {{nome_cliente}}, aqui é o {{nome_atendente}} da {{nome_empresa}}. Passando para saber se conseguiu analisar nossa proposta comercial. Aguardo seu retorno!' }
];

const initialStages: PipelineStage[] = [
  { id: 'stage-1', name: 'Novo Lead', position: 0 },
  { id: 'stage-2', name: 'Em Atendimento', position: 1 },
  { id: 'stage-3', name: 'Proposta Enviada', position: 2 },
  { id: 'stage-4', name: 'Negociação', position: 3 },
  { id: 'stage-5', name: 'Fechado Ganho', position: 4 },
  { id: 'stage-6', name: 'Fechado Perdido', position: 5 }
];

const initialDeals: Deal[] = [
  { id: 'deal-1', contactId: 'contact-1', stageId: 'stage-1', assignedUserId: 'user-1', title: 'Orçamento Ray-Ban Mateus', value: 450.00, probability: 70, origin: 'WhatsApp', products: 'Óculos Ray-Ban Preto', expectedClose: '2026-06-15', status: 'open', notes: 'Lead quente interessado no clássico.', createdAt: '2026-06-08T12:10:00Z', activities: [{ id: 'act-1', dealId: 'deal-1', type: 'stage_change', content: 'Lead criado na etapa Novo Lead.', createdAt: '2026-06-08T12:10:00Z' }] },
  { id: 'deal-2', contactId: 'contact-2', stageId: 'stage-4', assignedUserId: 'user-1', title: 'Renovação Contrato Ana', value: 2400.00, probability: 90, origin: 'WhatsApp', products: 'Assinatura Anual Gold', expectedClose: '2026-06-10', status: 'open', notes: 'Aguardando validação da segunda via do boleto.', createdAt: '2026-06-01T10:15:00Z', activities: [{ id: 'act-2', dealId: 'deal-2', type: 'note', content: 'Adicionou nota: Ana pediu boleto atualizado.', createdAt: '2026-06-08T18:48:00Z' }] }
];

const initialTasks: Task[] = [
  { id: 'task-1', contactId: 'contact-1', dealId: 'deal-1', assignedUserId: 'user-1', title: 'Enviar link de pagamento Ray-Ban', type: 'proposal', dueAt: '2026-06-09T14:00:00Z', priority: 'high', status: 'pending', notes: 'Enviar chave pix ou checkout.' },
  { id: 'task-2', contactId: 'contact-3', dealId: null, assignedUserId: 'user-3', title: 'Ligar para cobrar fotos do óculos quebrado', type: 'call', dueAt: '2026-06-08T20:00:00Z', priority: 'medium', status: 'pending', notes: 'Precisa ver fotos para dar o laudo da garantia.' }
];

// Initial Routing Flow Configuration
const initialFlows: Flow[] = [
  {
    id: 'flow-welcome',
    name: 'Fluxo de Triagem Inicial',
    description: 'Menu inicial automático de boas vindas e roteamento por setor.',
    isActive: true,
    nodes: [
      { id: 'node-start', type: 'message', config: { messageText: 'Olá! Seja bem-vindo(a) à nossa central HBFlow. Como podemos ajudar?\n\n1 - Comprar ou fazer orçamento\n2 - Financeiro / Boletos\n3 - Manutenção / Garantia\n4 - Falar com atendente' }, positionX: 100, positionY: 100 },
      { id: 'node-choice', type: 'question', config: { questionOptions: ['1', '2', '3', '4'] }, positionX: 100, positionY: 300 },
      { id: 'node-vendas', type: 'route_department', config: { departmentId: 'dept-vendas' }, positionX: -150, positionY: 500 },
      { id: 'node-financeiro', type: 'route_department', config: { departmentId: 'dept-financeiro' }, positionX: 50, positionY: 500 },
      { id: 'node-manutencao', type: 'route_department', config: { departmentId: 'dept-manutencao' }, positionX: 250, positionY: 500 },
      { id: 'node-geral', type: 'message', config: { messageText: 'Vou te encaminhar para a fila de atendimento geral.' }, positionX: 450, positionY: 500 }
    ],
    edges: [
      { id: 'edge-1', sourceNodeId: 'node-start', targetNodeId: 'node-choice' },
      { id: 'edge-opt1', sourceNodeId: 'node-choice', targetNodeId: 'node-vendas', conditionValue: '1' },
      { id: 'edge-opt2', sourceNodeId: 'node-choice', targetNodeId: 'node-financeiro', conditionValue: '2' },
      { id: 'edge-opt3', sourceNodeId: 'node-choice', targetNodeId: 'node-manutencao', conditionValue: '3' },
      { id: 'edge-opt4', sourceNodeId: 'node-choice', targetNodeId: 'node-geral', conditionValue: '4' }
    ]
  }
];

export const useStore = create<State & Actions>((set, get) => ({
  tenants: initialTenants,
  currentTenantId: 'tenant-1',
  users: initialUsers,
  currentUserId: 'user-1',
  whatsappConnection: initialWhatsapp,
  contacts: initialContacts,
  conversations: initialConversations,
  quickReplies: initialQuickReplies,
  templates: initialTemplates,
  stages: initialStages,
  deals: initialDeals,
  tasks: initialTasks,
  departments: initialDepartments,
  flows: initialFlows,
  flowSessions: [],
  routingLogs: [],
  notifications: [
    { id: 'not-1', title: 'Novo Chamado Recebido', message: 'O cliente Ana Costa enviou mensagem na fila Financeiro.', type: 'system', isRead: false, createdAt: new Date().toISOString() }
  ],
  darkMode: typeof window !== 'undefined' ? localStorage.getItem('hbflow-dark-mode') === 'true' : false,
  agentLogs: [],
  enabledAgentIds: ['triage-agent', 'faq-agent', 'summary-agent', 'sdr-agent', 'sales-agent', 'sentiment-agent', 'supervisor-agent', 'attendant-copilot-agent'],
  demo_mode_enabled: true,

  // Setters
  toggleDarkMode: () => {
    const nextDark = !get().darkMode;
    set({ darkMode: nextDark });
    if (typeof window !== 'undefined') {
      localStorage.setItem('hbflow-dark-mode', nextDark ? 'true' : 'false');
    }
  },
  setUserPresence: (userId, presence) => set((s) => ({
    users: s.users.map((u) => u.id === userId ? { ...u, presence, isOnline: presence !== 'offline' } : u)
  })),
  setCurrentUserId: (id) => set({ currentUserId: id }),
  setCurrentTenantId: (id) => set({ currentTenantId: id }),
  updateWhatsappConnection: (config) => set((state) => ({
    whatsappConnection: { ...state.whatsappConnection, ...config }
  })),
  setDemoModeEnabled: (enabled) => {
    if (!enabled) {
      set({
        demo_mode_enabled: false,
        contacts: [],
        conversations: [],
        deals: [],
        tasks: [],
        whatsappConnection: {
          name: '',
          phoneNumber: '',
          phoneId: '',
          wabaId: '',
          accessToken: '',
          verifyToken: '',
          status: 'disconnected',
          lastSyncedAt: ''
        },
        notifications: [],
        routingLogs: [],
        quickReplies: [
          { id: 'q-1', shortcut: '/saudacao', message: 'Olá! Como posso ajudar você hoje?' },
          { id: 'q-3', shortcut: '/obrigado', message: 'Obrigado pelo contato! Se precisar de algo mais, estou à disposição.' }
        ]
      });
    } else {
      set({
        demo_mode_enabled: true,
        contacts: initialContacts,
        conversations: initialConversations,
        deals: initialDeals,
        tasks: initialTasks,
        whatsappConnection: initialWhatsapp,
        notifications: [
          { id: 'not-1', title: 'Novo Chamado Recebido', message: 'O cliente Ana Costa enviou mensagem na fila Financeiro.', type: 'system', isRead: false, createdAt: new Date().toISOString() }
        ],
        routingLogs: [],
        quickReplies: initialQuickReplies
      });
    }
  },

  // Messaging & Claiming
  sendMessage: (conversationId, body, senderType) => {
    const state = get();
    const currentUser = state.users.find(u => u.id === state.currentUserId);
    if (!currentUser) return;

    // Apply Signature
    let finalBody = body;
    let signatureUsed = '';
    if (senderType === 'user' && currentUser.signature && currentUser.sigPosition !== 'disabled') {
      signatureUsed = currentUser.signature;
      if (currentUser.sigPosition === 'start') {
        finalBody = `${currentUser.signature}\n\n${body}`;
      } else {
        finalBody = `${body}\n\n${currentUser.signature}`;
      }
    }

    const newMessage: Message = {
      id: `m-usr-${Date.now()}`,
      conversationId,
      senderType,
      senderName: senderType === 'user' ? currentUser.name : 'Sistema',
      body: finalBody,
      type: 'text',
      signatureUsed: signatureUsed || undefined,
      isRead: true,
      createdAt: new Date().toISOString(),
      status: 'sent'
    };

    // Update conversation message list
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, newMessage]
          };
        }
        return c;
      })
    }));

    // Trigger fake delivery/read status updates
    setTimeout(() => {
      set((state) => ({
        conversations: state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === newMessage.id ? { ...m, status: 'read' as const } : m
              )
            };
          }
          return c;
        })
      }));
    }, 1500);

    // Trigger AI Agents Orchestrator
    setTimeout(() => {
      get().triggerAgentOrchestrator(
        'message.sent',
        { messageBody: body },
        conversationId
      );
    }, 200);
  },

  sendInternalNote: (conversationId, body) => {
    const state = get();
    const currentUser = state.users.find(u => u.id === state.currentUserId);
    if (!currentUser) return;

    const newMessage: Message = {
      id: `m-note-${Date.now()}`,
      conversationId,
      senderType: 'internal_note',
      senderName: currentUser.name,
      body,
      type: 'text',
      isRead: true,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, newMessage]
          };
        }
        return c;
      })
    }));
  },

  sendWhisper: (conversationId, body) => {
    const state = get();
    const currentUser = state.users.find(u => u.id === state.currentUserId);
    if (!currentUser) return;

    const newMessage: Message = {
      id: `m-whisp-${Date.now()}`,
      conversationId,
      senderType: 'whisper',
      senderName: currentUser.name,
      body,
      type: 'text',
      isRead: true,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, newMessage]
          };
        }
        return c;
      })
    }));
  },

  receiveCustomerMessage: (phone, name, body) => {
    const state = get();
    let contact = state.contacts.find((c) => c.phone === phone);

    // 1. Create or update contact
    if (!contact) {
      contact = {
        id: `contact-${Date.now()}`,
        name,
        phone,
        email: '',
        document: '',
        city: '',
        state: '',
        origin: 'whatsapp',
        status: 'lead',
        tags: [],
        notes: 'Contato cadastrado automaticamente via mensagem WhatsApp.',
        score: 40,
        totalPurchased: 0,
        firstContactAt: new Date().toISOString(),
        lastContactAt: new Date().toISOString()
      };
      set((s) => ({ contacts: [...s.contacts, contact!] }));
    } else {
      set((s) => ({
        contacts: s.contacts.map((c) =>
          c.id === contact!.id ? { ...c, lastContactAt: new Date().toISOString() } : c
        )
      }));
    }

    // 2. Locate or create conversation
    let conv = state.conversations.find((c) => c.contactId === contact!.id && c.status !== 'closed');
    const isNewConversation = !conv;

    if (!conv) {
      conv = {
        id: `conv-${Date.now()}`,
        tenantId: state.currentTenantId,
        contactId: contact.id,
        assignedUserId: null,
        departmentId: null,
        status: 'new',
        unreadCount: 0,
        slaLimitAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min SLA
        claimedAt: null,
        waitStartedAt: new Date().toISOString(),
        aiLeadScore: 40,
        aiLeadLabel: 'frio',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
      };
    }

    // Simulate AI lead score increments based on content
    const lowerBody = body.toLowerCase();
    let scoreAddition = 5;
    if (lowerBody.includes('preço') || lowerBody.includes('valor') || lowerBody.includes('comprar')) {
      scoreAddition = 25;
    } else if (lowerBody.includes('boleto') || lowerBody.includes('pagamento') || lowerBody.includes('pix')) {
      scoreAddition = 15;
    } else if (lowerBody.includes('conserto') || lowerBody.includes('garantia') || lowerBody.includes('quebrou')) {
      scoreAddition = 10;
    }

    const currentScore = conv.aiLeadScore || 40;
    const finalScore = Math.min(100, currentScore + scoreAddition);
    let finalLabel: 'quente' | 'morno' | 'frio' = 'frio';
    if (finalScore >= 75) finalLabel = 'quente';
    else if (finalScore >= 50) finalLabel = 'morno';

    const newMessage: Message = {
      id: `m-cust-${Date.now()}`,
      conversationId: conv.id,
      senderType: 'contact',
      senderName: contact.name,
      body,
      type: 'text',
      isRead: false,
      createdAt: new Date().toISOString()
    };

    const updatedMessages = [...conv.messages, newMessage];
    const newConv: Conversation = {
      ...conv,
      unreadCount: conv.unreadCount + 1,
      waitStartedAt: conv.assignedUserId === null && !conv.waitStartedAt ? new Date().toISOString() : conv.waitStartedAt,
      aiLeadScore: finalScore,
      aiLeadLabel: finalLabel,
      updatedAt: new Date().toISOString(),
      messages: updatedMessages
    };

    // If new conversation, append to list, else update existing
    if (isNewConversation) {
      set((s) => ({ conversations: [newConv, ...s.conversations] }));
    } else {
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === newConv.id ? newConv : c))
      }));
    }

    // Play soft notification sound if ticket falls into queue (unassigned)
    if (newConv.assignedUserId === null) {
      playNotificationSound();
    }

    // 3. Automation Flow Engine Check
    const activeSession = state.flowSessions.find(
      (fs) => fs.conversationId === newConv.id && fs.status === 'active'
    );

    if (activeSession) {
      // Advance Flow Session
      const flow = state.flows.find(f => f.id === activeSession.flowId);
      if (flow) {
        const currentNode = flow.nodes.find(n => n.id === activeSession.currentNodeId);
        if (currentNode && currentNode.type === 'question') {
          // Check edge condition matches input option
          const targetEdge = flow.edges.find(
            e => e.sourceNodeId === currentNode.id && e.conditionValue === body.trim()
          );

          if (targetEdge) {
            // Found matched edge, advance session
            const nextNode = flow.nodes.find(n => n.id === targetEdge.targetNodeId);
            if (nextNode) {
              set((s) => ({
                flowSessions: s.flowSessions.map(fs =>
                  fs.id === activeSession.id ? { ...fs, currentNodeId: nextNode.id } : fs
                )
              }));
              // Execute node action
              get().executeNode(newConv.id, flow, nextNode);
              return;
            }
          } else {
            // Invalid answer, repeat menu
            const repeatMessage: Message = {
              id: `m-flow-${Date.now()}`,
              conversationId: newConv.id,
              senderType: 'automation',
              senderName: 'Atendente HBFlow',
              body: 'Opção inválida. Por favor, responda com uma das opções válidas do menu acima.',
              type: 'text',
              isRead: true,
              createdAt: new Date().toISOString()
            };
            set((s) => ({
              conversations: s.conversations.map(c =>
                c.id === newConv.id ? { ...c, messages: [...c.messages, repeatMessage] } : c
              )
            }));
            return;
          }
        }
      }
    }

    // 4. Intelligent Routing / Keyword Check (if not in active flow)
    let matchedDeptId: string | null = null;
    let matchedReason = 'Entrada geral';
    const bodyLower = body.toLowerCase();

    // Key phrase sets
    const salesKeywords = ['preço', 'orçamento', 'comprar', 'produto', 'promoção', 'vendedor', '1'];
    const financeKeywords = ['boleto', 'pagamento', 'dívida', 'cobrança', 'pix', '2'];
    const maintenanceKeywords = ['quebrou', 'defeito', 'arrumar', 'manutenção', 'garantia', '3'];

    let predictedIntent = 'Atendimento Geral';
    let confidence = 75;
    if (salesKeywords.some((k) => bodyLower.includes(k))) {
      matchedDeptId = 'dept-vendas';
      matchedReason = 'Palavra-chave comercial ("' + salesKeywords.find(k => bodyLower.includes(k)) + '")';
      predictedIntent = 'Setor de Vendas';
      confidence = 94 + Math.floor(Math.random() * 5); // 94-98%
    } else if (financeKeywords.some((k) => bodyLower.includes(k))) {
      matchedDeptId = 'dept-financeiro';
      matchedReason = 'Palavra-chave financeira ("' + financeKeywords.find(k => bodyLower.includes(k)) + '")';
      predictedIntent = 'Setor Financeiro';
      confidence = 91 + Math.floor(Math.random() * 6); // 91-96%
    } else if (maintenanceKeywords.some((k) => bodyLower.includes(k))) {
      matchedDeptId = 'dept-manutencao';
      matchedReason = 'Palavra-chave manutenção ("' + maintenanceKeywords.find(k => bodyLower.includes(k)) + '")';
      predictedIntent = 'Setor de Manutenção';
      confidence = 95 + Math.floor(Math.random() * 4); // 95-98%
    }

    if (matchedDeptId) {
      const dept = state.departments.find((d) => d.id === matchedDeptId);
      const logEntry: RoutingLog = {
        id: `log-${Date.now()}`,
        conversationId: newConv.id,
        contactName: contact.name,
        departmentName: dept?.name || null,
        assignedUserName: null,
        routingReason: `${matchedReason} | IA Intent: ${predictedIntent} (${confidence}% de confiança)`,
        createdAt: new Date().toISOString()
      };

      // Add auto signature notification & route
      set((s) => ({
        routingLogs: [logEntry, ...s.routingLogs],
        conversations: s.conversations.map((c) => {
          if (c.id === newConv.id) {
            const systemMsg: Message = {
              id: `m-sys-${Date.now()}`,
              conversationId: c.id,
              senderType: 'system',
              senderName: 'Roteamento Inteligente',
              body: `Conversa direcionada ao setor ${dept?.name} por: ${matchedReason}`,
              type: 'text',
              isRead: true,
              createdAt: new Date().toISOString()
            };
            return {
              ...c,
              departmentId: matchedDeptId,
              messages: [...c.messages, systemMsg]
            };
          }
          return c;
        })
      }));

      // Apply default department tag
      get().updateContact(contact.id, {
        tags: Array.from(new Set([...contact.tags, dept!.name.toLowerCase()]))
      });

      // Automated assignment logic based on Department settings (routing only to online presence agents)
      if (dept && dept.distributionMode !== 'manual') {
        let assignedUser: User | null = null;
        const onlineUsers = state.users.filter(u => u.presence === 'online' && u.filters.includes(dept.name.toLowerCase()));

        if (onlineUsers.length > 0) {
          if (dept.distributionMode === 'workload') {
            // Find user with least workload
            assignedUser = onlineUsers.reduce((prev, current) => (prev.workload < current.workload) ? prev : current);
          } else {
            // Round-robin / random for simulation
            assignedUser = onlineUsers[Math.floor(Math.random() * onlineUsers.length)];
          }

          if (assignedUser) {
            set((s) => ({
              conversations: s.conversations.map(c => {
                if (c.id === newConv.id) {
                  return {
                    ...c,
                    assignedUserId: assignedUser!.id,
                    status: 'open'
                  };
                }
                return c;
              }),
              users: s.users.map(u => u.id === assignedUser!.id ? { ...u, workload: u.workload + 1 } : u)
            }));
            // Add automatic welcome notification message
            setTimeout(() => {
              const welcomeMsg = dept.greetingMessage || `Olá, aqui é o ${assignedUser?.name}. Como posso ajudar?`;
              get().sendMessage(newConv.id, welcomeMsg, 'automation');
            }, 1000);
          }
        }
      }
    } else {
      // If it doesn't match any keyword, trigger Welcome Flow Session automatically
      if (isNewConversation) {
        get().triggerFlowSession(newConv.id, 'flow-welcome');
      }
    }

    // Trigger AI Agents Orchestrator
    setTimeout(() => {
      get().triggerAgentOrchestrator(
        'message.received',
        { messageBody: body },
        newConv.id,
        contact.id
      );
    }, 200);
  },

  // Helper to run Flow node actions
  executeNode: (conversationId, flow, node) => {
    setTimeout(() => {
      const state = get();
      if (node.type === 'message') {
        const msg: Message = {
          id: `m-flow-${Date.now()}`,
          conversationId,
          senderType: 'automation',
          senderName: 'Atendente HBFlow',
          body: node.config.messageText || '',
          type: 'text',
          isRead: true,
          createdAt: new Date().toISOString()
        };

        set((s) => ({
          conversations: s.conversations.map(c =>
            c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c
          )
        }));

        // Move to the next node if it exists
        const edge = flow.edges.find(e => e.sourceNodeId === node.id);
        if (edge) {
          const nextNode = flow.nodes.find(n => n.id === edge.targetNodeId);
          if (nextNode) {
            set((s) => ({
              flowSessions: s.flowSessions.map(fs =>
                fs.conversationId === conversationId ? { ...fs, currentNodeId: nextNode.id } : fs
              )
            }));
            get().executeNode(conversationId, flow, nextNode);
          }
        }
      } else if (node.type === 'question') {
        const msg: Message = {
          id: `m-flow-${Date.now()}`,
          conversationId,
          senderType: 'automation',
          senderName: 'Atendente HBFlow',
          body: node.config.messageText || 'Por favor escolha uma das opções:',
          type: 'text',
          isRead: true,
          createdAt: new Date().toISOString()
        };
        set((s) => ({
          conversations: s.conversations.map(c =>
            c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c
          )
        }));
      } else if (node.type === 'route_department') {
        const deptId = node.config.departmentId;
        const dept = state.departments.find(d => d.id === deptId);

        set((s) => ({
          conversations: s.conversations.map(c => {
            if (c.id === conversationId) {
              const sysMsg: Message = {
                id: `m-sys-${Date.now()}`,
                conversationId,
                senderType: 'system',
                senderName: 'Roteamento Automático',
                body: `Encaminhado ao setor ${dept?.name} pelo menu de opções.`,
                type: 'text',
                isRead: true,
                createdAt: new Date().toISOString()
              };
              return { ...c, departmentId: deptId || null, messages: [...c.messages, sysMsg] };
            }
            return c;
          }),
          flowSessions: s.flowSessions.map(fs =>
            fs.conversationId === conversationId ? { ...fs, status: 'transferred', currentNodeId: null } : fs
          )
        }));

        // Send routing greeting
        if (dept?.greetingMessage) {
          setTimeout(() => {
            get().sendMessage(conversationId, dept.greetingMessage, 'automation');
          }, 1000);
        }
      } else if (node.type === 'tag_add') {
        const tagName = node.config.tagName;
        const conv = state.conversations.find(c => c.id === conversationId);
        if (conv && tagName) {
          get().updateContact(conv.contactId, {
            tags: Array.from(new Set([...state.contacts.find(c => c.id === conv.contactId)!.tags, tagName]))
          });
        }
      }
    }, 800);
  },

  claimConversation: (conversationId, userId) => {
    const state = get();
    const conv = state.conversations.find((c) => c.id === conversationId);
    const userObj = state.users.find((u) => u.id === userId);

    if (!conv || !userObj) {
      return { success: false, error: 'Dados inválidos' };
    }

    // CONCURRENT TRANSACTION LOCK SIMULATION
    // If already claimed, throw warning
    if (conv.assignedUserId && conv.assignedUserId !== userId) {
      const otherUser = state.users.find((u) => u.id === conv.assignedUserId);
      return {
        success: false,
        error: `O atendimento já foi assumido por ${otherUser?.name} segundos atrás!`
      };
    }

    // Claim successfully
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id === conversationId) {
          const sysMsg: Message = {
            id: `m-sys-${Date.now()}`,
            conversationId,
            senderType: 'system',
            senderName: 'Sistema',
            body: `${userObj.name} assumiu este atendimento.`,
            type: 'text',
            isRead: true,
            createdAt: new Date().toISOString()
          };
          return {
            ...c,
            assignedUserId: userId,
            status: 'open',
            claimedAt: new Date().toISOString(),
            waitStartedAt: null,
            messages: [...c.messages, sysMsg]
          };
        }
        return c;
      }),
      users: s.users.map((u) => (u.id === userId ? { ...u, workload: u.workload + 1 } : u))
    }));

    get().addNotification(
      'Atendimento Vinculado',
      `Você assumiu o chamado de ${state.contacts.find(c => c.id === conv.contactId)?.name}.`,
      'assignment'
    );

    return { success: true };
  },

  transferConversation: (conversationId, targetUserId, targetDeptId) => {
    const state = get();
    const userObj = targetUserId ? state.users.find(u => u.id === targetUserId) : null;
    const deptObj = targetDeptId ? state.departments.find(d => d.id === targetDeptId) : null;

    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id === conversationId) {
          const oldAssignedId = c.assignedUserId;
          let bodyMsg = '';
          if (userObj && deptObj) {
            bodyMsg = `Atendimento transferido para o atendente ${userObj.name} no setor ${deptObj.name}.`;
          } else if (userObj) {
            bodyMsg = `Atendimento transferido para o atendente ${userObj.name}.`;
          } else if (deptObj) {
            bodyMsg = `Atendimento transferido para a fila do setor ${deptObj.name}.`;
          }

          const sysMsg: Message = {
            id: `m-sys-${Date.now()}`,
            conversationId,
            senderType: 'system',
            senderName: 'Sistema',
            body: bodyMsg,
            type: 'text',
            isRead: true,
            createdAt: new Date().toISOString()
          };

          return {
            ...c,
            assignedUserId: targetUserId,
            departmentId: targetDeptId,
            status: targetUserId ? 'open' : 'new',
            messages: [...c.messages, sysMsg]
          };
        }
        return c;
      }),
      users: s.users.map(u => {
        // Adjust workloads
        const conv = state.conversations.find(c => c.id === conversationId);
        if (u.id === targetUserId) return { ...u, workload: u.workload + 1 };
        if (u.id === conv?.assignedUserId) return { ...u, workload: Math.max(0, u.workload - 1) };
        return u;
      })
    }));

    if (userObj) {
      get().addNotification(
        'Atendimento Transferido',
        `Chamado transferido para ${userObj.name}.`,
        'assignment'
      );
    } else {
      // Transferred to general queue
      playNotificationSound();
    }
  },

  takeOverConversation: (conversationId, userId) => {
    const state = get();
    const supervisor = state.users.find(u => u.id === userId);
    const conv = state.conversations.find(c => c.id === conversationId);
    if (!supervisor || !conv) return;

    const oldUserId = conv.assignedUserId;

    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id === conversationId) {
          const sysMsg: Message = {
            id: `m-sys-${Date.now()}`,
            conversationId,
            senderType: 'system',
            senderName: 'Sistema',
            body: `Supervisor ${supervisor.name} assumiu este atendimento (Intervenção).`,
            type: 'text',
            isRead: true,
            createdAt: new Date().toISOString()
          };
          return {
            ...c,
            assignedUserId: userId,
            status: 'open',
            claimedAt: new Date().toISOString(),
            waitStartedAt: null,
            messages: [...c.messages, sysMsg]
          };
        }
        return c;
      }),
      users: s.users.map((u) => {
        if (u.id === userId) return { ...u, workload: u.workload + 1 };
        if (u.id === oldUserId) return { ...u, workload: Math.max(0, u.workload - 1) };
        return u;
      })
    }));

    get().addNotification(
      'Intervenção Efetuada',
      `Você assumiu o chamado de ${state.contacts.find(c => c.id === conv.contactId)?.name}.`,
      'assignment'
    );
  },

  resolveConversation: (conversationId) => {
    const state = get();
    const conv = state.conversations.find(c => c.id === conversationId);
    if (!conv) return;

    // Simulate AI summary generation
    const contactName = state.contacts.find(ct => ct.id === conv.contactId)?.name || 'Cliente';
    const productMentioned = conv.messages.some(m => m.body.toLowerCase().includes('ray-ban') || m.body.toLowerCase().includes('óculos')) ? 'Lentes/Óculos Ray-Ban' : 'Serviços/Suporte Geral';
    const hasPayment = conv.messages.some(m => m.body.toLowerCase().includes('boleto') || m.body.toLowerCase().includes('pagamento') || m.body.toLowerCase().includes('pix')) ? 'Boleto/PIX enviado' : 'Informações prestadas';
    const valueEstimate = productMentioned.includes('Ray-Ban') ? 'R$ 450,00' : 'R$ 150,00';
    
    const aiSummaryText = `### 🤖 RESUMO AUTOMÁTICO IA
**Cliente**: ${contactName}
**Objetivo**: Adquirir ou consertar ${productMentioned.toLowerCase()}.
**Valor Estimado**: ${valueEstimate}
**Resultado**: Atendimento resolvido pelo atendente. ${hasPayment}.
**Próxima Ação**: Realizar follow-up pós-venda em 3 dias.`;

    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id === conversationId) {
          const sysMsg: Message = {
            id: `m-sys-${Date.now()}`,
            conversationId,
            senderType: 'system',
            senderName: 'Sistema',
            body: 'Atendimento finalizado pelo atendente.',
            type: 'text',
            isRead: true,
            createdAt: new Date().toISOString()
          };
          
          const aiMsg: Message = {
            id: `m-ai-${Date.now()}`,
            conversationId,
            senderType: 'system',
            senderName: 'IA Assistente',
            body: aiSummaryText,
            type: 'text',
            isRead: true,
            createdAt: new Date().toISOString()
          };

          return {
            ...c,
            status: 'closed',
            aiSummary: aiSummaryText,
            assignedUserId: null, // clear assignment on closed
            messages: [...c.messages, sysMsg, aiMsg]
          };
        }
        return c;
      }),
      users: s.users.map(u => u.id === conv.assignedUserId ? { ...u, workload: Math.max(0, u.workload - 1) } : u),
      flowSessions: s.flowSessions.map(fs =>
        fs.conversationId === conversationId ? { ...fs, status: 'completed', finishedAt: new Date().toISOString() } : fs
      )
    }));

    // Trigger NPS Survey mock reply
    setTimeout(() => {
      const npsMsg: Message = {
        id: `m-nps-${Date.now()}`,
        conversationId,
        senderType: 'automation',
        senderName: 'Pesquisa HBFlow',
        body: 'Como você avalia nosso atendimento de 0 a 10? Sua opinião é muito importante para nós!',
        type: 'text',
        isRead: true,
        createdAt: new Date().toISOString()
      };
      set((s) => ({
        conversations: s.conversations.map(c =>
          c.id === conversationId ? { ...c, messages: [...c.messages, npsMsg] } : c
        )
      }));
    }, 1000);

    // Trigger AI Agents Orchestrator
    setTimeout(() => {
      get().triggerAgentOrchestrator(
        'conversation.closed',
        { conversationId },
        conversationId,
        conv.contactId
      );
    }, 200);
  },

  // Contact CRM
  updateContact: (contactId, updates) => set((state) => ({
    contacts: state.contacts.map((c) => (c.id === contactId ? { ...c, ...updates } : c))
  })),

  addContact: (contactData) => {
    const newContact: Contact = {
      ...contactData,
      id: `contact-${Date.now()}`,
      firstContactAt: new Date().toISOString(),
      lastContactAt: new Date().toISOString()
    };
    set((s) => ({ contacts: [...s.contacts, newContact] }));
    return newContact;
  },

  // Pipeline CRM
  addDeal: (dealData) => {
    const newDeal: Deal = {
      ...dealData,
      id: `deal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      activities: [{ id: `act-${Date.now()}`, dealId: `deal-${Date.now()}`, type: 'stage_change', content: 'Oportunidade criada no Pipeline.', createdAt: new Date().toISOString() }]
    };
    set((s) => ({
      deals: [...s.deals, newDeal]
    }));

    // Update contact stats
    const contact = get().contacts.find(c => c.id === dealData.contactId);
    if (contact) {
      get().updateContact(dealData.contactId, {
        score: Math.min(100, contact.score + 15)
      });
    }
  },

  moveDeal: (dealId, targetStageId) => {
    const state = get();
    const stage = state.stages.find(s => s.id === targetStageId);
    const deal = state.deals.find(d => d.id === dealId);
    if (!stage || !deal) return;

    const activity: DealActivity = {
      id: `act-${Date.now()}`,
      dealId,
      type: 'stage_change',
      content: `Movido para a etapa: ${stage.name}.`,
      createdAt: new Date().toISOString()
    };

    set((s) => ({
      deals: s.deals.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stageId: targetStageId,
              activities: [activity, ...d.activities]
            }
          : d
      )
    }));

    // Trigger AI Agents Orchestrator
    setTimeout(() => {
      get().triggerAgentOrchestrator(
        'deal.stage_changed',
        { dealId, stageId: targetStageId },
        undefined,
        deal.contactId,
        dealId
      );
    }, 200);
  },

  updateDealStatus: (dealId, status, reason) => {
    const state = get();
    const deal = state.deals.find(d => d.id === dealId);
    if (!deal) return;

    const activity: DealActivity = {
      id: `act-${Date.now()}`,
      dealId,
      type: 'status_change',
      content: `Oportunidade marcada como ${status === 'won' ? 'Ganho' : 'Perdido'}.${reason ? ` Motivo: ${reason}` : ''}`,
      createdAt: new Date().toISOString()
    };

    set((s) => ({
      deals: s.deals.map((d) =>
        d.id === dealId
          ? {
              ...d,
              status,
              lostReason: reason,
              activities: [activity, ...d.activities]
            }
          : d
      )
    }));

    if (status === 'won') {
      const contact = state.contacts.find(c => c.id === deal.contactId);
      if (contact) {
        get().updateContact(deal.contactId, {
          totalPurchased: contact.totalPurchased + deal.value,
          status: 'customer'
        });
      }
    }
  },

  // Departments & Flows
  addDepartment: (dept) => set((s) => ({ departments: [...s.departments, dept] })),
  updateDepartment: (deptId, updates) => set((s) => ({
    departments: s.departments.map(d => d.id === deptId ? { ...d, ...updates } : d)
  })),

  addFlow: (flow) => set((s) => ({ flows: [...s.flows, flow] })),
  updateFlow: (flowId, updates) => set((s) => ({
    flows: s.flows.map(f => f.id === flowId ? { ...f, ...updates } : f)
  })),

  triggerFlowSession: (conversationId, flowId) => {
    const state = get();
    const conv = state.conversations.find(c => c.id === conversationId);
    if (!conv) return;

    // Create flow session
    const flow = state.flows.find(f => f.id === flowId);
    if (!flow) return;

    const session: FlowSession = {
      id: `session-${Date.now()}`,
      flowId,
      conversationId,
      contactId: conv.contactId,
      currentNodeId: 'node-start',
      status: 'active',
      context: {}
    };

    set((s) => ({
      flowSessions: [session, ...s.flowSessions]
    }));

    // Execute start node
    const startNode = flow.nodes.find(n => n.id === 'node-start');
    if (startNode) {
      get().executeNode(conversationId, flow, startNode);
    }
  },

  // Tasks
  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      status: 'pending'
    };
    set((s) => ({ tasks: [newTask, ...s.tasks] }));
  },

  toggleTask: (taskId) => set((s) => ({
    tasks: s.tasks.map(t => t.id === taskId ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t)
  })),

  // Notifications
  addNotification: (title, message, type) => {
    const newNot: Notification = {
      id: `not-${Date.now()}`,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    set((s) => ({ notifications: [newNot, ...s.notifications] }));
  },

  markNotificationRead: (id) => set((s) => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
  })),

  clearNotifications: () => set({ notifications: [] }),

  // AI Agents actions implementation
  toggleAgent: (agentId) => set((s) => ({
    enabledAgentIds: s.enabledAgentIds.includes(agentId)
      ? s.enabledAgentIds.filter(id => id !== agentId)
      : [...s.enabledAgentIds, agentId]
  })),

  clearAgentLogs: () => set({ agentLogs: [] }),

  runAgentManually: async (agentId, input) => {
    const state = get();
    const agent = agentRegistry.find(a => a.id === agentId);
    if (!agent) throw new Error("Agente não encontrado no registry");
    
    const activeTenant = state.tenants.find(t => t.id === state.currentTenantId) || state.tenants[0];
    const tenantPlan = (activeTenant?.plan || 'starter') as any;

    const stateAccess = {
      getContact: (id: string) => get().contacts.find(c => c.id === id),
      getConversation: (id: string) => get().conversations.find(c => c.id === id),
      getDeal: (id: string) => get().deals.find(d => d.id === id),
      getMessages: (convId: string) => get().conversations.find(c => c.id === convId)?.messages || [],
      getDepartments: () => get().departments,
      getUsers: () => get().users,
      getWhatsappConnectionStatus: () => get().whatsappConnection.status
    };

    const startTime = Date.now();
    try {
      const result = await agent.execute(input, {
        tenantId: state.currentTenantId,
        currentUserId: state.currentUserId,
        state: stateAccess
      });
      const durationMs = Date.now() - startTime;

      const log = createAgentLog(
        state.currentTenantId,
        agent.id,
        agent.name,
        "manual.run",
        result.success,
        result.confidence || 0.85,
        result.actions?.length || 0,
        result.cost?.estimatedCost || 0.0001,
        durationMs,
        JSON.stringify(input),
        result.success ? JSON.stringify(result.output || {}) : result.error || 'Falha manual'
      );

      set((s) => ({ agentLogs: [log, ...s.agentLogs] }));
      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const log = createAgentLog(
        state.currentTenantId,
        agent.id,
        agent.name,
        "manual.run",
        false,
        0,
        0,
        0,
        durationMs,
        JSON.stringify(input),
        err?.message || 'Erro de execução'
      );
      set((s) => ({ agentLogs: [log, ...s.agentLogs] }));
      throw err;
    }
  },

  triggerAgentOrchestrator: async (trigger, input, conversationId, contactId, dealId) => {
    const state = get();
    const activeTenant = state.tenants.find(t => t.id === state.currentTenantId) || state.tenants[0];
    const tenantPlan = (activeTenant?.plan || 'starter') as any;

    const stateAccess = {
      getContact: (id: string) => get().contacts.find(c => c.id === id),
      getConversation: (id: string) => get().conversations.find(c => c.id === id),
      getDeal: (id: string) => get().deals.find(d => d.id === id),
      getMessages: (convId: string) => get().conversations.find(c => c.id === convId)?.messages || [],
      getDepartments: () => get().departments,
      getUsers: () => get().users,
      getWhatsappConnectionStatus: () => get().whatsappConnection.status
    };

    // Executa o novo Orquestrador Hierárquico de Produção (Sprint 1 & 2)
    const workforceResults = await aiWorkforceOrchestrator.triggerWorkforceEvent(
      trigger,
      {
        tenantId: state.currentTenantId,
        tenantPlan,
        currentUserId: state.currentUserId,
        conversationId,
        contactId,
        dealId,
        messageBody: typeof input === 'string' ? input : input?.messageBody || '',
        state: stateAccess
      }
    );

    // Converte os resultados do Workforce em Logs de Auditoria para exibição administrativa
    const newLogs = workforceResults.map(res => {
      const agentObj = agentRegistry.find(a => a.id === res.agentId);
      return createAgentLog(
        state.currentTenantId,
        res.agentId,
        agentObj?.name || res.agentId,
        trigger,
        res.success,
        res.confidence || 0.85,
        res.actions?.length || 0,
        res.cost?.estimatedCost || 0.0001,
        250, // Latência média
        JSON.stringify(input),
        res.success ? JSON.stringify(res.output || {}) : res.error || 'Falha na execução'
      );
    });

    if (newLogs.length > 0) {
      set((s) => ({ agentLogs: [...newLogs, ...s.agentLogs] }));
    }

    // Apply returned actions sequentially
    for (const action of workforceResults.flatMap(r => r.actions || [])) {
      switch (action.type) {
        case 'apply_tag': {
          const resolvedContactId = contactId || get().conversations.find(c => c.id === conversationId)?.contactId;
          if (resolvedContactId) {
            const contactObj = get().contacts.find(c => c.id === resolvedContactId);
            if (contactObj) {
              get().updateContact(resolvedContactId, {
                tags: Array.from(new Set([...contactObj.tags, action.tag]))
              });
            }
          }
          break;
        }
        case 'route_to_department':
          if (conversationId) {
            get().transferConversation(conversationId, null, action.departmentId);
          }
          break;
        case 'assign_to_user':
          if (conversationId) {
            get().transferConversation(conversationId, action.userId, null);
          }
          break;
        case 'create_deal': {
          const resolvedContactId = contactId || get().conversations.find(c => c.id === conversationId)?.contactId;
          if (resolvedContactId) {
            get().addDeal({
              contactId: resolvedContactId,
              stageId: 'stage-1',
              assignedUserId: get().currentUserId,
              title: action.payload.title,
              value: action.payload.value,
              probability: 50,
              origin: 'Agente Inteligente IA',
              products: action.payload.products || 'Consulta',
              expectedClose: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'open',
              notes: 'Negócio criado automaticamente por agente de IA.'
            });
          }
          break;
        }
        case 'create_task': {
          const resolvedContactId = contactId || get().conversations.find(c => c.id === conversationId)?.contactId;
          get().addTask({
            contactId: resolvedContactId || null,
            dealId: dealId || null,
            assignedUserId: get().currentUserId,
            title: action.payload.title,
            type: 'follow_up',
            dueAt: new Date(Date.now() + action.payload.dueInDays * 24 * 60 * 60 * 1000).toISOString(),
            priority: action.payload.priority,
            notes: action.payload.notes
          });
          break;
        }
        case 'send_message':
          if (conversationId) {
            get().sendMessage(conversationId, action.text, 'automation');
          }
          break;
        case 'create_internal_note':
          if (conversationId) {
            get().sendInternalNote(conversationId, action.text);
          }
          break;
        case 'notify_user':
          get().addNotification(
            'Alerta IA',
            action.text,
            'system'
          );
          break;
        case 'notify_role':
          get().addNotification(
            `Alerta IA (${action.role})`,
            action.text,
            'system'
          );
          break;
        case 'update_contact_score': {
          const resolvedContactId = contactId || get().conversations.find(c => c.id === conversationId)?.contactId;
          if (resolvedContactId) {
            const cObj = get().contacts.find(c => c.id === resolvedContactId);
            if (cObj) {
              get().updateContact(resolvedContactId, {
                score: Math.min(100, Math.max(0, cObj.score + action.score))
              });
            }
          }
          break;
        }
        case 'update_deal_stage':
          get().moveDeal(action.dealId, action.stageId);
          break;
        case 'escalate_conversation':
          if (conversationId) {
            get().transferConversation(conversationId, null, 'dept-manutencao'); 
            get().addNotification(
              'Escalonamento de Chamado',
              `Conversa escalada pela IA: ${action.reason}`,
              'sla'
            );
          }
          break;
      }
    }
  }
}));
