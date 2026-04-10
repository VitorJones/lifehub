"use client";

import { useEffect, useState, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Heart, Wallet, User, Briefcase, Sparkles, Flag,
  Plus, Pencil, Trash2, Check, ChevronUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Meta {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  tipo: string; // "quantitativa" | "qualitativa"
  valorAlvo: number | null;
  valorAtual: number | null;
  unidade: string | null;
  prazo: string | null;
  concluida: boolean;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: "saude",        label: "Saúde",         icon: Heart,     cor: "#22c55e" },
  { id: "financeiro",   label: "Financeiro",     icon: Wallet,    cor: "#3b82f6" },
  { id: "pessoal",      label: "Pessoal",        icon: User,      cor: "#a855f7" },
  { id: "profissional", label: "Profissional",   icon: Briefcase, cor: "#f97316" },
  { id: "espiritual",   label: "Espiritual",     icon: Sparkles,  cor: "#eab308" },
];

function getCat(id: string) {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[2];
}

const FORM_VAZIO = {
  titulo: "", descricao: "", categoria: "pessoal",
  tipo: "quantitativa" as "quantitativa" | "qualitativa",
  valorAlvo: "", valorAtual: "", unidade: "", prazo: "",
};

// ─── Componente ─────────────────────────────────────────────────────────────

