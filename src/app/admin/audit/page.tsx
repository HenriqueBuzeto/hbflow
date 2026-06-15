'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { 
  ShieldCheck, 
  Loader2, 
  Search, 
  Calendar, 
  User, 
  Building, 
  Terminal, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Eye, 
  Copy, 
  Check, 
  Info,
  Layers,
  FileText
} from 'lucide-react';

interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  ipAddress: string | null;
  createdAt: string;
  entity: string | null;
  entityId: string | null;
  metadata: any;
  requestId: string | null;
  userAgent: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface TenantMeta {
  id: string;
  name: string;
  slug: string;
}

interface UserMeta {
  id: string;
  name: string;
}

export default function AdminAuditPage() {
  const { currentTenantId } = useStore();

  // List States
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tenants, setTenants] = useState<TenantMeta[]>([]);
  const [users, setUsers] = useState<UserMeta[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter States
  const [filterAction, setFilterAction] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterTenantId, setFilterTenantId] = useState('');
  const [filterRequestId, setFilterRequestId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Load audit logs from API
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (filterAction) params.append('action', filterAction);
      if (filterUserId) params.append('userId', filterUserId);
      if (filterTenantId) params.append('tenantId', filterTenantId);
      if (filterRequestId) params.append('requestId', filterRequestId);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const response = await fetch(`/api/v1/admin/audit?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar os logs de auditoria.');
      }

      setLogs(data.logs || []);
      setTotalCount(data.totalCount || 0);
      setTenants(data.tenants || []);
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com a API.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterAction, filterUserId, filterTenantId, filterRequestId, filterStartDate, filterEndDate]);

  // Trigger fetch when pagination changes
  useEffect(() => {
    fetchAuditLogs();
  }, [page, pageSize]);

  // Apply filters manually
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page
    fetchAuditLogs();
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilterAction('');
    setFilterUserId('');
    setFilterTenantId('');
    setFilterRequestId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
    // Explicitly call with cleared filters
    setTimeout(() => {
      fetchAuditLogs();
    }, 0);
  };

  // Copy to clipboard utility
  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(keyId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get action color badge
  const getActionBadgeStyle = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('remove') || act.includes('exclude')) {
      return 'bg-rose-950/40 border border-rose-800/40 text-rose-350';
    }
    if (act.includes('create') || act.includes('add') || act.includes('insert')) {
      return 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400';
    }
    if (act.includes('update') || act.includes('edit') || act.includes('modify')) {
      return 'bg-amber-950/40 border border-amber-800/40 text-amber-400';
    }
    if (act.includes('login') || act.includes('auth')) {
      return 'bg-violet-950/40 border border-violet-800/40 text-violet-350';
    }
    if (act.includes('export') || act.includes('download')) {
      return 'bg-sky-950/40 border border-sky-800/40 text-sky-400';
    }
    return 'bg-slate-800 border border-slate-700 text-slate-300';
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRange = (page - 1) * pageSize + 1;
  const endRange = Math.min(page * pageSize, totalCount);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8 font-sans always-dark">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-800 pb-5 gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="text-primary" size={24} /> Logs de Auditoria
            </h1>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Controle & Governança SaaS</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAuditLogs}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 disabled:opacity-50 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-rose-950/35 border border-rose-500/35 text-rose-300 p-4 rounded-xl text-xs font-mono font-bold flex items-start gap-2 animate-pulse">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="block font-semibold">Falha ao buscar logs de auditoria:</span>
              <span className="block font-normal mt-0.5">{error}</span>
            </div>
          </div>
        )}

        {/* Dynamic Interactive Filter Panel */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Search size={16} className="text-primary" /> Filtros de Pesquisa
          </h2>
          
          <form onSubmit={handleApplyFilters} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              
              {/* Filter: Action */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Ação Realizada
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: login, delete_user..."
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Filter: Operator */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Operador / Usuário
                </label>
                <select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Todos os usuários</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter: Tenant / Enterprise */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Empresa / Inquilino
                </label>
                <select
                  value={filterTenantId}
                  onChange={(e) => setFilterTenantId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Todas as empresas</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter: Request ID */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  ID da Requisição (Request ID)
                </label>
                <input
                  type="text"
                  placeholder="Buscar UUID da request..."
                  value={filterRequestId}
                  onChange={(e) => setFilterRequestId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Filter: Start Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-500" /> Data Inicial
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors scheme-dark cursor-pointer"
                />
              </div>

              {/* Filter: End Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-500" /> Data Final
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors scheme-dark cursor-pointer"
                />
              </div>

            </div>

            {/* Actions Form Row */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-850">
              <button
                type="button"
                onClick={handleClearFilters}
                className="bg-transparent hover:bg-slate-900 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Limpar Filtros
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Filtrando...
                  </>
                ) : (
                  'Filtrar Logs'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Audit Log Table Container */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-950/80">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data / Hora</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ação</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operador</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa (Tenant)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Endereço IP</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Request ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 text-right uppercase tracking-wider">Metadados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <span className="text-xs font-medium font-mono text-slate-400">Consultando base de auditoria...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <ShieldCheck size={28} className="text-slate-700" />
                        <span className="text-xs font-semibold text-slate-400 mt-2">Nenhum log de auditoria encontrado</span>
                        <span className="text-[10px] text-slate-500 max-w-sm">Tente limpar os filtros ativos ou alterar o período de busca.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const formattedDate = new Date(log.createdAt).toLocaleString('pt-BR');
                    return (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition-colors group">
                        
                        {/* Date/Time */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-300">
                          {formattedDate}
                        </td>

                        {/* Action Badge */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide ${getActionBadgeStyle(log.action)}`}>
                            {log.action}
                          </span>
                        </td>

                        {/* User / Operator */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          {log.user ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">{log.user.name}</span>
                              <span className="text-[9px] text-slate-500 font-mono">{log.user.email}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-500/80 font-mono flex items-center gap-1">
                              <Terminal size={10} /> SISTEMA
                            </span>
                          )}
                        </td>

                        {/* Tenant / Slug */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200">{log.tenant?.name || 'Desconhecido'}</span>
                            <span className="text-[9px] text-slate-500 font-mono">slug: {log.tenant?.slug || 'n/a'}</span>
                          </div>
                        </td>

                        {/* IP Address */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                          {log.ipAddress || '127.0.0.1'}
                        </td>

                        {/* Request ID (clickable/copyable) */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                          {log.requestId ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[100px]" title={log.requestId}>
                                {log.requestId.substring(0, 8)}...
                              </span>
                              <button
                                onClick={() => copyToClipboard(log.requestId!, log.id)}
                                className="text-slate-600 hover:text-white p-1 rounded hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                              >
                                {copiedId === log.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-700">-</span>
                          )}
                        </td>

                        {/* Metadata view button */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 transition-colors"
                          >
                            <Eye size={12} />
                            Ver Detalhes
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-850 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950/80">
            
            {/* Total Results */}
            <div className="text-xs text-slate-400 font-medium font-sans">
              Exibindo <span className="text-white font-semibold">{totalCount > 0 ? startRange : 0}-{endRange}</span> de{' '}
              <span className="text-white font-semibold">{totalCount}</span> registros
            </div>

            {/* Pagination controls & Page size selector */}
            <div className="flex items-center gap-4">
              
              {/* Page size select */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Itens por pág:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 disabled:opacity-30 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                
                <span className="text-xs text-slate-300 font-semibold font-mono px-2">
                  Pág {page} de {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 disabled:opacity-30 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* JSON Viewer Details Drawer / Modal Overlay */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide ${getActionBadgeStyle(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
                <h3 className="text-sm font-bold text-white font-sans">
                  Detalhes do Log de Auditoria
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Detailed summary list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Dados do Log</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Log ID:</span>
                    <span className="font-mono text-slate-300 font-semibold">{selectedLog.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Data / Hora:</span>
                    <span className="text-slate-300 font-semibold font-mono">{new Date(selectedLog.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">IP de Origem:</span>
                    <span className="text-slate-300 font-semibold font-mono">{selectedLog.ipAddress || '127.0.0.1'}</span>
                  </div>
                </div>

                <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Escopo & Entidade</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Entidade Modificada:</span>
                    <span className="text-white font-bold font-mono">{selectedLog.entity || 'Nenhum'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">ID da Entidade:</span>
                    <span className="text-slate-300 font-semibold font-mono">{selectedLog.entityId || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Request ID:</span>
                    <span className="text-slate-300 font-semibold font-mono tracking-tighter truncate max-w-[180px]">{selectedLog.requestId || '-'}</span>
                  </div>
                </div>

                {/* User Info Full */}
                <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-xl space-y-1.5 md:col-span-2">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-1.5 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                      <User size={10} /> Dados do Operador
                    </span>
                  </div>
                  {selectedLog.user ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Nome:</span>
                        <span className="text-slate-200 font-semibold">{selectedLog.user.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">E-mail:</span>
                        <span className="text-slate-300 font-mono">{selectedLog.user.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">User ID:</span>
                        <span className="text-slate-400 font-mono text-[10px]">{selectedLog.userId}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-amber-500 font-bold font-mono text-xs flex items-center gap-1 py-1">
                      <Terminal size={12} /> Ação executada em segundo plano ou disparada pelo Sistema
                    </span>
                  )}
                </div>

                {/* Tenant Info Full */}
                <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-xl space-y-1.5 md:col-span-2">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-1.5 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                      <Building size={10} /> Dados da Empresa (Tenant)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Nome da Empresa:</span>
                      <span className="text-slate-200 font-semibold">{selectedLog.tenant?.name || 'Desconhecido'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Slug:</span>
                      <span className="text-slate-300 font-mono">{selectedLog.tenant?.slug || 'n/a'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Tenant ID:</span>
                      <span className="text-slate-400 font-mono text-[10px]">{selectedLog.tenantId}</span>
                    </div>
                  </div>
                </div>

                {/* User Agent */}
                <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-xl md:col-span-2 space-y-1">
                  <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold mb-1">
                    User Agent (Dispositivo / Navegador)
                  </span>
                  <span className="text-slate-300 font-mono text-[10px] block bg-slate-950 px-2 py-1.5 rounded border border-slate-900 break-all leading-relaxed">
                    {selectedLog.userAgent || 'Não informado'}
                  </span>
                </div>

              </div>

              {/* JSON Metadata Payload */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText size={12} className="text-slate-500" /> Carga útil de Metadados (JSON)
                  </span>
                  {selectedLog.metadata && (
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.metadata, null, 2), 'json')}
                      className="text-xs bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
                    >
                      {copiedId === 'json' ? (
                        <>
                          <Check size={12} className="text-emerald-400" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copiar JSON
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="relative border border-slate-800 rounded-xl overflow-hidden">
                  <pre className="bg-slate-950 p-4 overflow-x-auto text-[11px] font-mono text-emerald-400 max-h-72 leading-relaxed">
                    {selectedLog.metadata 
                      ? JSON.stringify(selectedLog.metadata, null, 2)
                      : '// Nenhum metadado associado a este log'}
                  </pre>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20"
              >
                Fechar Detalhes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
