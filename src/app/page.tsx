'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Bot,
  Zap,
  Layers,
  Clock,
  TrendingUp,
  Users,
  Check,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Shield,
  MessageCircle,
  Play,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Menu,
  X,
  User,
  Star,
  Cpu,
  ArrowLeft
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  
  // Navigation & Menu States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Stable date for React 19
  const [currentYear] = useState(() => new Date().getFullYear());
  
  // Interactive Pricing State
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  // Interactive FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Interactive Live Chat Demo State
  const [selectedDemoContact, setSelectedDemoContact] = useState(0);
  const [customInputValue, setCustomInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgent, setTypingAgent] = useState('');

  const [demoChats, setDemoChats] = useState([
    {
      name: 'Rodrigo Silva',
      phone: '+55 (11) 99823-1142',
      status: 'Aguardando',
      avatarId: 1,
      agentName: 'SDR Agent',
      messages: [
        { sender: 'client', text: 'Olá, gostaria de saber se o sistema de vocês atende minha empresa. Preciso de um orçamento.', time: '14:20' },
        { sender: 'bot', agent: 'Triage Agent', text: 'Detectado: Intenção de Orçamento / Departamento Comercial. Encaminhando para SDR...', time: '14:21' },
        { sender: 'bot', agent: 'SDR Agent', text: 'Olá Rodrigo! Sou o SDR do HBFlow. Com certeza atendemos! Qual é o segmento da sua empresa e quantos atendentes vocês têm hoje?', time: '14:21' },
        { sender: 'client', text: 'Temos uma imobiliária com 5 corretores.', time: '14:22' }
      ]
    },
    {
      name: 'Mateus Oliveira',
      phone: '+55 (21) 98777-3300',
      status: 'Faturamento',
      avatarId: 2,
      agentName: 'Billing Agent',
      messages: [
        { sender: 'client', text: 'Boa tarde, meu boleto venceu ontem. Podem mandar a segunda via?', time: '10:05' },
        { sender: 'bot', agent: 'Triage Agent', text: 'Detectado: Faturamento / Financeiro. Acionando Billing Agent...', time: '10:06' },
        { sender: 'bot', agent: 'Billing Agent', text: 'Oi Mateus! Localizei seu contrato aqui. Gerando a segunda via atualizada com vencimento para hoje, sem multas. Só um momento...', time: '10:06' },
        { sender: 'bot', agent: 'Billing Agent', text: 'Aqui está o link para o boleto atualizado: hbflow.com/f/invoice-77291.pdf. Posso te ajudar em mais algo?', time: '10:07' }
      ]
    },
    {
      name: 'Mariana Costa',
      phone: '+55 (31) 99555-8822',
      status: 'Resolvido',
      avatarId: 3,
      agentName: 'Follow-up Agent',
      messages: [
        { sender: 'bot', agent: 'Follow-up Agent', text: 'Oi Mariana! Tudo bem? Vi que enviamos a proposta comercial para a sua clínica na semana passada. Ficou alguma dúvida sobre os agentes de triagem?', time: 'Ontem' },
        { sender: 'client', text: 'Oi! Adoramos a apresentação. Faltou só alinhar com o diretor financeiro. Ele vai aprovar hoje à tarde!', time: 'Ontem' },
        { sender: 'bot', agent: 'Follow-up Agent', text: 'Excelente! Vou reservar uma vaga de implantação prioritária para vocês. Assim que aprovarem, me avisa por aqui que o Supervisor Agent já inicia o setup!', time: 'Ontem' }
      ]
    }
  ]);

  // Handle send message in simulation
  const handleSendSimulationMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputValue.trim() || isTyping) return;

    const userText = customInputValue;
    setCustomInputValue('');

    // 1. Add user message
    const updatedChats = [...demoChats];
    const activeChat = updatedChats[selectedDemoContact];
    
    activeChat.messages.push({
      sender: 'client',
      text: userText,
      time: 'Agora'
    });
    setDemoChats(updatedChats);

    // 2. Trigger typing effect
    setIsTyping(true);
    setTypingAgent(activeChat.agentName);

    setTimeout(() => {
      // Create response based on message content and contact
      let botResponse = '';
      if (selectedDemoContact === 0) {
        botResponse = `Entendido! Para a sua imobiliária, o SDR IA pode qualificar leads interessados em comprar ou alugar imóveis diretamente no WhatsApp e agendar as visitas automáticas no calendário dos corretores. Deseja iniciar um teste gratuito do plano Pro?`;
      } else if (selectedDemoContact === 1) {
        botResponse = `Perfeito, Mateus! Faturamento confirmado. Identifiquei o pagamento no banco e o status da sua assinatura já consta como ativo. Obrigado!`;
      } else {
        botResponse = `Que ótima notícia! Ficamos no aguardo da aprovação. Qualquer dúvida, estou à total disposição por aqui!`;
      }

      activeChat.messages.push({
        sender: 'bot',
        agent: activeChat.agentName,
        text: botResponse,
        time: 'Agora'
      });
      setDemoChats([...updatedChats]);
      setIsTyping(false);
    }, 1500);
  };

  // Scroll event for floating header opacity
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="bg-[#030712] text-slate-100 font-sans min-h-screen relative overflow-x-hidden selection:bg-primary selection:text-white always-dark">
      
      {/* Premium Radial Gradients / Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] -left-20 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[1800px] -right-20 w-[700px] h-[700px] bg-violet-600/5 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute top-[2800px] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* FLOATING HEADER */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/70 backdrop-blur-md border-b border-white/5 py-3 shadow-2xl shadow-black/40' : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-7 object-contain" />
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-350">
            <a href="#como-funciona" className="hover:text-primary transition-colors duration-200">Como Funciona</a>
            <a href="#agentes" className="hover:text-primary transition-colors duration-200">Equipe de IA</a>
            <a href="#simulador" className="hover:text-primary transition-colors duration-200">Simulador</a>
            <a href="#planos" className="hover:text-primary transition-colors duration-200">Planos & Preços</a>
            <button onClick={() => router.push('/agentes')} className="text-primary hover:text-primary-hover font-bold bg-transparent border-none cursor-pointer flex items-center gap-0.5 transition-colors duration-200">
              Catálogo de Agentes <ArrowUpRight size={12} />
            </button>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/login')}
              className="hidden sm:inline-block text-slate-300 hover:text-white text-xs font-bold px-4 py-2 bg-slate-900/40 hover:bg-slate-900 border border-white/5 rounded-xl transition-all cursor-pointer duration-200"
            >
              Entrar
            </button>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(124, 58, 237, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/login')}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-primary/10"
            >
              Teste Grátis
            </motion.button>
            
            {/* Mobile menu trigger */}
            <button className="md:hidden text-slate-300 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="md:hidden absolute top-full left-0 w-full bg-slate-950/95 backdrop-blur-md border-b border-white/5 p-6 flex flex-col gap-4 shadow-xl"
            >
              <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Como Funciona</a>
              <a href="#agentes" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Equipe de IA</a>
              <a href="#simulador" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Simulador</a>
              <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Planos & Preços</a>
              <button onClick={() => { setMobileMenuOpen(false); router.push('/agentes'); }} className="text-left text-sm font-bold text-primary hover:text-primary-hover transition-colors">Catálogo de Agentes</button>
              <hr className="border-white/5 my-1" />
              <button onClick={() => { setMobileMenuOpen(false); router.push('/login'); }} className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3 rounded-xl text-center transition-colors">Começar Agora</button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-36 pb-24 px-6 text-center">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          
          {/* AI Workforce Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary mb-6 uppercase tracking-widest shadow-[0_0_15px_rgba(124, 58, 237, 0.15)]"
          >
            <Sparkles size={11} className="animate-pulse text-primary" />
            <span>AI WORKFORCE LAYER ATIVA</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.08]"
          >
            Transforme seu WhatsApp em uma <span className="bg-gradient-to-r from-primary via-indigo-400 to-violet-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(124,58,237,0.15)]">equipe de vendas com IA</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-400 text-sm md:text-lg mt-6 max-w-2xl leading-relaxed font-medium"
          >
            Atenda, qualifique, venda e faça follow-up automaticamente com agentes inteligentes integrados ao seu WhatsApp e CRM comercial.
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-3.5 mt-9"
          >
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(124, 58, 237, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white text-xs font-bold px-8 py-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
            >
              <span>Criar Conta Grátis</span>
              <ArrowRight size={14} />
            </motion.button>
            
            <motion.a
              whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.98 }}
              href="#simulador"
              className="w-full sm:w-auto border border-white/5 hover:bg-slate-900/40 bg-slate-900/20 text-slate-300 hover:text-white text-xs font-bold px-8 py-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play size={11} fill="currentColor" />
              <span>Ver Simulador</span>
            </motion.a>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-14 text-slate-500 text-[10px] font-bold uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-primary/70" /> Multi-Tenant Isolado</span>
            <span className="flex items-center gap-1.5"><Zap size={12} className="text-primary/70" /> SLA Controlado</span>
            <span className="flex items-center gap-1.5"><Users size={12} className="text-primary/70" /> API Oficial</span>
          </motion.div>
        </div>
      </section>

      {/* COMO FUNCIONA (Timeline Flow Redesign) */}
      <section id="como-funciona" className="py-24 border-t border-white/5 bg-slate-950/20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white">Como Funciona a Operação</h2>
            <p className="text-slate-400 text-xs md:text-sm mt-3 max-w-lg mx-auto font-medium">
              Da primeira mensagem ao pós-venda, veja como a inteligência artificial orquestra o fluxo de atendimento da sua empresa de ponta a ponta:
            </p>
          </div>

          {/* Timeline Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 relative"
          >
            {/* Horizontal Flow Indicator Line for Desktops */}
            <div className="hidden lg:block absolute top-[28px] left-[8%] right-[8%] h-[2px] bg-gradient-to-r from-primary/20 via-indigo-500/20 to-primary/20 -z-10" />

            {[
              { id: '1', title: 'Mensagem do Cliente', desc: 'O cliente inicia contato no WhatsApp.' },
              { id: '2', title: 'Triagem com IA', desc: 'Triage Agent analisa o contexto e identifica a intenção.' },
              { id: '3', title: 'Lead no Banco', desc: 'O contato é registrado automaticamente no CRM.' },
              { id: '4', title: 'Kanban Comercial', desc: 'Abre-se um card no pipeline na etapa correspondente.' },
              { id: '5', title: 'Distribuição Inteligente', desc: 'O chat é direcionado para a fila do atendente ideal.' },
              { id: '6', title: 'Follow-up IA', desc: 'Agente cobra propostas ou faturas em atraso.' }
            ].map((step, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="bg-gradient-to-b from-slate-900/40 to-slate-950/60 border border-white/5 p-5 rounded-2xl flex flex-col items-center md:items-start text-center md:text-left transition-all duration-300 hover:border-primary/20 hover:shadow-[0_8px_30px_rgba(124,58,237,0.06)] hover:-translate-y-1 backdrop-blur-md"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/15 to-indigo-500/15 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary mb-4 shadow-[0_0_10px_rgba(124,58,237,0.1)]">
                  {step.id}
                </div>
                <h3 className="text-xs font-bold text-white mb-2 leading-tight">{step.title}</h3>
                <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* MEET THE AI TEAM (Premium Redesign) */}
      <section id="agentes" className="py-24 border-t border-white/5 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
            <div>
              <h2 className="text-2xl md:text-4xl font-extrabold text-white">Sua Equipe de Agentes de IA</h2>
              <p className="text-slate-400 text-xs md:text-sm mt-2 font-medium">
                Conheça os especialistas que trabalham em segundo plano para otimizar sua empresa:
              </p>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/agentes')}
              className="w-fit border border-white/5 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 transition-colors duration-200"
            >
              <span>Ver Todos os 15 Agentes</span>
              <ArrowUpRight size={13} />
            </motion.button>
          </div>

          {/* Grid of Main 5 Agents */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6"
          >
            {[
              {
                name: '🤖 SDR IA',
                plan: 'pro',
                role: 'Vendas & Qualificação',
                desc: 'Inicia diálogos, responde sobre produtos, coleta dados chave (nome, cidade, prazo) e cria oportunidades qualificadas no CRM comercial.'
              },
              {
                name: '🤖 Follow-up IA',
                plan: 'pro',
                role: 'Fidelização & Cobrança',
                desc: 'Monitora negócios estagnados e envia mensagens cordiais para cobrar propostas ou lembrar clientes de faturas pendentes.'
              },
              {
                name: '🤖 Supervisor IA',
                plan: 'enterprise',
                role: 'Gestão de Fila & SLAs',
                desc: 'Audita o tempo de resposta humana, gerencia a fila e envia alertas aos administradores sobre conversas paradas.'
              },
              {
                name: '🤖 Copilot IA',
                plan: 'enterprise',
                role: 'Suporte ao Atendente',
                desc: 'Analisa o histórico em tempo real e fornece sugestões de resposta inteligentes para os atendentes humanos no chat.'
              },
              {
                name: '🤖 Forecast IA',
                plan: 'enterprise',
                role: 'Previsões & Analytics',
                desc: 'Analisa conversas e o pipeline do Kanban para gerar projeções de faturamento e relatórios gerenciais sobre o funil.'
              }
            ].map((agent, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                className="bg-gradient-to-b from-slate-900/40 to-slate-950/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/20 hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)] hover:-translate-y-1 transition-all duration-300 backdrop-blur-md"
              >
                <div>
                  <div className="flex justify-between items-center mb-3.5">
                    <span className="text-[7.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Plano {agent.plan}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1.5">{agent.name}</h3>
                  <span className="text-[9px] text-primary/90 font-bold block mb-3">{agent.role}</span>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">{agent.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* LIVE SIMULATOR INBOX (Premium Mac Redesign) */}
      <section id="simulador" className="py-24 border-t border-white/5 bg-slate-950/10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white">Simulador Inbox Interativo</h2>
            <p className="text-slate-400 text-xs md:text-sm mt-3 max-w-lg mx-auto font-medium">
              Escolha um contato comercial na barra lateral e simule uma mensagem de cliente para ver o fluxo da IA agir em tempo real:
            </p>
          </div>

          {/* Simulator Container */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 border border-white/5 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 bg-slate-950/40 h-[520px] text-xs backdrop-blur-md"
          >
            
            {/* Sidebar (Contacts) */}
            <div className="bg-slate-950/90 border-r border-white/5 flex flex-col">
              <div className="p-4 border-b border-white/5 bg-slate-950/50 flex items-center justify-between">
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-slate-500 block">Conversas em Fila</span>
                {/* Simulated search icon or filter indicator */}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {demoChats.map((chat, idx) => {
                  const isSelected = selectedDemoContact === idx;
                  const lastMsg = chat.messages[chat.messages.length - 1];
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (isTyping) return;
                        setSelectedDemoContact(idx);
                      }}
                      className={`p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-primary/10 border-l-2 border-primary' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-sm shadow">
                        {chat.avatarId === 1 ? '👔' : chat.avatarId === 2 ? '💳' : '👩'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-white text-[11px] truncate">{chat.name}</span>
                          <span className="text-[8px] text-slate-500 font-semibold">{lastMsg?.time || '10min'}</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 truncate leading-snug font-medium">
                          {lastMsg ? lastMsg.text : 'Sem mensagens'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Area */}
            <div className="col-span-2 flex flex-col bg-slate-955/60 h-full justify-between">
              
              {/* Header with macOS window control dots */}
              <div className="p-4 border-b border-white/5 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* macOS dots */}
                  <div className="flex gap-1.5 mr-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                  </div>
                  
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-xs">
                    {demoChats[selectedDemoContact].avatarId === 1 ? '👔' : demoChats[selectedDemoContact].avatarId === 2 ? '💳' : '👩'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[11px] leading-tight">{demoChats[selectedDemoContact].name}</h4>
                    <span className="text-[8.5px] text-slate-400 font-mono font-medium">{demoChats[selectedDemoContact].phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[8.5px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary shadow-[0_0_10px_rgba(124,58,237,0.1)]">
                    AI ORCHESTRATOR
                  </span>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5 flex flex-col justify-end">
                {demoChats[selectedDemoContact].messages.map((msg, mIdx) => {
                  const isBot = msg.sender === 'bot';
                  const isTriage = msg.agent === 'Triage Agent';

                  return (
                    <div key={mIdx} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-lg ${
                        isBot 
                          ? isTriage 
                            ? 'bg-purple-950/20 border border-purple-900/30 text-purple-300 text-[10px] font-mono leading-relaxed'
                            : 'bg-slate-900 border border-white/5 text-slate-200 text-[11px] leading-relaxed'
                          : 'bg-gradient-to-r from-primary to-indigo-600 text-white text-[11px] leading-relaxed shadow-primary/10'
                      }`}>
                        {isBot && msg.agent && !isTriage && (
                          <span className="text-[8.5px] text-primary font-black block uppercase tracking-wider mb-1 font-sans">
                            🤖 {msg.agent}
                          </span>
                        )}
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  );
                })}

                {/* Typing status indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-3 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <Bot size={12} className="animate-spin text-primary" />
                      <span>{typingAgent} formulando resposta inteligente...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendSimulationMessage} className="p-3 border-t border-white/5 bg-slate-950/90 flex gap-2">
                <input
                  type="text"
                  placeholder="Escreva uma mensagem simulada (ex: 'Quero fechar o plano Pro')..."
                  value={customInputValue}
                  onChange={(e) => setCustomInputValue(e.target.value)}
                  disabled={isTyping}
                  className="flex-1 bg-slate-900 border border-white/5 hover:border-slate-800 focus:border-primary text-slate-100 rounded-xl px-4 py-3 text-xs outline-none transition-all placeholder-slate-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={isTyping}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Enviar
                </button>
              </form>

            </div>
          </motion.div>
        </div>
      </section>

      {/* SEGMENT TARGETS (Ideal Para - Modern Tag Layout) */}
      <section className="py-24 border-t border-white/5 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white">Ideal Para o Seu Negócio</h2>
            <p className="text-slate-400 text-xs md:text-sm mt-3 font-medium">
              O HBFlow se adapta de forma inteligente a diversas verticais comerciais do mercado brasileiro:
            </p>
          </div>

          {/* Segment Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Óticas', desc: 'Agendamento de exames e lembretes.' },
              { label: 'Clínicas & Consultórios', desc: 'Confirmação de consultas e dúvidas.' },
              { label: 'Imobiliárias', desc: 'Qualificação de inquilinos e compradores.' },
              { label: 'Assistências Técnicas', desc: 'Aprovações de orçamento e avisos.' },
              { label: 'Franquias', desc: 'Consolidação de dados de unidades.' },
              { label: 'Vendas B2B / SaaS', desc: 'Triagem de contas e conexão no CRM.' }
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-900/20 border border-white/5 hover:border-primary/20 rounded-2xl p-5 flex gap-3.5 items-start transition-all duration-300 hover:bg-slate-900/40">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-white leading-tight">{item.label}</h4>
                  <p className="text-[10.5px] text-slate-400 mt-1 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION (Gorgeous & Custom Layout) */}
      <section id="planos" className="py-24 border-t border-white/5 bg-slate-950/20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white">Planos & Investimento</h2>
            <p className="text-slate-400 text-xs md:text-sm mt-3 max-w-sm mx-auto font-medium">
              Escolha a velocidade ideal de crescimento para o seu time com suporte a múltiplos operadores de IA:
            </p>

            {/* Sliding Toggle Period */}
            <div className="relative flex bg-slate-900/80 border border-white/5 p-1 rounded-xl w-fit mx-auto mt-7 backdrop-blur-md">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`relative z-10 px-5 py-2 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  billingPeriod === 'monthly' ? 'text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {billingPeriod === 'monthly' && (
                  <motion.div
                    layoutId="active-billing"
                    className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-lg shadow-primary/25"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`relative z-10 px-5 py-2 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  billingPeriod === 'yearly' ? 'text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {billingPeriod === 'yearly' && (
                  <motion.div
                    layoutId="active-billing"
                    className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-lg shadow-primary/25"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                Anual (Economize 20%)
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-4">
            
            {/* Starter Plan */}
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gradient-to-b from-slate-900/40 to-slate-950/60 border border-white/5 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 shadow-xl backdrop-blur-md"
            >
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Iniciante</span>
                <h3 className="text-lg font-extrabold text-white">Plano Starter</h3>
                <p className="text-slate-400 text-[10.5px] mt-2 font-medium">Ideal para pequenas lojas que precisam automatizar o WhatsApp básico.</p>
                <div className="my-6">
                  <span className="text-2xl font-black text-white font-mono">
                    R$ {billingPeriod === 'monthly' ? '149' : '119'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">/mês</span>
                </div>
                <hr className="border-white/5 my-4" />
                <ul className="space-y-3 text-[10.5px] font-semibold text-slate-350">
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> 1 Canal de WhatsApp</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> 3 Atendentes Humanos</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> IA Triage, FAQ e Summary</li>
                  <li className="flex items-center gap-2 text-slate-600"><X size={12} className="text-rose-500" /> Agente SDR & Cobrança</li>
                  <li className="flex items-center gap-2 text-slate-600"><X size={12} className="text-rose-500" /> Supervisor & Relatórios</li>
                </ul>
              </div>
              <button onClick={() => router.push('/login')} className="mt-8 bg-slate-900/60 hover:bg-slate-900 border border-white/5 text-slate-200 hover:text-white text-xs font-bold py-3 rounded-xl transition-all cursor-pointer">
                Começar Teste
              </button>
            </motion.div>

            {/* Pro Plan (Best Seller Redesign) */}
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950 border-2 border-primary rounded-3xl p-7 flex flex-col justify-between relative scale-[1.04] z-10 shadow-[0_0_40px_rgba(124,58,237,0.15)] hover:shadow-[0_0_60px_rgba(124,58,237,0.25)] transition-all duration-300"
            >
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-white font-extrabold text-[8px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md shadow-primary/20">
                MAIS POPULAR
              </div>
              <div>
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-1">Aceleração</span>
                <h3 className="text-lg font-extrabold text-white">Plano Pro</h3>
                <p className="text-slate-350 text-[10.5px] mt-2 font-medium">Perfeito para empresas comerciais em expansão que querem vendas automáticas.</p>
                <div className="my-6">
                  <span className="text-3xl font-black text-white font-mono">
                    R$ {billingPeriod === 'monthly' ? '349' : '279'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">/mês</span>
                </div>
                <hr className="border-white/5 my-4" />
                <ul className="space-y-3 text-[10.5px] font-semibold text-slate-300">
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> 2 Canais de WhatsApp</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> 10 Atendentes Humanos</li>
                  <li className="flex items-center gap-2 font-extrabold text-white"><Check size={12} className="text-emerald-500" /> Agente SDR & Cobrança (IA)</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Agente Follow-up Automático</li>
                  <li className="flex items-center gap-2 text-slate-550"><X size={12} className="text-rose-500" /> Supervisor & Co-piloto</li>
                </ul>
              </div>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(124, 58, 237, 0.4)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/login')}
                className="mt-8 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow shadow-primary/25 cursor-pointer"
              >
                Começar Teste
              </motion.button>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gradient-to-b from-slate-900/40 to-slate-950/60 border border-white/5 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 shadow-xl backdrop-blur-md"
            >
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Escala Máxima</span>
                <h3 className="text-lg font-extrabold text-white">Plano Enterprise</h3>
                <p className="text-slate-450 text-[10.5px] mt-2 font-medium">Para grandes operações com auditoria de SLA e consultoria preditiva.</p>
                <div className="my-6">
                  <span className="text-2xl font-black text-white font-mono">
                    R$ {billingPeriod === 'monthly' ? '799' : '639'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">/mês</span>
                </div>
                <hr className="border-white/5 my-4" />
                <ul className="space-y-3 text-[10.5px] font-semibold text-slate-350">
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Canais Ilimitados</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Atendentes Ilimitados</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Supervisor, Coach & Copilot IA</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Relatórios Predict & Forecast IA</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Suporte VIP & SLA Garantido</li>
                </ul>
              </div>
              <button onClick={() => router.push('/login')} className="mt-8 bg-slate-900/60 hover:bg-slate-900 border border-white/5 text-slate-200 hover:text-white text-xs font-bold py-3 rounded-xl transition-all cursor-pointer">
                Começar Teste
              </button>
            </motion.div>

          </div>
        </div>
      </section>

      {/* FAQ SECTION (Minimalist Frameless Redesign) */}
      <section className="py-24 border-t border-white/5 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white">Perguntas Frequentes</h2>
            <p className="text-slate-400 text-xs mt-3 font-medium">Esclareça suas dúvidas rápidas sobre a integração da força de trabalho de IA no WhatsApp:</p>
          </div>

          <div className="space-y-1">
            {[
              {
                q: 'Como os agentes de IA se integram ao WhatsApp?',
                a: 'Nossos agentes operam acoplados à API oficial do WhatsApp Business Cloud. Toda vez que uma mensagem é recebida, ela passa pela triagem da nossa API e é repassada para o respectivo agente de IA responder em menos de 3 segundos.'
              },
              {
                q: 'Posso transferir da IA para um atendente humano?',
                a: 'Sim, a transição é totalmente imperceptível. O Triage Agent ou SDR Agent podem transferir a conversa a qualquer momento para setores específicos (ex: Financeiro, Vendas) e o atendente humano assume a conversa no inbox.'
              },
              {
                q: 'O faturamento dos tokens da OpenAI e Groq é cobrado à parte?',
                a: 'Não. O custo de processamento dos agentes padrão de IA está totalmente incluso na mensalidade do seu respectivo plano, sem surpresas no final do mês.'
              },
              {
                q: 'É seguro? Como funciona a proteção de dados do tenant?',
                a: 'O HBFlow opera sob uma arquitetura multi-tenant robusta com isolamento lógico no banco de dados. Os agentes de um determinado cliente nunca têm acesso aos dados, histórico ou chats de outro cliente.'
              }
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="border-b border-white/5 overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full py-5 text-left font-bold text-white text-xs md:text-sm flex justify-between items-center outline-none cursor-pointer hover:text-primary transition-colors duration-200"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'rotate-0'}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <div className="pb-5 text-[10.5px] md:text-xs text-slate-400 font-medium leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-14 border-t border-white/5 bg-slate-950 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo hbflow.png" alt="HBFlow Logo" className="h-5 object-contain" />
          </div>
          <span>© {currentYear} HBFlow Layer. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <a href="#como-funciona" className="hover:text-white transition-colors">Termos</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
