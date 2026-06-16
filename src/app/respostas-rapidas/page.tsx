'use client';

import React, { useState, useEffect } from 'react';
import { useStore, QuickReply } from '@/store/useStore';
import { Plus, Search, Trash2, Edit3, X, MessageSquare, Check, Sparkles } from 'lucide-react';

export default function RespostasRapidasPage() {
  const { fetchQuickReplies, quickReplies, demo_mode_enabled } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);

  // Form states
  const [shortcut, setShortcut] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchQuickReplies();
  }, [fetchQuickReplies]);

  // Filter replies based on search query
  const filteredReplies = quickReplies.filter(
    (qr) =>
      qr.shortcut.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qr.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (qr.category && qr.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openCreateModal = () => {
    setEditingReply(null);
    setShortcut('/');
    setMessage('');
    setCategory('');
    setTitle('');
    setErrorMsg(null);
    setShowModal(true);
  };

  const openEditModal = (qr: QuickReply) => {
    setEditingReply(qr);
    setShortcut(qr.shortcut);
    setMessage(qr.message);
    setCategory(qr.category || '');
    setTitle(qr.title || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    const cleanShortcut = shortcut.trim().toLowerCase();
    if (!cleanShortcut.startsWith('/') && !cleanShortcut.startsWith('!')) {
      setErrorMsg('O atalho deve começar obrigatoriamente com "/" ou "!" (Exemplo: /oi ou !suporte)');
      return;
    }

    if (cleanShortcut.length < 2) {
      setErrorMsg('O atalho deve ter pelo menos 2 caracteres (Exemplo: /oi)');
      return;
    }

    if (!message.trim()) {
      setErrorMsg('A mensagem de resposta rápida não pode estar vazia.');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingReply
        ? `/api/v1/quick-replies/${editingReply.id}`
        : '/api/v1/quick-replies';
      const method = editingReply ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortcut: cleanShortcut,
          message: message.trim(),
          category: category.trim() || null,
          title: title.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowModal(false);
        fetchQuickReplies();
      } else {
        setErrorMsg(data.error || 'Ocorreu um erro ao salvar a resposta rápida.');
      }
    } catch (err) {
      console.error('Error saving quick reply:', err);
      setErrorMsg('Falha ao conectar com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta resposta rápida?')) return;

    try {
      const res = await fetch(`/api/v1/quick-replies/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchQuickReplies();
      } else {
        alert('Erro ao excluir a resposta rápida.');
      }
    } catch (err) {
      console.error('Error deleting quick reply:', err);
      alert('Falha ao conectar com o servidor.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="text-primary" size={20} />
            Respostas Rápidas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure atalhos como <code className="bg-slate-100 px-1 py-0.5 rounded font-bold">/oi</code> ou <code className="bg-slate-100 px-1 py-0.5 rounded font-bold">!suporte</code> para responder clientes instantaneamente na Inbox.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          Nova Resposta
        </button>
      </div>

      {/* Control bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Pesquisar por atalho, categoria ou mensagem..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-10 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium"
          />
        </div>
      </div>

      {/* Grid List */}
      {filteredReplies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 border border-dashed">
            <MessageSquare size={20} />
          </div>
          <h3 className="text-xs font-bold text-slate-700">Nenhuma resposta rápida cadastrada</h3>
          <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
            Clique no botão acima para registrar seu primeiro atalho corporativo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReplies.map((qr) => (
            <div
              key={qr.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="inline-block bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-lg font-mono text-[10px] font-black uppercase tracking-wider select-none">
                    {qr.shortcut}
                  </span>
                  {qr.category && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded-full capitalize border border-slate-200/50">
                      {qr.category}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {qr.title && (
                    <h4 className="text-xs font-bold text-slate-800">{qr.title}</h4>
                  )}
                  <p className="text-xs text-slate-500 leading-relaxed font-medium whitespace-pre-wrap break-words">
                    {qr.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-1.5 border-t border-slate-100 pt-3 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditModal(qr)}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg hover:text-primary transition-all cursor-pointer"
                  title="Editar resposta"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(qr.id)}
                  className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 text-slate-600 hover:text-rose-500 rounded-lg transition-all cursor-pointer"
                  title="Excluir resposta"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-bold text-slate-800">
                {editingReply ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <p className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2 rounded-xl">
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Atalho de Ativação (Shortcut)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: /oi, !suporte, /obrigado"
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary focus:bg-white transition-all font-mono"
                    required
                  />
                </div>
                <span className="text-[8px] text-slate-400 block mt-1 font-medium leading-relaxed">
                  Deve começar com <strong className="text-slate-600">/</strong> ou <strong className="text-slate-600">!</strong> para atalhar no chat.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Título Identificador (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Saudação Geral"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Categoria (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: vendas, suporte"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Mensagem da Resposta
                  </label>
                  <span className="text-[9px] text-slate-400 font-bold select-none cursor-pointer hover:text-primary transition-colors" onClick={() => setMessage(prev => prev + ' 👋')}>
                    Dica: Permite emojis 🚀👋💬
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Olá! Como posso te ajudar hoje? 😊"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary focus:bg-white transition-all font-medium leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Resposta Rápida'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
