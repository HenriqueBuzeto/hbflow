'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Users, Search, Plus, Filter, Tag, ArrowUpRight, Phone, MapPin, Award } from 'lucide-react';

export default function ClientesPage() {
  const router = useRouter();
  const { contacts, addContact, fetchContacts, startConversation } = useStore();

  // Poll contacts from database state every 5 seconds
  useEffect(() => {
    fetchContacts();
    const pollInterval = setInterval(() => {
      fetchContacts();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [fetchContacts]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50; // 50 items per page

  // Reset page when queries change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterOrigin]);

  // Contact Creation State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    document: '',
    city: '',
    state: '',
    origin: 'whatsapp',
    tags: [] as string[],
    notes: ''
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;

    addContact({
      ...newContact,
      status: 'lead',
      score: 50,
      totalPurchased: 0
    });

    setNewContact({
      name: '',
      phone: '',
      email: '',
      document: '',
      city: '',
      state: '',
      origin: 'whatsapp',
      tags: [],
      notes: ''
    });
    setShowAddModal(false);
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesOrigin = filterOrigin === 'all' || c.origin === filterOrigin;

    return matchesSearch && matchesOrigin;
  });

  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={24} className="text-primary" />
            CRM de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie sua carteira comercial. Veja o score, compras efetuadas, tags, e acesse o dossiê 360° de cada contato.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4 items-center">
        <div className="relative w-full md:max-w-md">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:border-primary focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <Filter size={14} className="text-slate-400" />
          <select
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">Todas as Origens</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="web">Web Form</option>
            <option value="presencial">Presencial</option>
          </select>
        </div>
      </div>

      {/* Contacts Table Card */}
      {contacts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden min-h-[300px]">
          <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
            <Users size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Nenhum cliente cadastrado ainda.</h2>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            Cadastre um novo cliente manualmente ou receba contatos automaticamente via WhatsApp para começar.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Nome do Cliente</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Cidade / UF</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4">Tags</th>
                  <th className="px-6 py-4 text-right">Faturamento</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Nenhum cliente cadastrado ou encontrado.
                    </td>
                  </tr>
                ) : (
                  paginatedContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      onClick={() => router.push(`/clientes/${contact.id}`)}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                              {contact.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Doc: {contact.document || 'Não informado'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="text-slate-700 font-mono flex items-center gap-1">
                            <Phone size={10} className="text-slate-400" />
                            {contact.phone}
                          </span>
                          {contact.email && <span className="text-[10px] text-slate-400 block">{contact.email}</span>}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {contact.city ? (
                          <span className="text-slate-600 flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400" />
                            {contact.city} - {contact.state}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Não informado</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-50 border px-2 py-0.5 rounded-full font-bold">
                          <Award size={11} className="text-amber-500" />
                          <span>{contact.score}/100</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {contact.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize font-semibold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono">
                        {contact.totalPurchased.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const convId = await startConversation(contact.id);
                              if (convId) {
                                router.push('/inbox');
                              }
                            }}
                            className="text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Phone size={13} />
                            <span>Chamar</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/clientes/${contact.id}`);
                            }}
                            className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-0.5"
                          >
                            <span>Dossiê</span>
                            <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-150 bg-slate-50/50 px-6 py-4.5 gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Exibindo <span className="font-bold text-slate-800">{Math.min(startIndex + 1, filteredContacts.length)}</span> a{' '}
                <span className="font-bold text-slate-800">{Math.min(endIndex, filteredContacts.length)}</span> de{' '}
                <span className="font-bold text-slate-800">{filteredContacts.length}</span> contatos
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-2 text-[11px] font-extrabold bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer shadow-sm"
                >
                  Anterior
                </button>
                <span className="px-3.5 py-2 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm min-w-[100px] text-center">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3.5 py-2 text-[11px] font-extrabold bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer shadow-sm"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE CONTACT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Cadastrar Novo Contato</h4>

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="+55..."
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cidade</label>
                  <input
                    type="text"
                    value={newContact.city}
                    onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    placeholder="SP"
                    value={newContact.state}
                    onChange={(e) => setNewContact({ ...newContact, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notas Internas</label>
                <textarea
                  rows={2}
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover"
                >
                  Cadastrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
