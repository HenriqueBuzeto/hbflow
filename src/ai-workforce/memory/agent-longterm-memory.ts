/**
 * HBFlow Agent Long-Term Memory Manager
 * Responsável pela extração e recuperação de fatos semânticos cruzados de contatos,
 * permitindo que agentes de IA se lembrem de detalhes declarados dias atrás
 * sem processar todo o histórico de conversas antigas.
 */

import { useStore } from '@/store/useStore';

export interface MemoryFact {
  id: string;
  contactId: string;
  key: string;
  value: string;
  updatedAt: string;
}

class AgentLongTermMemoryManager {
  private localMemoryStore: Map<string, Map<string, MemoryFact>> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hbflow_agent_longterm_memory');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.keys(parsed).forEach((contactId) => {
            const innerMap = new Map<string, MemoryFact>();
            Object.keys(parsed[contactId]).forEach((key) => {
              innerMap.set(key, parsed[contactId][key]);
            });
            this.localMemoryStore.set(contactId, innerMap);
          });
        }
      } catch (e) {
        console.warn('[Memory] Falha ao carregar memória de longo prazo:', e);
      }
    }
  }

  private persistToStorage() {
    if (typeof window !== 'undefined') {
      try {
        const obj: Record<string, Record<string, MemoryFact>> = {};
        this.localMemoryStore.forEach((innerMap, contactId) => {
          obj[contactId] = {};
          innerMap.forEach((fact, key) => {
            obj[contactId][key] = fact;
          });
        });
        localStorage.setItem('hbflow_agent_longterm_memory', JSON.stringify(obj));
      } catch (e) {
        console.warn('[Memory] Falha ao persistir memória de longo prazo:', e);
      }
    }
  }

  /**
   * Salva um fato/preferência extraída sobre o contato
   */
  async setFact(tenantId: string, contactId: string, key: string, value: string): Promise<MemoryFact> {
    const factId = `fact_${Math.random().toString(36).substring(2, 9)}`;
    const newFact: MemoryFact = {
      id: factId,
      contactId,
      key,
      value,
      updatedAt: new Date().toISOString()
    };

    if (!this.localMemoryStore.has(contactId)) {
      this.localMemoryStore.set(contactId, new Map());
    }

    this.localMemoryStore.get(contactId)!.set(key, newFact);
    this.persistToStorage();

    console.log(`[Agent Memory] Fato registrado para contato ${contactId}: "${key}" = "${value}"`);
    return newFact;
  }

  /**
   * Retorna todos os fatos aprendidos sobre um contato
   */
  getFacts(contactId: string): MemoryFact[] {
    const innerMap = this.localMemoryStore.get(contactId);
    if (!innerMap) return [];
    return Array.from(innerMap.values());
  }

  /**
   * Compila os fatos de memória de longo prazo em uma string estruturada para injetar no Prompt da LLM
   */
  compileMemoryPrompt(contactId: string): string {
    const facts = this.getFacts(contactId);
    if (facts.length === 0) return '';

    let prompt = '\n--- MEMÓRIA DE LONGO PRAZO DO CLIENTE ---\n';
    prompt += 'Você se lembra dos seguintes fatos declarados anteriormente por este cliente:\n';
    facts.forEach((f) => {
      prompt += `- ${f.key}: ${f.value}\n`;
    });
    prompt += '-----------------------------------------\n';
    return prompt;
  }

  /**
   * Analisa mensagens recebidas para auto-extrair fatos (Heurística simples local, em produção rodaria via LLM)
   */
  autoExtractFacts(tenantId: string, contactId: string, messageBody: string): void {
    const bodyLower = messageBody.toLowerCase();
    
    // Nome do cliente
    if (bodyLower.startsWith('meu nome é ') || bodyLower.startsWith('me chamo ')) {
      const name = messageBody.substring(10).trim();
      if (name) this.setFact(tenantId, contactId, 'nome_cliente', name);
    }
    
    // Preferência de pagamento
    if (bodyLower.includes('prefiro pagar por') || bodyLower.includes('forma de pagamento')) {
      if (bodyLower.includes('pix')) this.setFact(tenantId, contactId, 'forma_pagamento_preferida', 'PIX');
      else if (bodyLower.includes('cartao') || bodyLower.includes('cartão')) this.setFact(tenantId, contactId, 'forma_pagamento_preferida', 'Cartão de Crédito');
      else if (bodyLower.includes('boleto')) this.setFact(tenantId, contactId, 'forma_pagamento_preferida', 'Boleto Bancário');
    }

    // Interesse em produtos
    if (bodyLower.includes('interessado em') || bodyLower.includes('quero comprar') || bodyLower.includes('gostaria de ver o')) {
      if (bodyLower.includes('ray-ban') || bodyLower.includes('rayban')) {
        this.setFact(tenantId, contactId, 'interesse_produto', 'Óculos Ray-Ban Clássico');
      } else if (bodyLower.includes('lente') || bodyLower.includes('grau')) {
        this.setFact(tenantId, contactId, 'interesse_produto', 'Lentes de Grau / Multifocal');
      }
    }
  }
}

export const agentLongTermMemory = new AgentLongTermMemoryManager();
