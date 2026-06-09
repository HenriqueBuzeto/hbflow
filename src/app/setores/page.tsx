'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Wrench, Shield, ShoppingBag, CreditCard, Plus, Check, Clock, UserCheck, X } from 'lucide-react';

export default function SetoresPage() {
  const { departments, addDepartment, updateDepartment, users } = useStore();
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // New Department Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#7C3AED',
    icon: 'ShoppingBag',
    greetingMessage: '',
    awayMessage: '',
    distributionMode: 'manual' as 'manual' | 'workload' | 'round_robin',
    slaFirstResponseMinutes: 15,
    slaResolutionMinutes: 60
  });

  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    setSelectedDeptId(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    addDepartment({
      id: `dept-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      color: formData.color,
      icon: formData.icon,
      greetingMessage: formData.greetingMessage,
      awayMessage: formData.awayMessage,
      distributionMode: formData.distributionMode as any,
      slaFirstResponseMinutes: formData.slaFirstResponseMinutes,
      slaResolutionMinutes: formData.slaResolutionMinutes,
      isActive: true
    });

    setFormData({
      name: '',
      description: '',
      color: '#7C3AED',
      icon: 'ShoppingBag',
      greetingMessage: '',
      awayMessage: '',
      distributionMode: 'manual',
      slaFirstResponseMinutes: 15,
      slaResolutionMinutes: 60
    });
    setShowAddForm(false);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag':
        return <ShoppingBag size={18} />;
      case 'CreditCard':
        return <CreditCard size={18} />;
      default:
        return <Shield size={18} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench size={24} className="text-primary" />
            Configuração de Setores (Filas)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre os setores da sua empresa, configure os tempos limite de SLA de primeira resposta, e defina as mensagens automáticas de triagem.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} />
          <span>Novo Setor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Sectors List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dept) => {
              const assignedAgents = users.filter((u) => u.filters.includes(dept.name.toLowerCase()));

              return (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden ${
                    selectedDeptId === dept.id ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200'
                  }`}
                >
                  {/* Color strip accent */}
                  <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: dept.color }} />

                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: dept.color }}
                        >
                          {getIcon(dept.icon)}
                        </div>
                        <h3 className="text-xs font-bold text-slate-800">{dept.name}</h3>
                      </div>
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full capitalize">
                        {dept.distributionMode}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                      {dept.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      SLA: {dept.slaFirstResponseMinutes}m / {dept.slaResolutionMinutes}m
                    </span>
                    <span className="flex items-center gap-1">
                      <UserCheck size={11} />
                      {assignedAgents.length} agentes online
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Settings editor panel */}
        <div>
          {selectedDept ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xs font-bold text-slate-800">Editar Setor: {selectedDept.name}</h3>
                <button onClick={() => setSelectedDeptId(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome do Setor</label>
                  <input
                    type="text"
                    value={selectedDept.name}
                    onChange={(e) => updateDepartment(selectedDept.id, { name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descrição</label>
                  <textarea
                    rows={2}
                    value={selectedDept.description}
                    onChange={(e) => updateDepartment(selectedDept.id, { description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white transition-all text-slate-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mensagem de Boas-vindas</label>
                  <textarea
                    rows={3}
                    value={selectedDept.greetingMessage}
                    onChange={(e) => updateDepartment(selectedDept.id, { greetingMessage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-white transition-all text-slate-600 leading-normal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">SLA Primeira Resp.</label>
                    <input
                      type="number"
                      value={selectedDept.slaFirstResponseMinutes}
                      onChange={(e) => updateDepartment(selectedDept.id, { slaFirstResponseMinutes: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">SLA Resolução</label>
                    <input
                      type="number"
                      value={selectedDept.slaResolutionMinutes}
                      onChange={(e) => updateDepartment(selectedDept.id, { slaResolutionMinutes: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Distribuição Inteligente</label>
                  <select
                    value={selectedDept.distributionMode}
                    onChange={(e) => updateDepartment(selectedDept.id, { distributionMode: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs"
                  >
                    <option value="manual">Manual (Puxar da Fila)</option>
                    <option value="workload">Menor Carga de Trabalho (Workload)</option>
                    <option value="round_robin">Rodízio (Round Robin)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Salvar Alterações</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-400">
              Selecione um setor para visualizar ou editar suas diretrizes de mensagens e SLAs.
            </div>
          )}
        </div>
      </div>

      {/* CREATE SECTOR MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Adicionar Novo Setor</h4>

            <form onSubmit={handleCreate} className="space-y-3 text-xs font-medium">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome do Setor</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Comercial VIP"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cor Hex</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-8 rounded-xl border p-0 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ícone</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs cursor-pointer"
                  >
                    <option value="ShoppingBag">ShoppingBag (Comercial)</option>
                    <option value="CreditCard">CreditCard (Financeiro)</option>
                    <option value="Shield">Shield (Suporte/Garantia)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover"
                >
                  Criar Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