export default function MetasPage() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Meta | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);
  const [novoValor, setNovoValor] = useState("");
  const [form, setForm] = useState(FORM_VAZIO);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/metas");
      setMetas(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirModal = (meta?: Meta) => {
    if (meta) {
      setEditando(meta);
      setForm({
        titulo: meta.titulo,
        descricao: meta.descricao ?? "",
        categoria: meta.categoria,
        tipo: meta.tipo as "quantitativa" | "qualitativa",
        valorAlvo: meta.valorAlvo?.toString() ?? "",
        valorAtual: meta.valorAtual?.toString() ?? "",
        unidade: meta.unidade ?? "",
        prazo: meta.prazo ? meta.prazo.slice(0, 10) : "",
      });
    } else {
      setEditando(null);
      setForm(FORM_VAZIO);
    }
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.titulo) return;
    setSalvando(true);
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        categoria: form.categoria,
        tipo: form.tipo,
        valorAlvo: form.valorAlvo ? Number(form.valorAlvo) : null,
        valorAtual: form.valorAtual ? Number(form.valorAtual) : null,
        unidade: form.unidade || null,
        prazo: form.prazo || null,
      };
      if (editando) {
        await fetch(`/api/metas/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/metas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string) => {
    await fetch(`/api/metas/${id}`, { method: "DELETE" });
    carregar();
  };

  const concluir = async (meta: Meta) => {
    await fetch(`/api/metas/${meta.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...meta, concluida: !meta.concluida }),
    });
    carregar();
  };

  const atualizarProgresso = async (meta: Meta) => {
    if (!novoValor) return;
    await fetch(`/api/metas/${meta.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...meta, valorAtual: Number(novoValor) }),
    });
    setAtualizandoId(null);
    setNovoValor("");
    carregar();
  };

  const metasFiltradas = metas.filter(
    (m) => filtroCategoria === "todas" || m.categoria === filtroCategoria
  );

  const ativas = metasFiltradas.filter((m) => !m.concluida);
  const concluidas = metasFiltradas.filter((m) => m.concluida);

  const hoje = new Date();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por categoria */}
          <button
            onClick={() => setFiltroCategoria("todas")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filtroCategoria === "todas"
                ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                : "border-[#27272a] text-[#a1a1aa] hover:bg-[#1a1a1f]"
            }`}
          >
            Todas
          </button>
          {CATEGORIAS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => setFiltroCategoria(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  filtroCategoria === c.id
                    ? "border-current bg-current/10"
                    : "border-[#27272a] text-[#a1a1aa] hover:bg-[#1a1a1f]"
                }`}
                style={filtroCategoria === c.id ? { color: c.cor, borderColor: c.cor } : {}}
              >
                <Icon size={12} />
                {c.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0 ml-4"
        >
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />)}
        </div>
      ) : metasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111113] border border-[#27272a] rounded-xl">
          <Flag size={40} className="text-[#27272a] mb-3" />
          <p className="text-[#a1a1aa] font-medium mb-1">Nenhuma meta encontrada</p>
          <p className="text-[#52525b] text-sm mb-4">Defina objetivos claros para acompanhar seu progresso</p>
          <button onClick={() => abrirModal()} className="flex items-center gap-2 px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Nova Meta
          </button>
        </div>
      ) : (
        <>
          {/* Metas ativas */}
          {ativas.length > 0 && (
            <div className="space-y-3 mb-6">
              {ativas.map((meta) => {
                const cat = getCat(meta.categoria);
                const CatIcon = cat.icon;
                const pct = meta.tipo === "quantitativa" && meta.valorAlvo && meta.valorAlvo > 0
                  ? Math.min(((meta.valorAtual ?? 0) / meta.valorAlvo) * 100, 100)
                  : null;
                const diasRestantes = meta.prazo
                  ? differenceInDays(new Date(meta.prazo), hoje)
                  : null;
                const atrasada = diasRestantes !== null && diasRestantes < 0;

                return (
                  <div
                    key={meta.id}
                    className="bg-[#111113] border border-[#27272a] rounded-xl px-5 py-4 hover:border-[#3f3f46] transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Ícone da categoria */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${cat.cor}20` }}
                      >
                        <CatIcon size={18} style={{ color: cat.cor }} />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="font-medium text-[#f5f5f5]">{meta.titulo}</p>
                            {meta.descricao && (
                              <p className="text-xs text-[#52525b] mt-0.5">{meta.descricao}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => concluir(meta)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-[#22c55e] border border-[#22c55e]/30 rounded-lg hover:bg-[#22c55e]/10 transition-colors"
                            >
                              <Check size={11} /> Concluir
                            </button>
                            <button onClick={() => abrirModal(meta)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => excluir(meta.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: `${cat.cor}20`, color: cat.cor }}
                          >
                            {cat.label}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#27272a] text-[#52525b]">
                            {meta.tipo === "quantitativa" ? "Quantitativa" : "Qualitativa"}
                          </span>
                          {diasRestantes !== null && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              atrasada
                                ? "bg-[#ef4444]/10 text-[#ef4444]"
                                : diasRestantes <= 7
                                ? "bg-[#eab308]/10 text-[#eab308]"
                                : "border border-[#27272a] text-[#52525b]"
                            }`}>
                              {atrasada
                                ? `${Math.abs(diasRestantes)}d atrasada`
                                : diasRestantes === 0
                                ? "Vence hoje"
                                : `${diasRestantes}d restantes`}
                            </span>
                          )}
                        </div>

                        {/* Progresso quantitativo */}
                        {meta.tipo === "quantitativa" && meta.valorAlvo !== null && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-[#52525b]">
                                {meta.valorAtual ?? 0} / {meta.valorAlvo} {meta.unidade}
                              </span>
                              <span className="text-xs font-mono text-[#a1a1aa]">{pct?.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-[#1a1a1f] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct ?? 0}%`,
                                    background: pct === 100 ? "#22c55e" : cat.cor,
                                  }}
                                />
                              </div>
                              {/* Atualizar progresso inline */}
                              {atualizandoId === meta.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={novoValor}
                                    onChange={(e) => setNovoValor(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") atualizarProgresso(meta); if (e.key === "Escape") setAtualizandoId(null); }}
                                    className="w-20 h-6 text-xs bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] px-2"
                                    autoFocus
                                  />
                                  <button onClick={() => atualizarProgresso(meta)} className="text-xs text-[#22c55e] hover:text-[#16a34a] px-1">✓</button>
                                  <button onClick={() => setAtualizandoId(null)} className="text-xs text-[#52525b] hover:text-[#a1a1aa] px-1">✕</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setAtualizandoId(meta.id); setNovoValor(meta.valorAtual?.toString() ?? "0"); }}
                                  className="flex items-center gap-1 text-[10px] text-[#52525b] hover:text-[#a1a1aa] transition-colors border border-[#27272a] rounded px-2 py-0.5 hover:border-[#3f3f46] flex-shrink-0"
                                >
                                  <ChevronUp size={10} /> Atualizar
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Metas concluídas */}
          {concluidas.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Check size={14} className="text-[#22c55e]" />
                <h3 className="text-sm font-medium text-[#52525b]">Concluídas ({concluidas.length})</h3>
                <div className="flex-1 h-px bg-[#27272a]" />
              </div>
              <div className="space-y-2">
                {concluidas.map((meta) => {
                  const cat = getCat(meta.categoria);
                  const CatIcon = cat.icon;
                  return (
                    <div key={meta.id} className="bg-[#111113] border border-[#27272a] rounded-xl px-5 py-3 opacity-60 group hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cat.cor}20` }}>
                          <CatIcon size={14} style={{ color: cat.cor }} />
                        </div>
                        <p className="flex-1 text-sm text-[#a1a1aa] line-through">{meta.titulo}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => concluir(meta)} className="text-xs text-[#52525b] hover:text-[#a1a1aa] px-2 py-1 border border-[#27272a] rounded transition-colors">Reabrir</button>
                          <button onClick={() => excluir(meta.id)} className="w-6 h-6 flex items-center justify-center text-[#52525b] hover:text-[#ef4444] transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">
              {editando ? "Editar Meta" : "Nova Meta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Título</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Perder 5kg, Ler 12 livros..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Descrição (opcional)</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Mais detalhes sobre a meta..."
                rows={2}
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] resize-none"
              />
            </div>

            {/* Categoria */}
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Categoria</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIAS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setForm((f) => ({ ...f, categoria: c.id }))}
                      className={`flex items-center gap-1.5 px-2.5 py-2 text-xs rounded-lg border transition-colors ${
                        form.categoria === c.id
                          ? "border-current"
                          : "border-[#27272a] text-[#a1a1aa] hover:bg-[#1a1a1f]"
                      }`}
                      style={form.categoria === c.id ? { color: c.cor, borderColor: c.cor, background: `${c.cor}15` } : {}}
                    >
                      <Icon size={12} /> {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tipo */}
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Tipo</Label>
              <div className="flex gap-2">
                {(["quantitativa", "qualitativa"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                      form.tipo === t
                        ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                        : "border-[#27272a] text-[#a1a1aa] hover:bg-[#1a1a1f]"
                    }`}
                  >
                    {t === "quantitativa" ? "Quantitativa" : "Qualitativa"}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos quantitativos */}
            {form.tipo === "quantitativa" && (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Atual</Label>
                  <Input type="number" value={form.valorAtual} onChange={(e) => setForm((f) => ({ ...f, valorAtual: e.target.value }))} placeholder="0" className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]" />
                </div>
                <div className="col-span-1">
                  <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Meta</Label>
                  <Input type="number" value={form.valorAlvo} onChange={(e) => setForm((f) => ({ ...f, valorAlvo: e.target.value }))} placeholder="100" className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]" />
                </div>
                <div className="col-span-1">
                  <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Unidade</Label>
                  <Input value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))} placeholder="kg, km..." className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]" />
                </div>
              </div>
            )}

            {/* Prazo */}
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Prazo (opcional)</Label>
              <Input
                type="date"
                value={form.prazo}
                onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]"
              />
              {form.prazo && (
                <p className="text-xs text-[#52525b] mt-1">
                  {format(new Date(form.prazo + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.titulo} className="flex-1 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                {salvando ? "Salvando..." : editando ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
