'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  Bot, 
  TrendingUp, 
  ShieldAlert, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Zap,
  Users,
  Kanban,
  Settings,
  CreditCard
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'geral' | 'chatbot' | 'ia' | 'atendimento';
  question: string;
  answer: React.ReactNode;
}

export default function AjudaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'geral' | 'chatbot' | 'ia' | 'atendimento'>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const guideCards = [
    {
      title: 'Configuração de Conexão (Evolution API)',
      icon: Zap,
      description: 'Como conectar suas instâncias do WhatsApp via Evolution API. Instruções para leitura de QR Code, reconexão automática e gestão de status.',
      steps: [
        'Acesse a página de "Conexões" no menu de administração.',
        'Selecione a instância ou clique para gerar um novo QR Code.',
        'Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código.',
        'Mantenha seu telefone conectado à internet para garantir a estabilidade do serviço.'
      ],
      color: 'from-blue-600 to-indigo-600',
      shadowColor: 'shadow-blue-500/10'
    },
    {
      title: 'Gestão de Filas & Fluxos de Chatbot',
      icon: Kanban,
      description: 'Como parametrizar o roteador automático de mensagens, estruturando departamentos, caminhos condicionais e transição para atendentes humanos.',
      steps: [
        'Acesse o construtor visual em "Filas & Chatbot".',
        'Configure o nó inicial de boas-vindas com opções numeradas (Ex: 1 para Vendas, 2 for Suporte).',
        'Crie nós de conexão para cada setor e associe os atendentes correspondentes.',
        'Selecione se um transbordo (retorno ao menu anterior ou humano) deve ocorrer após inatividade.'
      ],
      color: 'from-purple-600 to-pink-600',
      shadowColor: 'shadow-purple-500/10'
    },
    {
      title: 'Agentes Inteligentes de IA',
      icon: Bot,
      description: 'Instruções para treinar seus chatbots de Inteligência Artificial usando comportamento customizado, regras de contexto e base de conhecimento.',
      steps: [
        'Crie um novo agente em "Agentes IA" selecionando o modelo (ex: GPT-4o, Claude).',
        'Defina a Persona do agente (Ex: "Você é o atendente de suporte da HBFlow, cordial e ágil").',
        'Insira documentos de conhecimento, FAQs e links úteis no campo de contexto do agente.',
        'Ative o agente em um fluxo específico ou como atendente de primeiro nível.'
      ],
      color: 'from-emerald-600 to-teal-600',
      shadowColor: 'shadow-emerald-500/10'
    },
    {
      title: 'Atendimentos & Painel Omnichannel',
      icon: MessageSquare,
      description: 'Como operar a tela de Atendimentos diários, interagir com clientes, transferir atendimentos, enviar mídias e usar respostas rápidas.',
      steps: [
        'Acesse o "Painel de Atendimentos" ou o "Kanban" operacional.',
        'Clique em "Puxar" ou clique na conversa na lista de pendentes para iniciar um chat.',
        'Use atalhos de Respostas Rápidas para agilizar o tempo médio de resposta.',
        'Ao concluir, clique em "Resolver" para mover o contato ao histórico ou arquivar.'
      ],
      color: 'from-amber-600 to-orange-600',
      shadowColor: 'shadow-amber-500/10'
    }
  ];

  const faqItems: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'geral',
      question: 'Como funciona o período de teste grátis (Trial)?',
      answer: (
        <p>
          Novas contas cadastradas sem cupom de desconto ganham automaticamente <strong>3 dias de teste gratuito</strong> com recursos completos (Plano Pro).
          Sua fatura inicial é criada no estado <code>Em Aberto</code>, mas o vencimento dela é definido para o <strong>último dia do seu teste grátis</strong>.
          Se o pagamento não for efetuado até o término do prazo, o sistema suspenderá temporariamente os disparos e conexões até que a ativação seja concluída via InfinitePay.
        </p>
      )
    },
    {
      id: 'faq-2',
      category: 'chatbot',
      question: 'Como transferir um cliente do robô para um atendente humano?',
      answer: (
        <p>
          No construtor visual de <strong>Filas & Chatbot</strong>, você pode criar uma opção ou ação direcionando para um setor/fila específico.
          Quando o cliente seleciona essa opção, a conversa sai do fluxo automático de chatbot e entra na aba de <strong>Pendentes</strong> do painel dos operadores humanos associados àquela fila.
          Qualquer atendente da fila pode clicar em "Puxar Atendimento" para iniciar a conversa humana direta.
        </p>
      )
    },
    {
      id: 'faq-3',
      category: 'ia',
      question: 'Qual o limite de gastos dos Agentes de IA?',
      answer: (
        <p>
          Para evitar surpresas no final do mês com APIs externas (OpenAI/Anthropic), o HBFlow possui controle de <strong>Governança de Custos de IA</strong>.
          Cada empresa (Tenant) possui um limite de gasto mensal configurável. Se o consumo de tokens atingir esse limite, as respostas inteligentes do chatbot serão pausadas preventivamente e o chatbot entrará em modo de contingência humana.
        </p>
      )
    },
    {
      id: 'faq-4',
      category: 'atendimento',
      question: 'Como funciona o envio de mensagens em lote (Campanhas)?',
      answer: (
        <p>
          As campanhas permitem o disparo em massa para listas de contatos selecionadas por tags.
          Para proteger seu número contra banimentos e spam, recomendamos configurar <strong>intervalos de atraso dinâmicos (delay)</strong> entre os disparos (mínimo de 15 a 30 segundos) e evitar o uso de contas recém-criadas sem aquecimento prévio.
        </p>
      )
    },
    {
      id: 'faq-5',
      category: 'geral',
      question: 'Como confirmar a ativação do meu pagamento?',
      answer: (
        <p>
          Nosso checkout é integrado em tempo real com a <strong>InfinitePay</strong>. Assim que você realiza o pagamento por Pix ou Cartão de Crédito,
          a API da InfinitePay notifica nosso webhook instantaneamente. O status da sua fatura e da sua assinatura muda para <code>Ativo</code>
          imediatamente, liberando o acesso total à plataforma.
        </p>
      )
    }
  ];

  const filteredFaqs = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (typeof item.answer === 'string' && item.answer.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTab = activeTab === 'todos' || item.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8 font-sans always-dark max-w-7xl mx-auto space-y-10 pb-16">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-4 max-w-2xl text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles size={13} className="animate-pulse" /> Central de Conhecimento HBFlow
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Central de Ajuda & Documentação
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Consulte manuais operacionais completos, guias dinâmicos de configuração do WhatsApp e tire suas dúvidas sobre cobranças, campanhas e agentes de Inteligência Artificial.
          </p>
        </div>
        <div className="relative shrink-0 w-36 h-36 md:w-44 md:h-44 bg-indigo-500/5 rounded-full flex items-center justify-center border border-indigo-500/10 shadow-inner">
          <HelpCircle size={80} className="text-primary/70 animate-pulse" />
        </div>
      </div>

      {/* Manual & Guides Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="text-primary" size={22} />
          <h2 className="text-lg font-bold text-white">Manuais de Configuração e Uso</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {guideCards.map((card, idx) => {
            const IconComponent = card.icon;
            return (
              <div 
                key={idx} 
                className={`bg-slate-950 border border-slate-800/80 rounded-2xl p-6 shadow-lg hover:border-slate-700/60 transition-all duration-300 flex flex-col justify-between group ${card.shadowColor}`}
              >
                <div className="space-y-4">
                  {/* Top Header */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-md`}>
                      <IconComponent size={20} />
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {card.description}
                  </p>

                  {/* Steps List */}
                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Passo a Passo</span>
                    <ol className="space-y-2">
                      {card.steps.map((step, sIdx) => (
                        <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                          <span className="shrink-0 w-4 h-4 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-center border border-slate-750">
                            {sIdx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Frequently Asked Questions (FAQ) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="text-primary" size={22} />
            <h2 className="text-lg font-bold text-white">Dúvidas Frequentes (FAQ)</h2>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-2.5 text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Buscar na base de conhecimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'todos', name: 'Todos' },
            { id: 'geral', name: 'Cobrança & Conta' },
            { id: 'chatbot', name: 'Fluxos & Chatbot' },
            { id: 'ia', name: 'Inteligência Artificial' },
            { id: 'atendimento', name: 'Painel Omnichannel' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/15'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="bg-slate-950 border border-slate-850 p-12 text-center rounded-2xl">
              <span className="text-xs text-slate-500">Nenhum resultado encontrado para a busca. Tente buscar outros termos.</span>
            </div>
          ) : (
            filteredFaqs.map(faq => {
              const isExpanded = expandedId === faq.id;
              return (
                <div 
                  key={faq.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden hover:border-slate-700/60 transition-colors"
                >
                  <button
                    onClick={() => toggleExpand(faq.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-white hover:bg-slate-900/40 transition-colors focus:outline-none"
                  >
                    <span>{faq.question}</span>
                    <span className="text-slate-400 shrink-0">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-6 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-900 bg-slate-900/25">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Help Contacts Footer */}
      <div className="bg-gradient-to-br from-indigo-950/20 via-slate-950 to-slate-950 border border-indigo-900/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h4 className="text-sm font-bold text-white">Não encontrou o que procurava?</h4>
          <p className="text-xs text-slate-400">Entre em contato direto com o nosso time de suporte técnico.</p>
        </div>
        <a 
          href="https://wa.me/5511999999999" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-2"
        >
          Falar com Suporte Técnico
        </a>
      </div>

    </div>
  );
}
