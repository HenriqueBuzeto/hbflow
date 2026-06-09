'use client';

import React, { useState } from 'react';
import { Tag as TagIcon, Plus, Check, Trash2, X } from 'lucide-react';

interface ColorTag {
  id: string;
  name: string;
  color: string;
  count: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<ColorTag[]>([
    { id: '1', name: 'comercial', color: '#7C3AED', count: 12 },
    { id: '2', name: 'financeiro', color: '#2563EB', count: 5 },
    { id: '3', name: 'manutencao', color: '#16A34A', count: 3 },
    { id: '4', name: 'vip-client', color: '#F59E0B', count: 8 }
  ]);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7C3AED');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newTag: ColorTag = {
      id: `tag-${Date.now()}`,
      name: name.toLowerCase().trim(),
      color,
      count: 0
    };

    setTags([newTag, ...tags]);
    setName('');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    setTags(tags.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TagIcon size={24} className="text-primary" />
            Gestão de Etiquetas (Tags)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize e segmente seus clientes. Use cores para diferenciar leads quentes, pendências de suporte e faturamentos VIP.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} />
          <span>Nova Etiqueta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between text-xs font-medium hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full border border-white shrink-0 shadow-inner"
                style={{ backgroundColor: tag.color }}
              />
              <div>
                <strong className="text-slate-800 text-sm">#{tag.name}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">{tag.count} contatos vinculados</span>
              </div>
            </div>

            <button
              onClick={() => handleDelete(tag.id)}
              className="text-slate-400 hover:text-rose-500 p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Excluir etiqueta"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold text-slate-800">Nova Etiqueta de CRM</h4>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs font-medium">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome da Tag (Slug)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: lead-quente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cor Hexadecimal</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-8 rounded-xl border p-0 cursor-pointer"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover"
                >
                  Salvar Etiqueta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
