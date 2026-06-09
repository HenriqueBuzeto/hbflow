/**
 * HBFlow AI Workforce Context Resolver
 * Consolida dados operacionais do CRM, Inbox e Tenant em objetos
 * estruturados para alimentar a camada de raciocínio das IAs.
 */

export interface UnifiedAgentContext {
  tenantId: string;
  tenantName: string;
  plan: 'starter' | 'pro' | 'enterprise';
  currentUser: {
    id: string;
    name: string;
    role: string;
  } | null;
  contact: {
    id: string;
    name: string;
    phone: string;
    score: number;
    tags: string[];
  } | null;
  conversation: {
    id: string;
    status: string;
    assignedUserId: string | null;
    messages: Array<{
      senderType: string;
      body: string;
      createdAt: string;
    }>;
  } | null;
  timestamp: string;
}

export class WorkforceContextResolver {
  /**
   * Resolve e unifica todos os dados contextuais disponíveis a partir do estado do sistema
   */
  static resolve(state: any, params: {
    tenantId: string;
    userId: string;
    contactId?: string;
    conversationId?: string;
  }): UnifiedAgentContext {
    const activeTenant = state.getDepartments ? null : state.tenants?.find((t: any) => t.id === params.tenantId);
    
    // Resolve dados do Usuário
    const userObj = state.users?.find((u: any) => u.id === params.userId) || null;
    
    // Resolve dados do Contato
    const contactObj = params.contactId ? state.contacts?.find((c: any) => c.id === params.contactId) : null;
    
    // Resolve dados da Conversa e mensagens
    let conversationObj = null;
    if (params.conversationId) {
      const conv = state.conversations?.find((c: any) => c.id === params.conversationId);
      if (conv) {
        conversationObj = {
          id: conv.id,
          status: conv.status,
          assignedUserId: conv.assignedUserId,
          messages: (conv.messages || []).map((m: any) => ({
            senderType: m.senderType,
            body: m.body,
            createdAt: m.createdAt || new Date().toISOString()
          }))
        };
      }
    }

    return {
      tenantId: params.tenantId,
      tenantName: activeTenant?.name || 'Default Tenant',
      plan: activeTenant?.plan || 'starter',
      currentUser: userObj ? { id: userObj.id, name: userObj.name, role: userObj.role } : null,
      contact: contactObj ? {
        id: contactObj.id,
        name: contactObj.name,
        phone: contactObj.phone,
        score: contactObj.score,
        tags: contactObj.tags || []
      } : null,
      conversation: conversationObj,
      timestamp: new Date().toISOString()
    };
  }
}
