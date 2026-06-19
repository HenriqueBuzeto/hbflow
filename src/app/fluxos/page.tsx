'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore, Flow, FlowNode, FlowEdge } from '@/store/useStore';
import { 
  GitFork, Plus, Save, Play, Edit3, Trash2, ArrowRight, 
  MessageSquare, HelpCircle, Layers, X, Move, ChevronRight, 
  RefreshCw, Check, AlertCircle, Eye, EyeOff
} from 'lucide-react';

export default function FluxosPage() {
  const { departments, contacts } = useStore();
  
  // Database flows state
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Canvas zoom/pan states
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging node states
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Creating connections visually
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [connectingCondition, setConnectingCondition] = useState<string>('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Node editing state
  const [editingNodeText, setEditingNodeText] = useState('');
  const [editingNodeDept, setEditingNodeDept] = useState('');
  const [editingNodeTag, setEditingNodeTag] = useState('');

  // Fetch flows from Database
  const fetchFlowsFromDB = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/flows');
      const data = await res.json();
      if (res.ok && data.success && data.flows) {
        setFlows(data.flows);
        if (data.flows.length > 0) {
          setActiveFlowId(data.flows[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching flows:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowsFromDB();
  }, []);

  const currentFlow = flows.find((f) => f.id === activeFlowId);

  // Handle saving current flow changes back to PostgreSQL
  const handleSaveFlow = async () => {
    if (!currentFlow) return;
    try {
      setIsSaving(true);
      setSaveStatus('idle');
      const res = await fetch('/api/v1/flows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentFlow)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Error saving flow:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectNode = (node: FlowNode) => {
    setSelectedNodeId(node.id);
    setEditingNodeText(node.config.messageText || '');
    setEditingNodeDept(node.config.departmentId || '');
    setEditingNodeTag(node.config.tagName || '');
  };

  const handleSaveNodeConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !currentFlow) return;

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

    setFlows(
      flows.map((f) => (f.id === currentFlow.id ? { ...f, nodes: updatedNodes } : f))
    );
    setSelectedNodeId(null);
  };

  const handleAddNode = (type: 'message' | 'question' | 'tag_add' | 'route_department') => {
    if (!currentFlow) return;
    const newId = `node-${Date.now()}`;

    // Place node relative to center of view
    const newX = -panX + 300 + Math.random() * 50;
    const newY = -panY + 150 + Math.random() * 50;

    const newNode: FlowNode = {
      id: newId,
      type,
      config: {
        messageText: type === 'message' ? 'Olá! Digite sua mensagem aqui...' : type === 'question' ? 'Escolha uma opção:' : undefined,
        tagName: type === 'tag_add' ? 'cliente-lead' : undefined,
        departmentId: type === 'route_department' ? departments[0]?.id || '' : undefined,
        questionOptions: type === 'question' ? ['1', '2', '3', '4'] : undefined
      },
      positionX: newX,
      positionY: newY
    };

    setFlows(
      flows.map((f) => (f.id === currentFlow.id ? { ...f, nodes: [...f.nodes, newNode] } : f))
    );
    handleSelectNode(newNode);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!currentFlow) return;
    const updatedNodes = currentFlow.nodes.filter((n) => n.id !== nodeId);
    const updatedEdges = currentFlow.edges.filter(
      (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
    );
    setFlows(
      flows.map((f) => (f.id === currentFlow.id ? { ...f, nodes: updatedNodes, edges: updatedEdges } : f))
    );
    setSelectedNodeId(null);
  };

  const toggleFlowActive = () => {
    if (!currentFlow) return;
    setFlows(
      flows.map((f) => (f.id === currentFlow.id ? { ...f, isActive: !f.isActive } : f))
    );
  };

  // Canvas Drag/Pan Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If user clicks on background, start panning
    if (e.target === canvasRef.current || (e.target as HTMLElement).id === 'grid-overlay') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
    } else if (draggedNodeId && currentFlow) {
      // Dragging a node
      const updatedNodes = currentFlow.nodes.map((node) => {
        if (node.id === draggedNodeId) {
          const clientXRelative = e.clientX - panX;
          const clientYRelative = e.clientY - panY;
          return {
            ...node,
            positionX: clientXRelative - dragOffset.x,
            positionY: clientYRelative - dragOffset.y
          };
        }
        return node;
      });
      setFlows(
        flows.map((f) => (f.id === currentFlow.id ? { ...f, nodes: updatedNodes } : f))
      );
    }

    // Keep track of cursor coordinates for dynamic edge drawing
    if (connectingSourceId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setMousePosition({
          x: e.clientX - rect.left - panX,
          y: e.clientY - rect.top - panY
        });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = currentFlow?.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Calculate mouse click offset relative to the node top-left corner
    const nodeClientX = node.positionX + panX;
    const nodeClientY = node.positionY + panY;

    setDraggedNodeId(nodeId);
    setDragOffset({
      x: e.clientX - nodeClientX,
      y: e.clientY - nodeClientY
    });
  };

  // Visual edge creation triggers
  const startConnecting = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    setConnectingSourceId(sourceId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({
        x: e.clientX - rect.left - panX,
        y: e.clientY - rect.top - panY
      });
    }
  };

  const completeConnection = (targetId: string) => {
    if (!connectingSourceId || !currentFlow || connectingSourceId === targetId) {
      setConnectingSourceId(null);
      return;
    }

    const newEdge: FlowEdge = {
      id: `edge-${Date.now()}`,
      sourceNodeId: connectingSourceId,
      targetNodeId: targetId,
      conditionValue: connectingCondition || undefined
    };

    setFlows(
      flows.map((f) => (f.id === currentFlow.id ? { ...f, edges: [...f.edges, newEdge] } : f))
    );

    setConnectingSourceId(null);
    setConnectingCondition('');
  };

  const deleteEdge = (edgeId: string) => {
    if (!currentFlow) return;
    setFlows(
      flows.map((f) => (f.id === currentFlow.id ? { ...f, edges: f.edges.filter((e) => e.id !== edgeId) } : f))
    );
  };

  // Node Dimensions
  const nodeWidth = 224;
  const nodeHeight = 110;

  return (
    <div className="space-y-6 h-full flex flex-col select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GitFork size={24} className="text-primary" />
            Visual Flow Builder Sênior
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Construa e customize o fluxo de atendimento em tempo real. Puxe linhas a partir dos círculos azuis nas laterais dos blocos para conectá-los.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={activeFlowId}
            onChange={(e) => setActiveFlowId(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-primary/20"
          >
            {flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.isActive ? '(Ativo)' : '(Inativo)'}
              </option>
            ))}
          </select>

          {currentFlow && (
            <button
              onClick={toggleFlowActive}
              className={`text-xs font-bold px-3 py-2 rounded-xl border flex items-center gap-1 transition-all cursor-pointer ${
                currentFlow.isActive 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {currentFlow.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{currentFlow.isActive ? 'Fluxo Ativo' : 'Ativar Fluxo'}</span>
            </button>
          )}

          <button
            onClick={handleSaveFlow}
            disabled={isSaving || !currentFlow}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
              saveStatus === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10'
                : saveStatus === 'error'
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/10'
                : 'bg-primary hover:bg-primary-hover text-white shadow-primary/10'
            }`}
          >
            {isSaving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : saveStatus === 'success' ? (
              <Check size={14} />
            ) : saveStatus === 'error' ? (
              <AlertCircle size={14} />
            ) : (
              <Save size={14} />
            )}
            <span>
              {isSaving ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : saveStatus === 'error' ? 'Erro ao Salvar' : 'Salvar Alterações'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[600px] items-stretch">
        {/* LEFT CANVAS COLUMN: Interactive SVG node map */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col min-h-[500px]">
          {/* Zoom & Canvas controls */}
          <div className="absolute top-6 left-6 z-20 flex gap-2">
            <button
              onClick={() => { setPanX(0); setPanY(0); }}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg"
            >
              Resetar Posição
            </button>
          </div>

          <div className="relative z-10 flex justify-between items-center text-xs pb-3 border-b border-slate-800/60 mb-6">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Play size={12} className={`${currentFlow?.isActive ? 'text-emerald-500 animate-pulse' : 'text-slate-500'}`} />
              {currentFlow ? `Fluxo: ${currentFlow.name}` : 'Nenhum fluxo selecionado'}
            </span>
            <span className="text-[10px] text-slate-500 italic">Dica: Segure e arraste no fundo escuro para mover a câmera</span>
          </div>

          {/* Draggable Sandbox Area */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="flex-1 w-full h-full relative overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing border border-slate-900"
          >
            {/* Grid Pattern Background */}
            <div
              id="grid-overlay"
              className="absolute inset-0 bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-40"
              style={{ backgroundPosition: `${panX}px ${panY}px` }}
            />

            {/* Render Canvas Inner space with Panning */}
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px)`,
                transformOrigin: '0px 0px'
              }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* SVG Layer for edges */}
              {currentFlow && (
                <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible z-0">
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#7C3AED" />
                    </marker>
                    <marker
                      id="arrow-hover"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                    </marker>
                  </defs>

                  {/* Draw Connections */}
                  {currentFlow.edges.map((edge) => {
                    const sourceNode = currentFlow.nodes.find((n) => n.id === edge.sourceNodeId);
                    const targetNode = currentFlow.nodes.find((n) => n.id === edge.targetNodeId);

                    if (!sourceNode || !targetNode) return null;

                    // Output port coord (Right center of source node)
                    const x1 = sourceNode.positionX + nodeWidth;
                    const y1 = sourceNode.positionY + nodeHeight / 2;

                    // Input port coord (Left center of target node)
                    const x2 = targetNode.positionX;
                    const y2 = targetNode.positionY + nodeHeight / 2;

                    const dx = Math.abs(x2 - x1) * 0.5;
                    const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                    return (
                      <g key={edge.id} className="pointer-events-auto group">
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#475569"
                          strokeWidth="6"
                          className="opacity-0 group-hover:opacity-20 cursor-pointer transition-opacity"
                          onClick={() => deleteEdge(edge.id)}
                        />
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#7C3AED"
                          strokeWidth="2.5"
                          markerEnd="url(#arrow)"
                          className="group-hover:stroke-rose-500 transition-colors"
                        />
                        {/* Interactive click deletion marker */}
                        <foreignObject
                          x={(x1 + x2) / 2 - 12}
                          y={(y1 + y2) / 2 - 12}
                          width="24"
                          height="24"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <button
                            onClick={() => deleteEdge(edge.id)}
                            className="w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-lg"
                            title="Remover conexão"
                          >
                            <X size={10} />
                          </button>
                        </foreignObject>
                      </g>
                    );
                  })}

                  {/* Draw Active/Floating connection line */}
                  {connectingSourceId && (
                    (() => {
                      const sourceNode = currentFlow.nodes.find((n) => n.id === connectingSourceId);
                      if (!sourceNode) return null;

                      const x1 = sourceNode.positionX + nodeWidth;
                      const y1 = sourceNode.positionY + nodeHeight / 2;
                      const x2 = mousePosition.x;
                      const y2 = mousePosition.y;

                      const dx = Math.abs(x2 - x1) * 0.5;
                      const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                      return (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#7C3AED"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="animate-[dash_10s_linear_infinite]"
                        />
                      );
                    })()
                  )}
                </svg>
              )}

              {/* Render Draggable Nodes */}
              {currentFlow && currentFlow.nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const dept = node.type === 'route_department' ? departments.find(d => d.id === node.config.departmentId) : null;

                return (
                  <div
                    key={node.id}
                    style={{
                      left: node.positionX,
                      top: node.positionY,
                      width: `${nodeWidth}px`,
                      minHeight: `${nodeHeight}px`
                    }}
                    className={`absolute bg-slate-900 border text-slate-200 rounded-2xl p-3 shadow-xl cursor-pointer hover:border-primary transition-shadow pointer-events-auto flex flex-col gap-2 z-10 ${
                      isSelected ? 'border-primary ring-4 ring-primary/20 scale-102' : 'border-slate-800'
                    }`}
                    onClick={() => handleSelectNode(node)}
                  >
                    {/* Node Header handles dragging */}
                    <div
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      className="flex justify-between items-center pb-2 border-b border-slate-800/80 cursor-move"
                    >
                      <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded text-white ${
                        node.type === 'message' ? 'bg-primary' : node.type === 'question' ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}>
                        {node.type === 'message' ? 'Mensagem' : node.type === 'question' ? 'Menu Pergunta' : 'Roteador Setor'}
                      </span>
                      <div className="flex items-center gap-1.5 pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                          className="text-slate-500 hover:text-rose-500 p-0.5"
                          title="Excluir"
                        >
                          <Trash2 size={11} />
                        </button>
                        <Move size={11} className="text-slate-600" />
                      </div>
                    </div>

                    {/* Left Connector handle (Target / Input) */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (connectingSourceId) completeConnection(node.id);
                      }}
                      className={`absolute -left-2 top-[50%] -translate-y-[50%] w-4 h-4 rounded-full border-2 bg-slate-900 flex items-center justify-center hover:bg-violet-600 transition-colors z-20 cursor-pointer ${
                        connectingSourceId ? 'border-violet-500 animate-pulse scale-110' : 'border-slate-700'
                      }`}
                      title={connectingSourceId ? "Ligar a este bloco" : "Ponto de entrada"}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    </div>

                    {/* Node Preview Details */}
                    <div className="text-[10px] leading-relaxed text-slate-300 flex-1 flex flex-col justify-center">
                      {node.type === 'message' && (
                        <p className="line-clamp-2 italic">&quot;{node.config.messageText || 'Escreva algo...'}&quot;</p>
                      )}
                      {node.type === 'question' && (
                        <div>
                          <p className="line-clamp-1 italic font-semibold">{node.config.messageText}</p>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {node.config.questionOptions?.map((o) => (
                              <span key={o} className="text-[8px] bg-slate-800 text-slate-400 border border-slate-700 px-1 py-0.2 rounded">
                                {o}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {node.type === 'route_department' && (
                        <p className="font-bold flex items-center gap-1 text-[9px]">
                          <ArrowRight size={10} className="text-emerald-500" />
                          Encaminhar: <span className="text-emerald-400 font-extrabold">{dept?.name || 'Vendas'}</span>
                        </p>
                      )}
                      {node.type === 'tag_add' && (
                        <p className="font-semibold text-violet-400 text-[9.5px]">
                          Aplicar Tag: #{node.config.tagName || 'sem-tag'}
                        </p>
                      )}
                    </div>

                    {/* Right Connector handle (Source / Output) */}
                    <div
                      onMouseDown={(e) => startConnecting(e, node.id)}
                      className="absolute -right-2 top-[50%] -translate-y-[50%] w-4 h-4 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center hover:bg-violet-600 transition-colors z-20 cursor-pointer"
                      title="Puxar linha de conexão"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick builder actions */}
          <div className="relative z-10 pt-4 border-t border-slate-800/60 mt-4 flex justify-between text-xs text-slate-500 items-center">
            <span className="flex items-center gap-1.5">
              <Layers size={12} />
              {currentFlow?.nodes.length || 0} Blocos • {currentFlow?.edges.length || 0} Conexões
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleAddNode('message')}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"
              >
                <Plus size={11} /> + Mensagem
              </button>
              <button
                onClick={() => handleAddNode('question')}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"
              >
                <Plus size={11} /> + Pergunta Menu
              </button>
              <button
                onClick={() => handleAddNode('route_department')}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"
              >
                <Plus size={11} /> + Setor
              </button>
              <button
                onClick={() => handleAddNode('tag_add')}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1"
              >
                <Plus size={11} /> + Tag
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT EDITOR PANEL COLUMN */}
        <div className="space-y-4">
          {selectedNodeId && currentFlow ? (
            (() => {
              const node = currentFlow.nodes.find(n => n.id === selectedNodeId);
              if (!node) return null;

              return (
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
                    {/* Text Config for Message & Question Nodes */}
                    {(node.type === 'message' || node.type === 'question') && (
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

                    {/* Question Options config */}
                    {node.type === 'question' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Opções do Menu</label>
                        <p className="text-[9px] text-slate-400 mb-2">Escreva o texto contendo as opções numeradas. O chatbot reconhecerá estas entradas.</p>
                      </div>
                    )}

                    {/* Dept Selection for Route Nodes */}
                    {node.type === 'route_department' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Setor Alvo</label>
                        <select
                          value={editingNodeDept}
                          onChange={(e) => setEditingNodeDept(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary"
                        >
                          <option value="">Selecione um setor...</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Tag config for Tag Nodes */}
                    {node.type === 'tag_add' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome da Tag</label>
                        <input
                          type="text"
                          value={editingNodeTag}
                          onChange={(e) => setEditingNodeTag(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary"
                          placeholder="Ex: lead-quente"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check size={14} />
                        <span>Confirmar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNode(selectedNodeId)}
                        className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center text-xs text-slate-400 space-y-2">
              <HelpCircle size={32} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">Painel de Parâmetros</p>
              <p className="text-[10px] text-slate-400 leading-normal">
                Selecione qualquer bloco no fluxograma para editar seus textos ou configurações internas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
