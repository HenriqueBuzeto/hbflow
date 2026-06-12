'use client';

import React, { useState } from 'react';
import { useStore, Flow, FlowNode } from '@/store/useStore';
import { GitFork, Plus, Save, Play, Edit3, Trash2, ArrowRight, MessageSquare, HelpCircle, Layers, X } from 'lucide-react';

export default function FluxosPage() {
  const { flows, addFlow, updateFlow, departments } = useStore();
  const [activeFlowId, setActiveFlowId] = useState<string>('flow-welcome');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Form edit states
  const [editingNodeText, setEditingNodeText] = useState('');
  const [editingNodeDept, setEditingNodeDept] = useState('');
  const [editingNodeTag, setEditingNodeTag] = useState('');

  const currentFlow = flows.find((f) => f.id === activeFlowId) || flows[0] || { id: '', name: 'Fluxo Principal', nodes: [], edges: [] };

  const handleSelectNode = (node: FlowNode) => {
    setSelectedNodeId(node.id);
    setEditingNodeText(node.config.messageText || '');
    setEditingNodeDept(node.config.departmentId || '');
    setEditingNodeTag(node.config.tagName || '');
  };

  const handleSaveNodeConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId) return;

    const updatedNodes = currentFlow.nodes.map((n) => {
      if (n.id === selectedNodeId) {
        return {
          ...n,
          config: {
            ...n.config,
            messageText: editingNodeText || undefined,
            departmentId: editingNodeDept || undefined,
            tagName: editingNodeTag || undefined
          }
        };
      }
      return n;
    });

    updateFlow(currentFlow.id, { nodes: updatedNodes });
    setSelectedNodeId(null);
  };

  const handleAddNode = (type: 'message' | 'tag_add' | 'route_department') => {
    const newId = `node-${Date.now()}`;
    const lastNode = currentFlow.nodes[currentFlow.nodes.length - 1];

    const newNode: FlowNode = {
      id: newId,
      type,
      config: {
        messageText: type === 'message' ? 'Escreva sua mensagem aqui...' : undefined,
        tagName: type === 'tag_add' ? 'nova-tag' : undefined,
        departmentId: type === 'route_department' ? 'dept-vendas' : undefined
      },
      positionX: lastNode ? lastNode.positionX + 150 : 200,
      positionY: lastNode ? lastNode.positionY + 80 : 200
    };

    const updatedNodes = [...currentFlow.nodes, newNode];

    // Auto connect last node to new node if sensible
    const updatedEdges = [...currentFlow.edges];
    if (lastNode && lastNode.type !== 'route_department' && lastNode.type !== 'end') {
      updatedEdges.push({
        id: `edge-${Date.now()}`,
        sourceNodeId: lastNode.id,
        targetNodeId: newId
      });
    }

    updateFlow(currentFlow.id, {
      nodes: updatedNodes,
      edges: updatedEdges
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    const updatedNodes = currentFlow.nodes.filter((n) => n.id !== nodeId);
    const updatedEdges = currentFlow.edges.filter(
      (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
    );
    updateFlow(currentFlow.id, {
      nodes: updatedNodes,
      edges: updatedEdges
    });
    setSelectedNodeId(null);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GitFork size={24} className="text-primary" />
            Visual Flow Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Crie fluxogramas de triagem interativos. Clientes respondendo ao WhatsApp caminharão pelos blocos de decisão configurados.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={activeFlowId}
            onChange={(e) => setActiveFlowId(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer"
          >
            {flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => handleAddNode('message')}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} />
            <span>Adicionar Mensagem</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px] items-stretch">
        {/* LEFT CANVAS COLUMN: Node Editor visual grid */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col min-h-[400px]">
          {/* Grid background representation */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

          {/* Canvas header info */}
          <div className="relative z-10 flex justify-between items-center text-xs pb-3 border-b border-slate-800/60 mb-6">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Play size={12} className="text-emerald-500 animate-pulse" />
              Fluxo Ativo: {currentFlow.name}
            </span>
            <span className="text-[10px] text-slate-500 italic">Dica: Clique em qualquer caixa de bloco para editar</span>
          </div>

          {/* Node Container Graph */}
          <div className="relative flex-1 z-10 flex flex-wrap gap-8 justify-center items-center overflow-auto p-4">
            {currentFlow.nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const dept = node.type === 'route_department' ? departments.find(d => d.id === node.config.departmentId) : null;

              return (
                <div
                  key={node.id}
                  onClick={() => handleSelectNode(node)}
                  className={`w-56 bg-slate-900 border text-slate-200 rounded-2xl p-4 shadow-xl cursor-pointer hover:border-primary transition-all relative flex flex-col gap-2 ${
                    isSelected ? 'border-primary ring-4 ring-primary/20 scale-105' : 'border-slate-800'
                  }`}
                >
                  {/* Badge identifier */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded text-white ${
                      node.type === 'message' ? 'bg-primary' : node.type === 'question' ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}>
                      {node.type === 'message' ? 'Mensagem' : node.type === 'question' ? 'Pergunta Menu' : 'Direcionar Setor'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="text-slate-500 hover:text-rose-500 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Body value preview */}
                  <div className="text-[10.5px] leading-relaxed text-slate-300">
                    {node.type === 'message' && (
                      <p className="line-clamp-3 italic">&quot;{node.config.messageText}&quot;</p>
                    )}
                    {node.type === 'question' && (
                      <div>
                        <p className="line-clamp-2 italic font-semibold">{node.config.messageText}</p>
                        <div className="flex gap-1 flex-wrap mt-2">
                          {node.config.questionOptions?.map((o) => (
                            <span key={o} className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1 py-0.5 rounded">
                              Opção {o}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {node.type === 'route_department' && (
                      <p className="font-bold flex items-center gap-1">
                        <ArrowRight size={12} className="text-emerald-500" />
                        Setor: <span className="text-emerald-400 font-extrabold">{dept?.name || 'Vendas'}</span>
                      </p>
                    )}
                    {node.type === 'tag_add' && (
                      <p className="font-semibold text-violet-400">
                        Aplicar Tag: #{node.config.tagName}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick builder actions */}
          <div className="relative z-10 pt-4 border-t border-slate-800/60 mt-4 flex justify-between text-xs text-slate-500 items-center">
            <span className="flex items-center gap-1">
              <Layers size={12} />
              {currentFlow.nodes.length} Blocos de Decisão • {currentFlow.edges.length} Conexões
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleAddNode('route_department')}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                + Roteamento Setor
              </button>
              <button
                onClick={() => handleAddNode('tag_add')}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                + Aplicar Tag
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT EDITOR PANEL COLUMN */}
        <div>
          {selectedNodeId ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Edit3 size={14} className="text-primary" />
                  Editar Parâmetros do Bloco
                </h3>
                <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveNodeConfig} className="space-y-4 text-xs font-medium">
                {/* Text Config for Message Nodes */}
                {(currentFlow.nodes.find(n => n.id === selectedNodeId)?.type === 'message' ||
                  currentFlow.nodes.find(n => n.id === selectedNodeId)?.type === 'question') && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Texto de Envio</label>
                    <textarea
                      rows={5}
                      value={editingNodeText}
                      onChange={(e) => setEditingNodeText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-primary focus:bg-white text-slate-700 leading-normal"
                    />
                  </div>
                )}

                {/* Dept Selection for Route Nodes */}
                {currentFlow.nodes.find(n => n.id === selectedNodeId)?.type === 'route_department' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Setor Alvo</label>
                    <select
                      value={editingNodeDept}
                      onChange={(e) => setEditingNodeDept(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tag config for Tag Nodes */}
                {currentFlow.nodes.find(n => n.id === selectedNodeId)?.type === 'tag_add' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome da Tag</label>
                    <input
                      type="text"
                      value={editingNodeTag}
                      onChange={(e) => setEditingNodeTag(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Salvar Config</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNode(selectedNodeId)}
                    className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                  >
                    Excluir Bloco
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center text-xs text-slate-400">
              Clique em qualquer bloco de decisão do fluxograma no canvas para parametrizar textos de disparo ou regras de direcionamento automático.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
