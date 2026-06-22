'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore, Flow, FlowNode, FlowEdge } from '@/store/useStore';
import { 
  GitFork, Plus, Save, Play, Edit3, Trash2, ArrowRight, 
  MessageSquare, HelpCircle, Layers, X, Move, ChevronRight, 
  RefreshCw, Check, AlertCircle, Eye, EyeOff, ZoomIn, ZoomOut,
  Maximize2, Settings, PlusCircle, Sparkles, Tag, FolderPlus
} from 'lucide-react';

export default function FluxosPage() {
  const { departments } = useStore();
  
  // Database flows state
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Flow meta states (name / desc)
  const [flowName, setFlowName] = useState('');
  const [flowDesc, setFlowDesc] = useState('');

  // Canvas zoom/pan states
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
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
  const [editingNodeOptions, setEditingNodeOptions] = useState<string[]>([]);

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

  useEffect(() => {
    if (currentFlow) {
      setFlowName(currentFlow.name);
      setFlowDesc(currentFlow.description || '');
    }
  }, [activeFlowId, flows]);

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

  // Handle flow creation
  const handleCreateFlow = async () => {
    try {
      setIsSaving(true);
      const res = await fetch('/api/v1/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Novo Fluxo de Triagem',
          description: 'Fluxo interativo de triagem e atendimento.'
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.flow) {
        setFlows([...flows, data.flow]);
        setActiveFlowId(data.flow.id);
        setSelectedNodeId(null);
      }
    } catch (err) {
      console.error('Error creating flow:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle flow deletion
  const handleDeleteFlow = async () => {
    if (!activeFlowId) return;
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este fluxo?')) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/flows?id=${activeFlowId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const remaining = flows.filter(f => f.id !== activeFlowId);
        setFlows(remaining);
        if (remaining.length > 0) {
          setActiveFlowId(remaining[0].id);
        } else {
          setActiveFlowId('');
        }
        setSelectedNodeId(null);
      }
    } catch (err) {
      console.error('Error deleting flow:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateFlowMeta = (name: string, description: string) => {
    setFlows(
      flows.map((f) => (f.id === activeFlowId ? { ...f, name, description } : f))
    );
  };

  const handleSelectNode = (node: FlowNode) => {
    setSelectedNodeId(node.id);
    setEditingNodeText(node.config.messageText || '');
    setEditingNodeDept(node.config.departmentId || '');
    setEditingNodeTag(node.config.tagName || '');
    setEditingNodeOptions(node.config.questionOptions || []);
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
            tagName: editingNodeTag || undefined,
            questionOptions: n.type === 'question' ? editingNodeOptions : undefined
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
    const newX = (-panX + 250) / zoom + Math.random() * 40;
    const newY = (-panY + 150) / zoom + Math.random() * 40;

    const newNode: FlowNode = {
      id: newId,
      type,
      config: {
        messageText: type === 'message' ? 'Olá! Digite sua mensagem aqui...' : type === 'question' ? 'Escolha uma opção:' : undefined,
        tagName: type === 'tag_add' ? 'lead-triado' : undefined,
        departmentId: type === 'route_department' ? departments[0]?.id || '' : undefined,
        questionOptions: type === 'question' ? ['1 - Vendas', '2 - Financeiro', '3 - Suporte'] : undefined
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
      // Dragging a node (divided by zoom level to match cursor speed)
      const updatedNodes = currentFlow.nodes.map((node) => {
        if (node.id === draggedNodeId) {
          const clientXRelative = (e.clientX - panX) / zoom;
          const clientYRelative = (e.clientY - panY) / zoom;
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
          x: (e.clientX - rect.left - panX) / zoom,
          y: (e.clientY - rect.top - panY) / zoom
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

    // Calculate mouse click offset relative to the node top-left corner in canvas space
    const mouseCanvasX = (e.clientX - panX) / zoom;
    const mouseCanvasY = (e.clientY - panY) / zoom;

    setDraggedNodeId(nodeId);
    setDragOffset({
      x: mouseCanvasX - node.positionX,
      y: mouseCanvasY - node.positionY
    });
  };

  // Visual edge creation triggers
  const startConnecting = (e: React.MouseEvent, sourceId: string, optionCondition = '') => {
    e.stopPropagation();
    setConnectingSourceId(sourceId);
    setConnectingCondition(optionCondition);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({
        x: (e.clientX - rect.left - panX) / zoom,
        y: (e.clientY - rect.top - panY) / zoom
      });
    }
  };

  const completeConnection = (targetId: string) => {
    if (!connectingSourceId || !currentFlow || connectingSourceId === targetId) {
      setConnectingSourceId(null);
      setConnectingCondition('');
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
  const nodeWidth = 240;

  // Zoom helpers
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.8));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.4));
  const resetCamera = () => {
    setPanX(0);
    setPanY(0);
    setZoom(1);
  };

  return (
    <div className="space-y-6 h-full flex flex-col select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
            <GitFork size={26} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Visual Flow Builder Sênior
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Arrastar e soltar bolinhas de conexão para mapear o fluxo automatizado do WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-end">
          <button
            onClick={handleCreateFlow}
            className="text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none flex items-center gap-1.5 transition-all cursor-pointer"
            title="Criar novo fluxo"
          >
            <FolderPlus size={14} className="text-primary" />
            <span>Novo Fluxo</span>
          </button>

          <select
            value={activeFlowId}
            onChange={(e) => {
              setActiveFlowId(e.target.value);
              setSelectedNodeId(null);
            }}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 shadow-sm min-w-[160px]"
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
              className={`text-xs font-bold px-3 py-2 rounded-xl border flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                currentFlow.isActive 
                  ? 'bg-emerald-55 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-50 border-slate-250 text-slate-650 hover:bg-slate-100'
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
                ? 'bg-emerald-600 hover:bg-emerald-750 text-white shadow-emerald-550/10'
                : saveStatus === 'error'
                ? 'bg-rose-600 hover:bg-rose-750 text-white shadow-rose-550/10'
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[620px] items-stretch">
        {/* LEFT CANVAS COLUMN: Interactive SVG node map */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col min-h-[500px] shadow-2xl">
          
          {/* Zoom & Canvas controls toolbar */}
          <div className="absolute top-6 left-6 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-xl shadow-lg">
            <button
              onClick={zoomIn}
              className="p-1.5 hover:bg-slate-850 text-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={zoomOut}
              className="p-1.5 hover:bg-slate-850 text-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut size={14} />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1" />
            <button
              onClick={resetCamera}
              className="p-1.5 hover:bg-slate-850 text-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold px-2.5"
              title="Centralizar Câmera"
            >
              <Maximize2 size={12} />
              <span>{Math.round(zoom * 100)}%</span>
            </button>
          </div>

          <div className="relative z-10 flex justify-between items-center text-xs pb-3 border-b border-slate-800/60 mb-6">
            <span className="text-slate-450 font-bold uppercase tracking-wider flex items-center gap-2">
              <Play size={12} className={`${currentFlow?.isActive ? 'text-emerald-450 animate-pulse' : 'text-slate-500'}`} />
              {currentFlow ? `Fluxo: ${currentFlow.name}` : 'Nenhum fluxo selecionado'}
            </span>
            <span className="text-[10px] text-slate-500 italic">Dica: Arraste o fundo escuro para mover o grid.</span>
          </div>

          {/* Draggable Sandbox Area */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="flex-1 w-full h-full relative overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing border border-slate-900 bg-slate-950/80"
          >
            {/* Grid Pattern Background */}
            <div
              id="grid-overlay"
              className="absolute inset-0 bg-[radial-gradient(#2d3748_1.3px,transparent_1.3px)] [background-size:26px_26px] opacity-65"
              style={{ backgroundPosition: `${panX}px ${panY}px` }}
            />

            {/* Render Canvas Inner space with Panning & Zoom */}
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: '0px 0px'
              }}
              className="absolute inset-0 pointer-events-none transition-transform duration-75 ease-out"
            >
              {/* SVG Layer for edges */}
              {currentFlow && (
                <svg className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-none overflow-visible z-0">
                  <defs>
                    <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#EC4899" stopOpacity="0.85" />
                    </linearGradient>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8B5CF6" />
                    </marker>
                  </defs>

                  {/* Draw Connections */}
                  {currentFlow.edges.map((edge) => {
                    const sourceNode = currentFlow.nodes.find((n) => n.id === edge.sourceNodeId);
                    const targetNode = currentFlow.nodes.find((n) => n.id === edge.targetNodeId);

                    if (!sourceNode || !targetNode) return null;

                    // Output port coord calculation
                    const x1 = sourceNode.positionX + nodeWidth;
                    let y1 = sourceNode.positionY + 54; // default node center

                    if (sourceNode.type === 'question' && edge.conditionValue) {
                      const idx = sourceNode.config.questionOptions?.indexOf(edge.conditionValue) ?? -1;
                      if (idx !== -1) {
                        y1 = sourceNode.positionY + 84 + idx * 30;
                      }
                    }

                    // Input port coord (Left center of target node)
                    const x2 = targetNode.positionX;
                    const y2 = targetNode.positionY + 44;

                    const dx = Math.abs(x2 - x1) * 0.55;
                    const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                    return (
                      <g key={edge.id} className="pointer-events-auto group">
                        <path
                          d={pathD}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="8"
                          className="cursor-pointer"
                          onClick={() => deleteEdge(edge.id)}
                        />
                        <path
                          d={pathD}
                          fill="none"
                          stroke="url(#edgeGrad)"
                          strokeWidth="2.8"
                          markerEnd="url(#arrow)"
                          className="group-hover:stroke-rose-500 transition-colors duration-150 drop-shadow-[0_2px_4px_rgba(139,92,246,0.2)]"
                        />
                        {/* Option label badge on edge path */}
                        {edge.conditionValue && (
                          <foreignObject
                            x={(x1 + x2) / 2 - 40}
                            y={(y1 + y2) / 2 - 11}
                            width="80"
                            height="22"
                            className="pointer-events-none"
                          >
                            <div className="bg-slate-900/95 text-slate-350 border border-violet-500/35 rounded-lg text-[9px] font-extrabold px-1.5 py-0.5 text-center truncate shadow-lg">
                              Opção {edge.conditionValue}
                            </div>
                          </foreignObject>
                        )}
                        {/* Interactive click deletion marker */}
                        <foreignObject
                          x={(x1 + x2) / 2 - 10}
                          y={(y1 + y2) / 2 - 32}
                          width="24"
                          height="24"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <button
                            onClick={() => deleteEdge(edge.id)}
                            className="w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-lg border border-rose-450"
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

                      let x1 = sourceNode.positionX + nodeWidth;
                      let y1 = sourceNode.positionY + 54;

                      if (sourceNode.type === 'question' && connectingCondition) {
                        const idx = sourceNode.config.questionOptions?.indexOf(connectingCondition) ?? -1;
                        if (idx !== -1) {
                          y1 = sourceNode.positionY + 84 + idx * 30;
                        }
                      }

                      const x2 = mousePosition.x;
                      const y2 = mousePosition.y;

                      const dx = Math.abs(x2 - x1) * 0.55;
                      const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                      return (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#a78bfa"
                          strokeWidth="2.5"
                          strokeDasharray="5 5"
                          className="animate-pulse"
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

                // Color themes depending on type
                let typeColor = 'bg-primary';
                let typeName = 'Mensagem';
                let borderHover = 'hover:border-primary/80';
                
                if (node.type === 'question') {
                  typeColor = 'bg-amber-600';
                  typeName = 'Pergunta/Menu';
                  borderHover = 'hover:border-amber-500/80';
                } else if (node.type === 'route_department') {
                  typeColor = 'bg-emerald-600';
                  typeName = 'Direcionar Setor';
                  borderHover = 'hover:border-emerald-500/80';
                } else if (node.type === 'tag_add') {
                  typeColor = 'bg-indigo-600';
                  typeName = 'Adicionar Tag';
                  borderHover = 'hover:border-indigo-500/80';
                }

                return (
                  <div
                    key={node.id}
                    style={{
                      left: node.positionX,
                      top: node.positionY,
                      width: `${nodeWidth}px`
                    }}
                    className={`absolute bg-slate-900/90 backdrop-blur-sm border text-slate-100 rounded-2xl p-4 shadow-2xl cursor-pointer transition-all duration-200 pointer-events-auto flex flex-col gap-2.5 z-10 ${
                      isSelected 
                        ? 'border-primary ring-4 ring-primary/25 scale-[1.03] shadow-primary/20' 
                        : `border-slate-800/80 ${borderHover}`
                    }`}
                    onClick={() => handleSelectNode(node)}
                  >
                    {/* Node Header handles dragging */}
                    <div
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      className="flex justify-between items-center pb-2 border-b border-slate-800/75 cursor-move"
                    >
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg text-white ${typeColor} tracking-wider shadow-sm`}>
                        {typeName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                          className="text-slate-500 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                          title="Excluir Bloco"
                        >
                          <Trash2 size={12} />
                        </button>
                        <Move size={12} className="text-slate-600" />
                      </div>
                    </div>

                    {/* Left Connector handle (Target / Input) */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (connectingSourceId) completeConnection(node.id);
                      }}
                      className={`absolute -left-2 top-11 w-4.5 h-4.5 rounded-full border-2 bg-slate-950 flex items-center justify-center transition-all z-20 cursor-pointer ${
                        connectingSourceId 
                          ? 'border-violet-400 bg-violet-650 animate-ping scale-110' 
                          : 'border-slate-700 hover:border-violet-500 hover:scale-110'
                      }`}
                      title={connectingSourceId ? "Ligar a este bloco" : "Ponto de entrada"}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    </div>

                    {/* Node Preview Details */}
                    <div className="text-[11px] leading-relaxed text-slate-300">
                      {node.type === 'message' && (
                        <p className="line-clamp-3 italic text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                          &quot;{node.config.messageText || 'Mensagem sem conteúdo...'}&quot;
                        </p>
                      )}
                      {node.type === 'question' && (
                        <div className="space-y-2">
                          <p className="line-clamp-2 italic text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                            &quot;{node.config.messageText || 'Menu sem pergunta...'}&quot;
                          </p>
                          
                          {/* Option blocks with dedicated handles */}
                          <div className="flex flex-col gap-1.5 mt-2">
                            {node.config.questionOptions?.map((option, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-slate-950/90 px-3 py-1.5 border border-slate-800 rounded-xl relative text-[10px] font-bold text-slate-355 hover:text-white transition-colors">
                                <span className="truncate pr-4">{option}</span>
                                
                                <div
                                  onMouseDown={(e) => startConnecting(e, node.id, option)}
                                  className="absolute -right-2 top-[50%] -translate-y-[50%] w-3.5 h-3.5 rounded-full border border-violet-450 bg-slate-950 flex items-center justify-center hover:bg-violet-600 transition-colors z-20 cursor-pointer"
                                  title={`Conectar opção "${option}"`}
                                >
                                  <div className="w-1 h-1 rounded-full bg-violet-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {node.type === 'route_department' && (
                        <div className="flex items-center gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-850">
                          <ArrowRight size={12} className="text-emerald-500" />
                          <span className="text-[10px] font-extrabold text-slate-450 uppercase">Setor:</span>
                          <span className="text-emerald-400 font-black">{dept?.name || 'Setor Não Vinculado'}</span>
                        </div>
                      )}
                      {node.type === 'tag_add' && (
                        <div className="flex items-center gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-850">
                          <Tag size={12} className="text-indigo-400" />
                          <span className="text-[10px] font-extrabold text-slate-450 uppercase">Tag:</span>
                          <span className="text-indigo-400 font-bold">#{node.config.tagName || 'sem-tag'}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Connector handle (Source / Output - NOT rendered for questions as they have options) */}
                    {node.type !== 'question' && (
                      <div
                        onMouseDown={(e) => startConnecting(e, node.id)}
                        className="absolute -right-2 top-11 w-4.5 h-4.5 rounded-full border-2 border-slate-700 bg-slate-950 flex items-center justify-center hover:border-violet-500 hover:scale-110 transition-all z-20 cursor-pointer"
                        title="Puxar linha de conexão"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick builder actions bar */}
          <div className="relative z-10 pt-4 border-t border-slate-800/60 mt-4 flex justify-between text-xs text-slate-500 items-center">
            <span className="flex items-center gap-1.5 font-bold">
              <Layers size={13} className="text-primary" />
              {currentFlow?.nodes.length || 0} Blocos • {currentFlow?.edges.length || 0} Conexões
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAddNode('message')}
                disabled={!currentFlow}
                className="bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px]"
              >
                <Plus size={11} className="text-primary" /> + Mensagem
              </button>
              <button
                onClick={() => handleAddNode('question')}
                disabled={!currentFlow}
                className="bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px]"
              >
                <Plus size={11} className="text-amber-500" /> + Menu Pergunta
              </button>
              <button
                onClick={() => handleAddNode('route_department')}
                disabled={!currentFlow}
                className="bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px]"
              >
                <Plus size={11} className="text-emerald-500" /> + Setor
              </button>
              <button
                onClick={() => handleAddNode('tag_add')}
                disabled={!currentFlow}
                className="bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px]"
              >
                <Plus size={11} className="text-indigo-500" /> + Tag
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
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Edit3 size={15} className="text-primary" />
                      Editar Parâmetros do Bloco
                    </h3>
                    <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveNodeConfig} className="space-y-4 text-xs font-medium">
                    {/* Text Config for Message & Question Nodes */}
                    {(node.type === 'message' || node.type === 'question') && (
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Texto de Envio</label>
                        <textarea
                          rows={6}
                          value={editingNodeText}
                          onChange={(e) => setEditingNodeText(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-primary focus:bg-white text-slate-700 leading-relaxed transition-all shadow-inner"
                          placeholder="Digite o texto da mensagem que será enviada ao cliente..."
                        />
                      </div>
                    )}

                    {/* Question Options List Config */}
                    {node.type === 'question' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Opções do Menu (Botões)</label>
                        <p className="text-[9px] text-slate-450 leading-relaxed bg-amber-50 p-2.5 rounded-xl border border-amber-100 text-amber-800">
                          Cada opção digitada abaixo criará uma bolinha azul correspondente no bloco. Conecte-a ao próximo bloco de ação.
                        </p>
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {editingNodeOptions.map((opt, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...editingNodeOptions];
                                  newOpts[idx] = e.target.value;
                                  setEditingNodeOptions(newOpts);
                                }}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-slate-750 transition-all shadow-inner"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNodeOptions(editingNodeOptions.filter((_, i) => i !== idx));
                                }}
                                className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors cursor-pointer"
                                title="Excluir opção"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingNodeOptions([...editingNodeOptions, `Opção ${editingNodeOptions.length + 1}`])}
                          className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1 mt-2 cursor-pointer"
                        >
                          + Adicionar Opção
                        </button>
                      </div>
                    )}

                    {/* Dept Selection for Route Nodes */}
                    {node.type === 'route_department' && (
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Setor Alvo</label>
                        <select
                          value={editingNodeDept}
                          onChange={(e) => setEditingNodeDept(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary text-slate-700 transition-all cursor-pointer shadow-inner"
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
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Nome da Tag</label>
                        <input
                          type="text"
                          value={editingNodeTag}
                          onChange={(e) => setEditingNodeTag(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-slate-700 transition-all shadow-inner"
                          placeholder="Ex: lead-quente"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        type="submit"
                        className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-primary/10"
                      >
                        <Check size={14} />
                        <span>Confirmar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNode(selectedNodeId)}
                        className="bg-rose-55 text-rose-600 hover:bg-rose-100 border border-rose-150 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()
          ) : currentFlow ? (
            /* Flow meta config editing */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings size={15} className="text-primary" />
                  Configurações do Fluxo
                </h3>
              </div>

              <div className="space-y-4 text-xs font-medium">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Nome do Fluxo</label>
                  <input
                    type="text"
                    value={flowName}
                    onChange={(e) => {
                      setFlowName(e.target.value);
                      handleUpdateFlowMeta(e.target.value, flowDesc);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-slate-750 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Descrição</label>
                  <textarea
                    rows={4}
                    value={flowDesc}
                    onChange={(e) => {
                      setFlowDesc(e.target.value);
                      handleUpdateFlowMeta(flowName, e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-primary text-slate-750 transition-all leading-relaxed shadow-inner"
                  />
                </div>
                
                <div className="border-t pt-4">
                  <button
                    onClick={handleDeleteFlow}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-650 border border-rose-200 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Excluir Este Fluxo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center text-xs text-slate-400 space-y-2.5">
              <HelpCircle size={32} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-750">Painel de Parâmetros</p>
              <p className="text-[10px] text-slate-405 leading-relaxed">
                Nenhum fluxo existente. Use o botão no topo para criar um fluxo novo de triagem automatizada!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
