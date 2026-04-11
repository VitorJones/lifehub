"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Trash2, Check, List, Columns, Tag, Calendar, ChevronDown,
  AlertCircle, ArrowUp, Minus, ArrowDown, Clock, X, GripVertical,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Tarefa {
  id:         string;
  titulo:     string;
  descricao:  string | null;
  status:     "pendente" | "em_andamento" | "concluida";
  prioridade: "baixa" | "media" | "alta" | "urgente";
  dataLimite: string | null;
  tags:       string | null; // JSON string[]
  createdAt:  string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const PRIORIDADES = [
  { value: "urgente", label: "Urgente", cor: "#ef4444", Icon: AlertCircle },
  { value: "alta",    label: "Alta",    cor: "#f97316", Icon: ArrowUp     },
  { value: "media",   label: "Média",   cor: "#3b82f6", Icon: Minus       },
  { value: "baixa",   label: "Baixa",   cor: "#52525b", Icon: ArrowDown   },
] as const;

const COLUNAS_KANBAN = [
  { status: "pendente",    label: "Pendente",     cor: "#52525b" },
  { status: "em_andamento",label: "Em Andamento", cor: "#f97316" },
  { status: "concluida",   label: "Concluída",    cor: "#22c55e" },
] as const;

const FORM_VAZIO = {
  titulo:     "",
  descricao:  "",
  prioridade: "media" as Tarefa["prioridade"],
  dataLimite: "",
  tagInput:   "",
  tags:       [] as string[],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTags(t: string | null): string[] {
  if (!t) return [];
  try { return JSON.parse(t) as string[]; } catch { return []; }
}

function labelPrioridade(p: Tarefa["prioridade"]) {
  return PRIORIDADES.find((x) => x.value === p)!;
}

function corStatus(s: Tarefa["status"]): string {
  return COLUNAS_KANBAN.find((c) => c.status === s)?.cor ?? "#52525b";
}

function formatarData(iso: string | null): string {
  if (!iso) return "";
  return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
}

function badgeData(iso: string | null): { label: string; cor: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isToday(d))      return { label: "Hoje",    cor: "#eab308" };
  if (isPast(d))       return { label: "Atrasado",cor: "#ef4444" };
  return { label: formatarData(iso), cor: "#52525b" };
}

function ordenarTarefas(tarefas: Tarefa[]): Tarefa[] {
  const ordemPrioridade = { urgente: 0, alta: 1, media: 2, baixa: 3 };
  return [...tarefas].sort(
    (a, b) =>
      ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade] ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

// ─── Badge de prioridade ──────────────────────────────────────────────────────

function BadgePrioridade({ p }: { p: Tarefa["prioridade"] }) {
  const { label, cor, Icon } = labelPrioridade(p);
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: `${cor}20`, color: cor }}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}

// ─── Badge de tag ─────────────────────────────────────────────────────────────

