"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
  icone: string;
}

const CORES_PRESET = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#a855f7", "#ec4899",
  "#14b8a6", "#06b6d4", "#84cc16", "#f43f5e",
];

const FORM_VAZIO = {
  nome: "",
  tipo: "despesa" as "receita" | "despesa",
  cor: "#f97316",
  icone: "Tag",
};

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | "receita" | "despesa">("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categorias");
      setCategorias(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setErro("");
    setModalAberto(true);
  };

  const abrirEditar = (c: Categoria) => {
    setEditando(c);
    setForm({ nome: c.nome, tipo: c.tipo as "receita" | "despesa", cor: c.cor, icone: c.icone });
    setErro("");
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      if (editando) {
        await fetch(`/api/categorias/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (c: Categoria) => {
    const res = await fetch(`/api/categorias/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Não foi possível excluir.");
      return;
    }
    carregar();
  };

  const receitas = categorias.filter((c) => c.tipo === "receita");
  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const grupos =
    filtroTipo === "receita"
      ? [{ label: "Receitas", list: receitas, tipo: "receita" }]
      : filtroTipo === "despesa"
      ? [{ label: "Despesas", list: despesas, tipo: "despesa" }]
      : [
          { label: "Despesas", list: despesas, tipo: "despesa" },
          { label: "Receitas", list: receitas, tipo: "receita" },
        ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex rounded-lg border border-[#27272a] overflow-hidden">
          {(["", "despesa", "receita"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                filtroTipo === t ? "bg-[#f97316] text-white" : "text-[#a1a1aa] hover:bg-[#1a1a1f]"
              }`}
            >
              {t === "" ? "Todas" : t === "despesa" ? "Despesas" : "Receitas"}
            </button>
          ))}
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {grupos.map(({ label, list, tipo }) => (
            <div key={tipo}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider">
                  {label}
                </h2>
                <span className="text-xs text-[#52525b] bg-[#1a1a1f] px-2 py-0.5 rounded-full">
                  {list.length}
                </span>
                <div className="flex-1 h-px bg-[#27272a]" />
              </div>

              {list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 bg-[#111113] border border-[#27272a] rounded-xl text-center">
                  <Tag size={24} className="text-[#27272a] mb-2" />
                  <p className="text-[#52525b] text-sm">Nenhuma categoria de {label.toLowerCase()}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {list.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-[#111113] border border-[#27272a] rounded-xl p-4 hover:border-[#3f3f46] transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${cat.cor}20` }}
                        >
                          <Tag size={16} style={{ color: cat.cor }} />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => abrirEditar(cat)}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#222228] text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => excluir(cat)}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#ef4444]/10 text-[#a1a1aa] hover:text-[#ef4444] transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-[#f5f5f5] truncate">{cat.nome}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: cat.cor }} />
                        <span className="text-xs text-[#52525b]">{cat.cor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">
              {editando ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Tipo */}
            <div className="flex rounded-xl border border-[#27272a] overflow-hidden">
              {(["despesa", "receita"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    form.tipo === t
                      ? t === "receita"
                        ? "bg-[#22c55e] text-white"
                        : "bg-[#ef4444] text-white"
                      : "text-[#a1a1aa] hover:bg-[#1a1a1f]"
                  }`}
                >
                  {t === "receita" ? "Receita" : "Despesa"}
                </button>
              ))}
            </div>

            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Alimentação, Moradia..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50"
              />
            </div>

            <div>
              <Label className="text-[#a1a1aa] text-xs mb-2 block">Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_PRESET.map((cor) => (
                  <button
                    key={cor}
                    onClick={() => setForm((f) => ({ ...f, cor }))}
                    className={`w-7 h-7 rounded-lg transition-all duration-150 ${
                      form.cor === cor ? "scale-110 ring-2 ring-white/40 ring-offset-1 ring-offset-[#111113]" : "hover:scale-105"
                    }`}
                    style={{ background: cor }}
                  />
                ))}
                <input
                  type="color"
                  value={form.cor}
                  onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                  title="Cor personalizada"
                />
              </div>
            </div>

            {erro && <p className="text-[#ef4444] text-sm">{erro}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !form.nome.trim()}
                className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              >
                {salvando ? "Salvando..." : editando ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
