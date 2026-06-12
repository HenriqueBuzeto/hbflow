'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Building2, Plus, ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function EmpresasPage() {
  const { tenants, currentTenantId, setCurrentTenantId } = useStore();

  const activeTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0] || { id: '', name: 'Empresa', slug: '', plan: 'starter' };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 size={24} className="text-primary" />
          Gerenciar Empresas (Multi-tenancy)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Visão geral do ecossistema SaaS. Cada empresa/inquilino (Tenant) possui isolamento criptográfico no banco, impossibilitando vazamento de leads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Tenant Box */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              Dossiê da Empresa Ativa
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-700">
              <div className="p-3 bg-slate-50 border rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Razão Social / Nome</span>
                <strong className="text-slate-800 text-sm">{activeTenant.name}</strong>
              </div>

              <div className="p-3 bg-slate-50 border rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Plano Assinado</span>
                <span className="text-xs bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded-full uppercase">
                  {activeTenant.plan} Plan
                </span>
              </div>

              <div className="p-3 bg-slate-50 border rounded-xl col-span-2">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Tenant Slug ID (Subdomínio)</span>
                <code className="text-xs text-slate-600 font-mono select-all block mt-0.5">
                  https://{activeTenant.slug}.hbflow.com.br
                </code>
              </div>
            </div>
          </div>

          {/* Directory Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Empresas Cadastradas</h4>
            <div className="space-y-2.5">
              {tenants.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setCurrentTenantId(t.id)}
                  className={`p-4 border rounded-2xl flex justify-between items-center text-xs font-medium cursor-pointer transition-all ${
                    t.id === currentTenantId ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <strong className="text-slate-800 text-sm block">{t.name}</strong>
                    <span className="text-[10px] text-slate-400 mt-1 block">ID: {t.id}</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 border px-2.5 py-0.5 rounded-full capitalize">
                    {t.plan}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security / Isolation parameters */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" />
              Estrutura de Isolamento
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              O banco de dados PostgreSQL utiliza chaves estrangeiras com indexação por `tenantId` em todas as consultas SQL para garantir conformidade de segurança LGPD.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