function BadgeTag({ tag, onRemover }: { tag: string; onRemover?: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-[#1a1a1f] border border-[#27272a] rounded-full text-[10px] text-[#a1a1aa]">
      <Tag size={9} />
      {tag}
      {onRemover && (
        <button onClick={onRemover} className="hover:text-[#ef4444] transition-colors ml-0.5">
          <X size={9} />
        </button>
      )}
    </span>
  );
}

// ─── Modal de tarefa ──────────────────────────────────────────────────────────

function ModalTarefa({
  open,
  onClose,
  onSalvar,
  onExcluir,
  editando,
  statusInicial,
}: {
  open:          boolean;
  onClose:       () => void;
  onSalvar:      (f: typeof FORM_VAZIO, status: Tarefa["status"]) => Promise<void>;
  onExcluir?:    () => Promise<void>;
  editando:      Tarefa | null;
  statusInicial: Tarefa["status"];
}) {
  const [form, setForm]       = useState(FORM_VAZIO);
  const [status, setStatus]   = useState<Tarefa["status"]>("pendente");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editando) {
      setForm({
        titulo:     editando.titulo,
        descricao:  editando.descricao ?? "",
        prioridade: editando.prioridade,
        dataLimite: editando.dataLimite
          ? format(new Date(editando.dataLimite), "yyyy-MM-dd")
          : "",
        tagInput: "",
        tags:     parseTags(editando.tags),
      });
      setStatus(editando.status);
    } else {
      setForm(FORM_VAZIO);
      setStatus(statusInicial);
    }
  }, [open, editando, statusInicial]);

  const set = <K extends keyof typeof FORM_VAZIO>(k: K, v: (typeof FORM_VAZIO)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const adicionarTag = () => {
    const t = form.tagInput.trim();
    if (!t || form.tags.includes(t)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, t], tagInput: "" }));
  };

  const removerTag = (tag: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const salvar = async () => {
    if (!form.titulo.trim()) return;
    setSalvando(true);
    try { await onSalvar(form, status); onClose(); }
    finally { setSalvando(false); }
  };

  const excluir = async () => {
    if (!onExcluir) return;
    setSalvando(true);
    try { await onExcluir(); onClose(); }
    finally { setSalvando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-[#f5f5f5]">
            {editando ? "Editar Tarefa" : "Nova Tarefa"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">

          {/* Título */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Título *</Label>
            <Input
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Descreva a tarefa..."
              className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Descrição (opcional)</Label>
            <textarea
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder="Mais detalhes sobre a tarefa..."
              rows={3}
              className="w-full bg-[#1a1a1f] border border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#f97316]"
            />
          </div>

          {/* Prioridade + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Prioridade</Label>
              <select
                value={form.prioridade}
                onChange={(e) => set("prioridade", e.target.value as Tarefa["prioridade"])}
                className="w-full bg-[#1a1a1f] border border-[#27272a] text-[#f5f5f5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#f97316]"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Tarefa["status"])}
                className="w-full bg-[#1a1a1f] border border-[#27272a] text-[#f5f5f5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#f97316]"
              >
                {COLUNAS_KANBAN.map((c) => (
                  <option key={c.status} value={c.status}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data limite */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Data limite (opcional)</Label>
            <Input
              type="date"
              value={form.dataLimite}
              onChange={(e) => set("dataLimite", e.target.value)}
              className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] [color-scheme:dark]"
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Tags</Label>
            <div className="flex gap-2">
              <Input
                value={form.tagInput}
                onChange={(e) => set("tagInput", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarTag(); } }}
                placeholder="Adicionar tag..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] flex-1"
              />
              <button
                type="button"
                onClick={adicionarTag}
                className="px-3 py-2 bg-[#1a1a1f] border border-[#27272a] rounded-md text-[#a1a1aa] hover:text-[#f5f5f5] text-sm transition-colors"
              >
                +
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t) => (
                  <BadgeTag key={t} tag={t} onRemover={() => removerTag(t)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#27272a]">
          <div>
            {editando && onExcluir && (
              <button
                onClick={excluir}
                disabled={salvando}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
              >
                <Trash2 size={14} /> Excluir
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando || !form.titulo.trim()}
              className="px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {salvando ? "Salvando..." : editando ? "Salvar" : "Criar Tarefa"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de tarefa (lista) ───────────────────────────────────────────────────

function TarefaCard({
  tarefa,
  onEditar,
  onToggleConcluida,
}: {
  tarefa:           Tarefa;
  onEditar:         () => void;
  onToggleConcluida:() => void;
}) {
  const tags      = parseTags(tarefa.tags);
  const dataBadge = badgeData(tarefa.dataLimite);
  const concluida = tarefa.status === "concluida";

  return (
    <div
      onClick={onEditar}
      className={`
        group flex items-start gap-3 p-4 rounded-xl border cursor-pointer
        transition-all duration-150
        ${concluida
          ? "bg-[#0d0d0f] border-[#1a1a1f] opacity-60"
          : "bg-[#111113] border-[#27272a] hover:border-[#3f3f46]"}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleConcluida(); }}
        className={`
          mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
          transition-all duration-200
          ${concluida
            ? "border-[#22c55e] bg-[#22c55e]"
            : "border-[#3f3f46] hover:border-[#f97316]"}
        `}
      >
        {concluida && <Check size={11} className="text-white" />}
      </button>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${concluida ? "line-through text-[#52525b]" : "text-[#f5f5f5]"}`}>
          {tarefa.titulo}
        </p>
        {tarefa.descricao && !concluida && (
          <p className="text-xs text-[#52525b] mt-0.5 line-clamp-1">{tarefa.descricao}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <BadgePrioridade p={tarefa.prioridade} />
          {dataBadge && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: `${dataBadge.cor}20`, color: dataBadge.cor }}
            >
              <Clock size={9} />
              {dataBadge.label}
            </span>
          )}
          {tags.map((t) => <BadgeTag key={t} tag={t} />)}
        </div>
      </div>

      {/* Indicador de status */}
      <div
        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
        style={{ background: corStatus(tarefa.status) }}
      />
    </div>
  );
}

// ─── Card kanban ──────────────────────────────────────────────────────────────

function KanbanCard({
  tarefa,
  onEditar,
  onToggleConcluida,
}: {
  tarefa:            Tarefa;
  onEditar:          () => void;
  onToggleConcluida: () => void;
}) {
  const tags      = parseTags(tarefa.tags);
  const dataBadge = badgeData(tarefa.dataLimite);
  const concluida = tarefa.status === "concluida";

  return (
    <div
      onClick={onEditar}
      draggable
      className={`
        p-3 rounded-lg border cursor-pointer
        transition-all duration-150 hover:border-[#3f3f46]
        ${concluida ? "bg-[#0d0d0f] border-[#1a1a1f] opacity-70" : "bg-[#111113] border-[#27272a]"}
      `}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleConcluida(); }}
          className={`
            mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
            transition-all duration-200
            ${concluida ? "border-[#22c55e] bg-[#22c55e]" : "border-[#3f3f46] hover:border-[#f97316]"}
          `}
        >
          {concluida && <Check size={9} className="text-white" />}
        </button>
        <p className={`text-sm font-medium leading-snug flex-1 min-w-0 ${concluida ? "line-through text-[#52525b]" : "text-[#f5f5f5]"}`}>
          {tarefa.titulo}
        </p>
        <GripVertical size={13} className="text-[#3f3f46] shrink-0 mt-0.5" />
      </div>

      {tarefa.descricao && !concluida && (
        <p className="text-[11px] text-[#52525b] mt-1.5 ml-6 line-clamp-2">{tarefa.descricao}</p>
      )}

      <div className="flex flex-wrap items-center gap-1 mt-2 ml-6">
        <BadgePrioridade p={tarefa.prioridade} />
        {dataBadge && (
          <span
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium"
            style={{ background: `${dataBadge.cor}20`, color: dataBadge.cor }}
          >
            <Clock size={8} />
            {dataBadge.label}
          </span>
        )}
        {tags.map((t) => <BadgeTag key={t} tag={t} />)}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function TarefasPage() {
  const [tarefas, setTarefas]   = useState<Tarefa[]>([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<"lista" | "kanban">("lista");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [statusInicial, setStatusInicial] = useState<Tarefa["status"]>("pendente");

  // Filtros
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [filtroStatus,     setFiltroStatus]     = useState("");
  const [filtroTag,        setFiltroTag]         = useState("");
  const [busca,            setBusca]             = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tarefas");
      setTarefas(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Todas as tags existentes para o filtro
  const todasTags = useMemo(() => {
    const set = new Set<string>();
    tarefas.forEach((t) => parseTags(t.tags).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [tarefas]);

  // Tarefas filtradas
  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (filtroPrioridade && t.prioridade !== filtroPrioridade) return false;
      if (filtroStatus     && t.status     !== filtroStatus)     return false;
      if (filtroTag        && !parseTags(t.tags).includes(filtroTag)) return false;
      if (busca && !t.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [tarefas, filtroPrioridade, filtroStatus, filtroTag, busca]);

  // Contadores por status (para kanban)
  const porStatus = useMemo(() => {
    const map: Record<string, Tarefa[]> = {
      pendente: [], em_andamento: [], concluida: [],
    };
    ordenarTarefas(tarefasFiltradas).forEach((t) => map[t.status]?.push(t));
    return map;
  }, [tarefasFiltradas]);

  // Resumo
  const total     = tarefas.length;
  const concluidas = tarefas.filter((t) => t.status === "concluida").length;
  const urgentes  = tarefas.filter((t) => t.prioridade === "urgente" && t.status !== "concluida").length;
  const atrasadas = tarefas.filter((t) =>
    t.dataLimite && isPast(new Date(t.dataLimite)) && t.status !== "concluida"
  ).length;

  const abrirNovo = (s: Tarefa["status"] = "pendente") => {
    setEditando(null);
    setStatusInicial(s);
    setModalAberto(true);
  };

  const abrirEditar = (t: Tarefa) => {
    setEditando(t);
    setStatusInicial(t.status);
    setModalAberto(true);
  };

  const salvarTarefa = async (form: typeof FORM_VAZIO, status: Tarefa["status"]) => {
    const body = {
      titulo:     form.titulo.trim(),
      descricao:  form.descricao || null,
      status,
      prioridade: form.prioridade,
      dataLimite: form.dataLimite || null,
      tags:       form.tags.length > 0 ? form.tags : null,
    };
    const url    = editando ? `/api/tarefas/${editando.id}` : "/api/tarefas";
    const method = editando ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    carregar();
  };

  const excluirTarefa = async () => {
    if (!editando) return;
    await fetch(`/api/tarefas/${editando.id}`, { method: "DELETE" });
    carregar();
  };

  const toggleConcluida = async (t: Tarefa) => {
    const novoStatus = t.status === "concluida" ? "pendente" : "concluida";
    await fetch(`/api/tarefas/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...t, tags: parseTags(t.tags), status: novoStatus }),
    });
    carregar();
  };

  const moverKanban = async (t: Tarefa, novoStatus: Tarefa["status"]) => {
    if (t.status === novoStatus) return;
    await fetch(`/api/tarefas/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...t, tags: parseTags(t.tags), status: novoStatus }),
    });
    carregar();
  };

  const temFiltro = filtroPrioridade || filtroStatus || filtroTag || busca;
  const limparFiltros = () => {
    setFiltroPrioridade(""); setFiltroStatus(""); setFiltroTag(""); setBusca("");
  };

  return (
    <div className="p-4 md:p-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-[#f5f5f5]">Tarefas</h1>
          <p className="text-sm text-[#a1a1aa] mt-0.5">
            {concluidas}/{total} concluídas
            {urgentes  > 0 && <span className="text-[#ef4444] ml-2">· {urgentes} urgente{urgentes > 1 ? "s" : ""}</span>}
            {atrasadas > 0 && <span className="text-[#ef4444] ml-2">· {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle lista/kanban */}
          <div className="flex bg-[#1a1a1f] rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setView("lista")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                view === "lista" ? "bg-[#222228] text-[#f5f5f5]" : "text-[#a1a1aa] hover:text-[#f5f5f5]"
              }`}
            >
              <List size={13} /> Lista
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                view === "kanban" ? "bg-[#222228] text-[#f5f5f5]" : "text-[#a1a1aa] hover:text-[#f5f5f5]"
              }`}
            >
              <Columns size={13} /> Kanban
            </button>
          </div>
          <button
            onClick={() => abrirNovo()}
            className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* ── Cards resumo ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: "Total",        valor: total,                   cor: "#a1a1aa" },
          { label: "Em andamento", valor: porStatus.em_andamento?.length ?? 0, cor: "#f97316" },
          { label: "Urgentes",     valor: urgentes,                cor: "#ef4444" },
          { label: "Atrasadas",    valor: atrasadas,               cor: "#ef4444" },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
            <p className="text-xs text-[#52525b] mb-1">{label}</p>
            <p className="text-xl md:text-2xl font-heading font-semibold" style={{ color: cor }}>{valor}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Busca */}
        <div className="relative flex-1 min-w-48">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tarefas..."
            className="bg-[#111113] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] pl-3"
          />
        </div>

        {/* Prioridade */}
        <div className="relative">
          <select
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            className="appearance-none bg-[#111113] border border-[#27272a] text-[#a1a1aa] rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:border-[#f97316]"
          >
            <option value="">Todas prioridades</option>
            {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#52525b] pointer-events-none" />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="appearance-none bg-[#111113] border border-[#27272a] text-[#a1a1aa] rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:border-[#f97316]"
          >
            <option value="">Todos status</option>
            {COLUNAS_KANBAN.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#52525b] pointer-events-none" />
        </div>

        {/* Tag */}
        {todasTags.length > 0 && (
          <div className="relative">
            <select
              value={filtroTag}
              onChange={(e) => setFiltroTag(e.target.value)}
              className="appearance-none bg-[#111113] border border-[#27272a] text-[#a1a1aa] rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:border-[#f97316]"
            >
              <option value="">Todas tags</option>
              {todasTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#52525b] pointer-events-none" />
          </div>
        )}

        {/* Limpar filtros */}
        {temFiltro && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1 px-3 py-2 text-xs text-[#a1a1aa] hover:text-[#f5f5f5] border border-[#27272a] rounded-lg transition-colors"
          >
            <X size={11} /> Limpar
          </button>
        )}
      </div>

      {/* ── Conteúdo ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : view === "lista" ? (

        /* ── Vista Lista ─────────────────────────────────────────────── */
        <div>
          {tarefasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#f97316]/10 flex items-center justify-center mb-4">
                <Check size={24} className="text-[#f97316]" />
              </div>
              <p className="text-[#a1a1aa] font-medium mb-1">
                {temFiltro ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa criada ainda"}
              </p>
              <p className="text-[#52525b] text-sm mb-4">
                {temFiltro ? "Tente ajustar os filtros" : 'Crie sua primeira tarefa clicando em "+ Nova Tarefa"'}
              </p>
              {!temFiltro && (
                <button
                  onClick={() => abrirNovo()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={14} /> Nova Tarefa
                </button>
              )}
            </div>
          ) : (
            /* Agrupado por status */
            <div className="space-y-6">
              {COLUNAS_KANBAN.map(({ status, label, cor }) => {
                const grupo = ordenarTarefas(
                  tarefasFiltradas.filter((t) => t.status === status)
                );
                if (grupo.length === 0) return null;
                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: cor }} />
                      <h3 className="text-sm font-medium text-[#a1a1aa]">{label}</h3>
                      <span className="text-xs text-[#52525b] bg-[#1a1a1f] px-2 py-0.5 rounded-full">
                        {grupo.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {grupo.map((t) => (
                        <TarefaCard
                          key={t.id}
                          tarefa={t}
                          onEditar={() => abrirEditar(t)}
                          onToggleConcluida={() => toggleConcluida(t)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : (

        /* ── Vista Kanban ────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUNAS_KANBAN.map(({ status, label, cor }) => {
            const grupo = porStatus[status] ?? [];
            return (
              <div
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("tarefaId");
                  const t  = tarefas.find((x) => x.id === id);
                  if (t) moverKanban(t, status as Tarefa["status"]);
                }}
                className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-xl p-3 min-h-64"
              >
                {/* Cabeçalho coluna */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: cor }} />
                    <h3 className="text-sm font-medium text-[#a1a1aa]">{label}</h3>
                    <span className="text-xs text-[#52525b] bg-[#1a1a1f] px-2 py-0.5 rounded-full">
                      {grupo.length}
                    </span>
                  </div>
                  <button
                    onClick={() => abrirNovo(status as Tarefa["status"])}
                    className="w-6 h-6 flex items-center justify-center text-[#52525b] hover:text-[#f97316] hover:bg-[#f97316]/10 rounded-md transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {grupo.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("tarefaId", t.id)}
                    >
                      <KanbanCard
                        tarefa={t}
                        onEditar={() => abrirEditar(t)}
                        onToggleConcluida={() => toggleConcluida(t)}
                      />
                    </div>
                  ))}
                  {grupo.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#3f3f46]">
                      Arraste tarefas aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      )}

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <ModalTarefa
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSalvar={salvarTarefa}
        onExcluir={editando ? excluirTarefa : undefined}
        editando={editando}
        statusInicial={statusInicial}
      />
    </div>
  );
}
