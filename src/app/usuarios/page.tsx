'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { 
  UserCheck, 
  Plus, 
  Check, 
  Settings, 
  ShieldAlert, 
  Shield, 
  Trash2, 
  Edit3, 
  X, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Lock
} from 'lucide-react';
import Link from 'next/link';

export default function UsuariosPage() {
  const { users, currentUserId, demo_mode_enabled, fetchUsers, userPlan, userLimit, userCount } = useStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // Plan limits & quota states
  const plan = userPlan as any;
  const limit = userLimit;
  const count = userCount;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('Atendente');
  const [formFilters, setFormFilters] = useState<string[]>([]);
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSignature, setFormSignature] = useState('');
  const [formSigPosition, setFormSigPosition] = useState<'start' | 'end' | 'disabled'>('end');
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; text: string; color: string }>({ score: 0, text: 'Muito Fraca', color: 'bg-rose-500' });

  // Delete confirmation state
  const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);

  // Right-panel filters editing state (for selecting user)
  const selectedAgent = users.find((u) => u.id === selectedAgentId);
  const [rightPanelFilters, setRightPanelFilters] = useState<string[]>([]);

  // Password strength check
  useEffect(() => {
    if (!formPassword) {
      setPasswordStrength({ score: 0, text: '', color: 'bg-slate-200' });
      return;
    }
    let score = 0;
    if (formPassword.length >= 8) score++;
    if (/[A-Z]/.test(formPassword)) score++;
    if (/[a-z]/.test(formPassword)) score++;
    if (/[0-9]/.test(formPassword)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(formPassword)) score++;

    let text = 'Muito Fraca';
    let color = 'bg-rose-500';
    if (score >= 5) {
      text = 'Excelente';
      color = 'bg-emerald-500';
    } else if (score >= 4) {
      text = 'Forte';
      color = 'bg-teal-500';
    } else if (score >= 3) {
      text = 'Média';
      color = 'bg-amber-500';
    } else if (score >= 2) {
      text = 'Fraca';
      color = 'bg-orange-500';
    }

    setPasswordStrength({ score, text, color });
  }, [formPassword]);

  // Load users on mount and handle quota stats
  const loadQuotaStats = async () => {
    if (demo_mode_enabled) return;

    setLoading(true);
    try {
      await fetchUsers();
    } catch (err) {
      console.error('Error fetching quota stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotaStats();
  }, [demo_mode_enabled]);

  // Initialize form when opening modal for create or edit
  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('Atendente');
    setFormFilters(['vendas']);
    setFormAvatarUrl('');
    setFormPhone('');
    setFormSignature('');
    setFormSigPosition('end');
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(''); // blank password during edit
    setFormRole(user.role);
    setFormFilters(user.filters || []);
    setFormAvatarUrl(user.avatarUrl || '');
    setFormPhone(user.phone || '');
    setFormSignature(user.signature || '');
    setFormSigPosition(user.sigPosition || 'end');
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  // Sync right-panel checkboxes when a user is clicked
  useEffect(() => {
    if (selectedAgent) {
      setRightPanelFilters(selectedAgent.filters || []);
    }
  }, [selectedAgentId]);

  // Handle Right Panel Save Filters
  const handleSaveFilters = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setError('');
    setSuccess('');

    if (demo_mode_enabled) {
      // Offline mode: just update store mock
      useStore.setState({
        users: users.map(u => u.id === selectedAgent.id ? { ...u, filters: rightPanelFilters } : u)
      });
      setSuccess('Filtros salvos com sucesso (Modo Demonstração).');
      setTimeout(() => setSuccess(''), 2000);
      return;
    }

    try {
      const res = await fetch(`/api/v1/users/${selectedAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedAgent.name,
          email: selectedAgent.email,
          role: selectedAgent.role,
          filters: rightPanelFilters,
          isActive: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar filtros.');

      setSuccess('Setores vinculados salvos com sucesso!');
      await loadQuotaStats();
      setTimeout(() => {
        setSuccess('');
        setSelectedAgentId(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar filtros.');
    }
  };

  // Handle Create or Edit submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (!formName || !formEmail || (!editingUser && !formPassword) || !formRole) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      setSubmitting(false);
      return;
    }

    if (demo_mode_enabled) {
      // Simulation mode
      if (editingUser) {
        useStore.setState({
          users: users.map(u => u.id === editingUser.id ? { 
            ...u, 
            name: formName, 
            email: formEmail, 
            role: formRole, 
            filters: formFilters,
            avatarUrl: formAvatarUrl || u.avatarUrl,
            phone: formPhone,
            signature: formSignature,
            sigPosition: formSigPosition
          } : u)
        });
        setSuccess('Usuário atualizado com sucesso (Modo Demonstração).');
      } else {
        if (users.length >= limit) {
          setError(`Limite de ${limit} usuários atingido no simulador.`);
          setSubmitting(false);
          return;
        }
        const newUser = {
          id: `user-demo-${Date.now()}`,
          name: formName,
          email: formEmail,
          avatarUrl: formAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
          role: formRole,
          signature: formSignature || `Atenciosamente, ${formName}`,
          sigPosition: formSigPosition,
          phone: formPhone,
          filters: formFilters,
          isOnline: false,
          presence: 'offline' as const,
          workload: 0
        };
        useStore.setState({ 
          users: [...users, newUser],
          userCount: userCount + 1
        });
        setSuccess('Usuário criado com sucesso (Modo Demonstração).');
      }
      setSubmitting(false);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
      }, 1000);
      return;
    }

    // Real database API mode
    try {
      let res;
      if (editingUser) {
        res = await fetch(`/api/v1/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            role: formRole,
            filters: formFilters,
            isActive: true,
            avatarUrl: formAvatarUrl,
            phone: formPhone,
            signature: formSignature,
            sigPosition: formSigPosition,
            ...(formPassword ? { password: formPassword } : {})
          })
        });
      } else {
        res = await fetch('/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            password: formPassword,
            role: formRole,
            filters: formFilters,
            avatarUrl: formAvatarUrl,
            phone: formPhone,
            signature: formSignature,
            sigPosition: formSigPosition
          })
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar requisição.');

      setSuccess(editingUser ? 'Dados do usuário atualizados!' : 'Usuário criado com sucesso!');
      await loadQuotaStats();
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Soft Delete
  const handleDeleteUser = async (userId: string) => {
    setError('');
    setSuccess('');
    
    if (demo_mode_enabled) {
      useStore.setState({
        users: users.filter(u => u.id !== userId),
        userCount: Math.max(0, userCount - 1)
      });
      setSuccess('Usuário excluído (Modo Demonstração).');
      setUserToDeleteId(null);
      setTimeout(() => setSuccess(''), 2000);
      return;
    }

    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir usuário.');

      setSuccess('Usuário excluído com sucesso!');
      setUserToDeleteId(null);
      await loadQuotaStats();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Falha ao excluir usuário.');
      setUserToDeleteId(null);
    }
  };

  // Toggle filter in right panel local list
  const toggleRightPanelFilter = (filter: string) => {
    if (rightPanelFilters.includes(filter)) {
      setRightPanelFilters(rightPanelFilters.filter(f => f !== filter));
    } else {
      setRightPanelFilters([...rightPanelFilters, filter]);
    }
  };

  // Toggle filter in modal form local list
  const toggleModalFilter = (filter: string) => {
    if (formFilters.includes(filter)) {
      setFormFilters(formFilters.filter(f => f !== filter));
    } else {
      setFormFilters([...formFilters, filter]);
    }
  };

  const isLimitReached = count >= limit;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header & Plan limits indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck size={24} className="text-primary animate-pulse" />
            Gestão de Usuários e Atendentes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre novos atendentes, configure permissões por perfil (Admin, Gestor, Comercial) e defina as filas de triagem que cada um pode assumir.
          </p>
        </div>

        {/* Dynamic quota limit details */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/80 border border-slate-150 p-4.5 rounded-2xl shrink-0">
          <div className="text-center sm:text-left flex flex-col justify-center h-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">PLANO ATIVO</span>
            <span className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5 justify-center sm:justify-start">
              {plan === 'starter' ? 'Starter Plan' : plan === 'enterprise' ? 'Enterprise' : 'Pro Plan'}
              <span className="bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full capitalize">
                {plan === 'starter' ? '3 user' : plan === 'enterprise' ? 'unlimited' : '10 user'}
              </span>
            </span>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-200" />

          {/* User count bar */}
          <div className="w-40 flex flex-col justify-center h-10">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
              <span>USUÁRIOS ATIVOS</span>
              <span className="font-mono text-slate-800">{count} / {plan === 'enterprise' ? '∞' : limit}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-500 ${isLimitReached ? 'bg-amber-500 animate-pulse' : 'bg-primary'}`} 
                style={{ width: `${Math.min(100, (count / limit) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-200" />

          {/* Create User Button or Upgrade Advice */}
          <div className="flex items-center h-10">
            {isLimitReached ? (
              <Link 
                href="/billing"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
              >
                <TrendingUp size={13} />
                <span>Dar Upgrade</span>
              </Link>
            ) : (
              <button
                onClick={openCreateModal}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Novo Usuário</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-4 rounded-2xl shadow-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600"><X size={14} /></button>
        </div>
      )}

      {success && !isModalOpen && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold p-4 rounded-2xl shadow-sm">
          <Check size={16} className="text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Main layout grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table view */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="animate-spin text-primary" size={24} />
                <span className="text-xs text-slate-400 font-medium">Carregando usuários...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <div className="p-4 bg-slate-50 text-slate-400 rounded-full w-fit mx-auto border border-dashed border-slate-200">
                  <UserCheck size={32} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Nenhum funcionário cadastrado</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-normal">
                  Crie novos usuários para que sua equipe possa gerenciar conversas e leads de forma integrada.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <tr>
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Contato</th>
                      <th className="px-6 py-4">Fila (Setores)</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium text-slate-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-primary/15"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block text-[12.5px]">{user.name}</span>
                              <span className="text-[9.5px] text-slate-400 font-extrabold uppercase mt-0.5 block">{user.role}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-slate-500 block font-mono text-[11px]">{user.email}</span>
                          {user.phone && <span className="text-slate-400 block font-mono text-[10px] mt-0.5">{user.phone}</span>}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[170px]">
                            {user.filters && user.filters.length > 0 ? (
                              user.filters.map((f) => (
                                <span key={f} className="text-[9px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full capitalize font-bold border border-slate-200/40">
                                  {f}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] text-slate-400 italic">Sem setores</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            user.isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {user.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => setSelectedAgentId(user.id)}
                              className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-0.5 cursor-pointer"
                              title="Configurar Setores"
                            >
                              <Settings size={13} />
                              <span>Filtros</span>
                            </button>

                            <button
                              onClick={() => openEditModal(user)}
                              className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                              title="Editar Cadastro"
                            >
                              <Edit3 size={13} />
                            </button>

                            {user.id !== currentUserId && (
                              <button
                                onClick={() => setUserToDeleteId(user.id)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="Excluir Usuário"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Filters config side panel */}
        <div>
          {selectedAgent ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3.5">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Shield size={15} className="text-primary animate-pulse" />
                  <span>Filtros: {selectedAgent.name}</span>
                </h3>
                <button 
                  onClick={() => setSelectedAgentId(null)} 
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveFilters} className="space-y-5 text-xs font-medium text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-3">
                    Filas / Setores Vinculados
                  </span>
                  <div className="space-y-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-150/60">
                    {['vendas', 'financeiro', 'suporte', 'cobranca', 'garantia'].map((f) => {
                      const isLinked = rightPanelFilters.includes(f);
                      return (
                        <label key={f} className="flex items-center justify-between cursor-pointer group">
                          <span className="capitalize font-bold text-slate-750 group-hover:text-slate-900 transition-colors">
                            {f}
                          </span>
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={() => toggleRightPanelFilter(f)}
                            className="w-4.5 h-4.5 text-primary accent-primary cursor-pointer rounded border-slate-300 transition-all"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {success && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-[10.5px] font-bold p-3.5 rounded-xl border border-emerald-150">
                    <Check size={14} />
                    <span>{success}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow shadow-primary/20 cursor-pointer"
                  >
                    Salvar Filtros
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgentId(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6.5 shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 border-b pb-3 mb-5">
              <UserCheck size={18} className="text-primary" />
              <span>{editingUser ? 'Editar Atendente' : 'Adicionar Novo Atendente'}</span>
            </h3>

            {error && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold p-3.5 rounded-xl mb-4">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs font-semibold p-3.5 rounded-xl mb-4">
                <Check size={15} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-medium text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Pedro de Souza"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all font-medium text-slate-800 text-[12px]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">E-mail de Login (Único)</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="pedro@hbflow.com"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all font-mono text-slate-800 text-[11.5px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    {editingUser ? 'Senha (Deixe em branco para manter)' : 'Senha de Acesso'}
                  </label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      required={!editingUser}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingUser ? 'Nova senha' : 'Criar senha forte'}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 pl-9 pr-3.5 outline-none transition-all text-slate-850 text-[12px]"
                    />
                  </div>

                  {/* Password strength details */}
                  {formPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                        <span>Força da Senha</span>
                        <span>{passwordStrength.text}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((idx) => (
                          <div 
                            key={idx} 
                            className={`flex-1 h-full rounded-full transition-all ${
                              idx <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Perfil / Permissões</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all cursor-pointer font-bold text-slate-800 text-[12px]"
                  >
                    <option value="Atendente">Atendente (Apenas Chats)</option>
                    <option value="Comercial">Comercial (Chats + CRM)</option>
                    <option value="Financeiro">Financeiro (Chats + Faturamento)</option>
                    <option value="Gestor">Gestor (Acesso Quase Completo)</option>
                    <option value="Admin">Admin (Acesso Total + Configurações)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Foto de Perfil</label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:border-primary transition-all rounded-xl p-1.5">
                    {formAvatarUrl ? (
                      <div className="relative group shrink-0">
                        <img
                          src={formAvatarUrl}
                          alt="Avatar Preview"
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/10"
                        />
                        <button
                          type="button"
                          onClick={() => setFormAvatarUrl('')}
                          className="absolute -top-1 -right-1 bg-rose-500 text-white p-0.5 rounded-full hover:bg-rose-600 shadow-sm transition-all cursor-pointer"
                          title="Remover foto"
                        >
                          <X size={8} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-350 flex items-center justify-center text-slate-500 font-bold text-[11px] uppercase shrink-0">
                        {formName ? formName.charAt(0) : '?'}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <label className="inline-flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm">
                        <span>Escolher Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormAvatarUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Telefone de Contato</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ex: +55 11 99999-9999"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all font-medium text-slate-800 text-[12px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Assinatura de Mensagem</label>
                  <input
                    type="text"
                    value={formSignature}
                    onChange={(e) => setFormSignature(e.target.value)}
                    placeholder="Ex: Atenciosamente, Pedro."
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all font-medium text-slate-800 text-[12px]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Posição da Assinatura</label>
                  <select
                    value={formSigPosition}
                    onChange={(e) => setFormSigPosition(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all cursor-pointer font-bold text-slate-800 text-[12px]"
                  >
                    <option value="disabled">Desativada</option>
                    <option value="end">Ao Final da Mensagem</option>
                    <option value="start">No Início da Mensagem</option>
                  </select>
                </div>
              </div>

              {/* Sectors checkbox row */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Filas de Triagem Habilitadas</span>
                <div className="flex flex-wrap gap-2.5 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                  {['vendas', 'financeiro', 'suporte', 'cobranca', 'garantia'].map((f) => {
                    const isLinked = formFilters.includes(f);
                    return (
                      <button
                        type="button"
                        key={f}
                        onClick={() => toggleModalFilter(f)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-[10.5px] capitalize border cursor-pointer transition-all ${
                          isLinked 
                            ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Limit warning inside modal */}
              {!editingUser && isLimitReached && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-150 text-amber-850 p-3.5 rounded-2xl mt-1.5">
                  <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed">
                    Você atingiu a quota máxima de <strong>{limit} usuários</strong> no plano <strong>{plan.toUpperCase()}</strong>. Salvar este formulário falhará.
                    Por favor, faça um <Link href="/billing" className="underline font-bold text-amber-950">upgrade no seu faturamento</Link> antes.
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!editingUser && isLimitReached)}
                  className="bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary/15 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingUser ? 'Salvar Alterações' : 'Criar Usuário'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOUBLE CONFIRMATION DELETE MODAL */}
      {userToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6.5 shadow-2xl relative text-center space-y-4">
            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-full w-fit mx-auto border border-rose-100">
              <Trash2 size={28} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-800">Deseja excluir permanentemente este atendente?</h3>
              <p className="text-xs text-slate-400 leading-normal px-4">
                Esta ação de exclusão lógica desativará a conta do usuário imediatamente, liberando o limite de usuários ativos de seu plano. Os históricos de chats passados serão mantidos.
              </p>
            </div>

            <div className="flex justify-center gap-3.5 pt-2">
              <button
                onClick={() => setUserToDeleteId(null)}
                className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => handleDeleteUser(userToDeleteId)}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-rose-600/10 cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
