"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, getDay, getDaysInMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, MapPin, Clock, RefreshCw, Trash2, Calendar, Cake,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Evento {
  id:              string;
  titulo:          string;
  descricao:       string | null;
  dataInicio:      string;
  dataFim:         string | null;
  local:           string | null;
  cor:             string;
  diaInteiro:      boolean;
  lembrete:        number | null;
  tipo:            string;            // "evento" | "aniversario"
  recorrencia:     string | null;
  diasRecorrencia: string | null;     // JSON "[0,1,2]"
  excecoes:        string | null;     // JSON ["yyyy-MM-dd"]
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const CORES_EVENTO = [
  "#3b82f6", "#22c55e", "#ef4444", "#f97316",
  "#a855f7", "#eab308", "#ec4899", "#06b6d4",
];

const RECORRENCIAS = [
  { value: "",             label: "Não repete"     },
  { value: "diario",       label: "Diariamente"    },
  { value: "semanal",      label: "Semanalmente"   },
  { value: "mensal",       label: "Mensalmente"    },
  { value: "anual",        label: "Anualmente"     },
  { value: "personalizado",label: "Personalizado"  },
];

const DIAS_SEMANA     = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_SIG = ["D",   "S",   "T",   "Q",   "Q",   "S",   "S"];

const FORM_VAZIO = {
  tipo:            "evento" as "evento" | "aniversario",
  titulo:          "",
  descricao:       "",
  local:           "",
  dataInicio:      format(new Date(), "yyyy-MM-dd"),
  horaInicio:      "09:00",
  dataFim:         "",
  horaFim:         "",
  diaInteiro:      false,
  cor:             "#3b82f6",
  recorrencia:     "",
  diasRecorrencia: [] as number[],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function localDateStr(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

function formatarHora(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

function labelRecorrencia(e: Evento): string {
  if (!e.recorrencia) return "";
  if (e.recorrencia === "personalizado" && e.diasRecorrencia) {
    const dias = JSON.parse(e.diasRecorrencia) as number[];
    return dias.map((d) => DIAS_SEMANA[d]).join(", ");
  }
  return RECORRENCIAS.find((r) => r.value === e.recorrencia)?.label ?? "";
}

function excecoes(e: Evento): string[] {
  return e.excecoes ? (JSON.parse(e.excecoes) as string[]) : [];
}

/** Verifica se um evento ocorre num dado dia (ds = "yyyy-MM-dd") */
function ocorrNoDia(evento: Evento, ds: string): boolean {
  const inicioDs = localDateStr(evento.dataInicio);
  if (ds < inicioDs) return false;

  // checar exceções
  if (excecoes(evento).includes(ds)) return false;

  if (!evento.recorrencia) return inicioDs === ds;

  // Para evitar erros de fuso horário, usar strings em vez de getDate()/getMonth()
  // inicioDs e ds estão ambas em "yyyy-MM-dd" local
  switch (evento.recorrencia) {
    case "diario":  return true;
    case "semanal": {
      const alvo  = new Date(ds        + "T12:00:00");
      const inicio = new Date(inicioDs + "T12:00:00");
      return alvo.getDay() === inicio.getDay();
    }
    case "mensal":
      // mesmo dia do mês: compara os 2 últimos chars "DD"
      return ds.slice(8) === inicioDs.slice(8);
    case "anual":
      // mesmo mês e dia: compara "MM-DD"
      return ds.slice(5) === inicioDs.slice(5);
    case "personalizado": {
      if (!evento.diasRecorrencia) return false;
      const dias  = JSON.parse(evento.diasRecorrencia) as number[];
      const alvo  = new Date(ds + "T12:00:00");
      return dias.includes(alvo.getDay());
    }
    default: return false;
  }
}

function eventoParaForm(e: Evento): typeof FORM_VAZIO {
  const ini = new Date(e.dataInicio);
  return {
    tipo:            (e.tipo as "evento" | "aniversario") ?? "evento",
    titulo:          e.titulo,
    descricao:       e.descricao ?? "",
    local:           e.local ?? "",
    dataInicio:      format(ini, "yyyy-MM-dd"),
    horaInicio:      e.diaInteiro ? "09:00" : format(ini, "HH:mm"),
    dataFim:         e.dataFim ? format(new Date(e.dataFim), "yyyy-MM-dd") : "",
    horaFim:         e.dataFim && !e.diaInteiro ? format(new Date(e.dataFim), "HH:mm") : "",
    diaInteiro:      e.diaInteiro,
    cor:             e.cor,
    recorrencia:     e.recorrencia ?? "",
    diasRecorrencia: e.diasRecorrencia ? (JSON.parse(e.diasRecorrencia) as number[]) : [],
  };
}

function ordenarEventos(ev: Evento[]): Evento[] {
  return [...ev].sort(
    (a, b) =>
      (a.tipo === "aniversario" ? -1 : 0) - (b.tipo === "aniversario" ? -1 : 0) ||
      (a.diaInteiro ? 0 : 1) - (b.diaInteiro ? 0 : 1) ||
      a.dataInicio.localeCompare(b.dataInicio),
  );
}

// ─── Modal de Confirmação de Exclusão ─────────────────────────────────────────

function ModalExcluir({
  open,
  onClose,
  onExcluirEste,
  onExcluirTodos,
  ds,
}: {
  open:            boolean;
  onClose:         () => void;
  onExcluirEste:   () => Promise<void>;
  onExcluirTodos:  () => Promise<void>;
  ds:              string;
}) {
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); onClose(); }
    finally { setLoading(false); }
  };

  const label = ds
    ? format(new Date(ds + "T12:00:00"), "d 'de' MMMM", { locale: ptBR })
    : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-[#f5f5f5]">Excluir evento recorrente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#a1a1aa] mt-1">
          Este evento se repete. O que deseja excluir?
        </p>
        <div className="flex flex-col gap-2 mt-3">
          <button
            onClick={() => run(onExcluirEste)}
            disabled={loading}
            className="w-full px-4 py-3 rounded-lg border border-[#27272a] text-left hover:bg-[#1a1a1f] transition-colors"
          >
            <p className="text-sm font-medium text-[#f5f5f5]">Somente este evento</p>
            <p className="text-xs text-[#52525b] mt-0.5">Remove apenas o dia {label}</p>
          </button>
          <button
            onClick={() => run(onExcluirTodos)}
            disabled={loading}
            className="w-full px-4 py-3 rounded-lg border border-[#ef4444]/30 text-left hover:bg-[#ef4444]/5 transition-colors"
          >
            <p className="text-sm font-medium text-[#ef4444]">Todos os eventos</p>
            <p className="text-xs text-[#52525b] mt-0.5">Remove a recorrência inteira</p>
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-2 w-full py-2 text-sm text-[#52525b] hover:text-[#a1a1aa] transition-colors"
        >
          Cancelar
        </button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Evento ─────────────────────────────────────────────────────────

function ModalEvento({
  open,
  onClose,
  onSalvar,
  onIniciarExclusao,
  editando,
  diaPre,
}: {
  open:             boolean;
  onClose:          () => void;
  onSalvar:         (f: typeof FORM_VAZIO) => Promise<void>;
  onIniciarExclusao?: () => void;
  editando:         Evento | null;
  diaPre:           string;
}) {
  const [form, setForm]     = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editando) {
      setForm(eventoParaForm(editando));
    } else {
      setForm({
        ...FORM_VAZIO,
        dataInicio: diaPre,
        cor: "#3b82f6",
        diasRecorrencia: [],
      });
    }
  }, [open, editando, diaPre]);

  const set = <K extends keyof typeof FORM_VAZIO>(k: K, v: (typeof FORM_VAZIO)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleDiaRec = (d: number) =>
    setForm((f) => ({
      ...f,
      diasRecorrencia: f.diasRecorrencia.includes(d)
        ? f.diasRecorrencia.filter((x) => x !== d)
        : [...f.diasRecorrencia, d],
    }));

  // Aniversário: força dia inteiro + recorrência anual + cor rosa
  const setTipo = (t: "evento" | "aniversario") => {
    setForm((f) => ({
      ...f,
      tipo:        t,
      diaInteiro:  t === "aniversario" ? true : f.diaInteiro,
      recorrencia: t === "aniversario" ? "anual" : f.recorrencia,
      cor:         t === "aniversario" ? "#ec4899" : f.cor,
    }));
  };

  const salvar = async () => {
    if (!form.titulo) return;
    setSalvando(true);
    try { await onSalvar(form); onClose(); }
    finally { setSalvando(false); }
  };

  const isAniv = form.tipo === "aniversario";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-[#f5f5f5]">
            {editando ? "Editar" : "Novo"}{" "}
            {isAniv ? "Aniversário" : "Evento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">

          {/* Tipo: Evento | Aniversário */}
          <div className="flex bg-[#1a1a1f] rounded-lg p-1 gap-1">
            {(["evento", "aniversario"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  form.tipo === t
                    ? t === "aniversario"
                      ? "bg-[#ec4899]/20 text-[#ec4899]"
                      : "bg-[#3b82f6]/20 text-[#3b82f6]"
                    : "text-[#a1a1aa] hover:text-[#f5f5f5]"
                }`}
              >
                {t === "aniversario" ? <Cake size={12} /> : <Calendar size={12} />}
                {t === "aniversario" ? "Aniversário" : "Evento"}
              </button>
            ))}
          </div>

          {/* Título */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">
              {isAniv ? "Nome da pessoa *" : "Título *"}
            </Label>
            <Input
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder={isAniv ? "Ex: Mamãe, João, Ana..." : "Nome do evento..."}
              className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              onKeyDown={(e) => e.key === "Enter" && salvar()}
            />
          </div>

          {/* Toggle dia inteiro (oculto para aniversário) */}
          {!isAniv && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set("diaInteiro", !form.diaInteiro)}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  form.diaInteiro ? "bg-[#3b82f6]" : "bg-[#27272a]"
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                  form.diaInteiro ? "left-4" : "left-0.5"
                }`} />
              </button>
              <span className="text-sm text-[#a1a1aa]">Dia inteiro</span>
            </div>
          )}

          {/* Data início + hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">
                {isAniv ? "Dia de Aniversário *" : "Data início *"}
              </Label>
              <Input
                type="date"
                value={form.dataInicio}
                onChange={(e) => set("dataInicio", e.target.value)}
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] [color-scheme:dark]"
              />
            </div>
            {!form.diaInteiro && !isAniv ? (
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Hora início</Label>
                <Input
                  type="time"
                  value={form.horaInicio}
                  onChange={(e) => set("horaInicio", e.target.value)}
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] [color-scheme:dark]"
                />
              </div>
            ) : <div />}
          </div>

          {/* Data fim + hora (não para aniversário) */}
          {!isAniv && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Data fim (opcional)</Label>
                <Input
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => set("dataFim", e.target.value)}
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] [color-scheme:dark]"
                />
              </div>
              {!form.diaInteiro ? (
                <div>
                  <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Hora fim</Label>
                  <Input
                    type="time"
                    value={form.horaFim}
                    onChange={(e) => set("horaFim", e.target.value)}
                    className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] [color-scheme:dark]"
                  />
                </div>
              ) : <div />}
            </div>
          )}

          {/* Local (não para aniversário) */}
          {!isAniv && (
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Local (opcional)</Label>
              <Input
                value={form.local}
                onChange={(e) => set("local", e.target.value)}
                placeholder="Ex: Consultório, Zoom, Academia..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              />
            </div>
          )}

          {/* Descrição */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">
              {isAniv ? "Observação (opcional)" : "Descrição (opcional)"}
            </Label>
            <Input
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder={isAniv ? "Ex: Liga às 9h..." : "Anotações do evento..."}
              className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
            />
          </div>

          {/* Recorrência (oculto para aniversário — sempre anual) */}
          {!isAniv && (
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Recorrência</Label>
              <select
                value={form.recorrencia}
                onChange={(e) => set("recorrencia", e.target.value)}
                className="w-full bg-[#1a1a1f] border border-[#27272a] text-[#f5f5f5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#3b82f6]"
              >
                {RECORRENCIAS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              {/* Seletor de dias para recorrência personalizada */}
              {form.recorrencia === "personalizado" && (
                <div className="mt-2">
                  <p className="text-[11px] text-[#52525b] mb-2">Repete nos dias:</p>
                  <div className="flex gap-1.5">
                    {DIAS_SEMANA_SIG.map((sig, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDiaRec(i)}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                          form.diasRecorrencia.includes(i)
                            ? "bg-[#3b82f6] text-white"
                            : "bg-[#1a1a1f] border border-[#27272a] text-[#a1a1aa] hover:border-[#3b82f6]"
                        }`}
                      >
                        {sig}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cor */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Cor</Label>
            <div className="flex gap-2">
              {CORES_EVENTO.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => set("cor", cor)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.cor === cor ? "border-white scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: cor }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#27272a]">
          <div>
            {editando && onIniciarExclusao && (
              <button
                onClick={onIniciarExclusao}
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
              disabled={salvando || !form.titulo}
              className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                isAniv
                  ? "bg-[#ec4899] hover:bg-[#db2777]"
                  : "bg-[#3b82f6] hover:bg-[#2563eb]"
              }`}
            >
              {salvando ? "Salvando..." : editando ? "Salvar" : isAniv ? "Adicionar Aniversário" : "Criar Evento"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [mes, setMes]             = useState(new Date().getMonth() + 1);
  const [ano, setAno]             = useState(new Date().getFullYear());
  const [eventos, setEventos]     = useState<Evento[]>([]);
  const [loading, setLoading]     = useState(true);
  const [diaSel, setDiaSel]       = useState(dataStr(new Date()));
  const [modalAberto, setModalAberto]   = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [editando, setEditando]   = useState<Evento | null>(null);
  const [diaSelecionadoExclusao, setDiaSelecionadoExclusao] = useState("");
  const [diaPre, setDiaPre]       = useState(dataStr(new Date()));

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eventos");
      setEventos(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Células do calendário (padding mês anterior/próximo)
  const celulas = useMemo(() => {
    const primeiroDia = new Date(ano, mes - 1, 1);
    const primeiroDow = getDay(primeiroDia);
    const numDias     = getDaysInMonth(primeiroDia);
    const cells: { data: Date; doMes: boolean }[] = [];

    for (let i = primeiroDow - 1; i >= 0; i--)
      cells.push({ data: new Date(ano, mes - 1, -i), doMes: false });
    for (let d = 1; d <= numDias; d++)
      cells.push({ data: new Date(ano, mes - 1, d), doMes: true });
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].data;
      cells.push({ data: addDays(last, 1), doMes: false });
    }
    return cells;
  }, [mes, ano]);

  const numLinhas = celulas.length / 7;

  const eventosPorDia = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    for (const cell of celulas) {
      const d  = dataStr(cell.data);
      const ev = eventos.filter((e) => ocorrNoDia(e, d));
      if (ev.length > 0) map[d] = ordenarEventos(ev);
    }
    return map;
  }, [eventos, celulas]);

  const eventosDiaSel = useMemo(
    () => ordenarEventos(eventos.filter((e) => ocorrNoDia(e, diaSel))),
    [eventos, diaSel],
  );

  const proximosEventos = useMemo(() => {
    const result: { ds: string; evento: Evento }[] = [];
    for (let i = 0; i <= 365 && result.length < 12; i++) {
      const d    = addDays(new Date(), i);
      const dStr = dataStr(d);
      for (const e of eventos) {
        if (result.length >= 12) break;
        if (ocorrNoDia(e, dStr)) result.push({ ds: dStr, evento: e });
      }
    }
    return result;
  }, [eventos]);

  const navegarMes = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
  };

  const irParaHoje = () => {
    const h = new Date();
    setMes(h.getMonth() + 1);
    setAno(h.getFullYear());
    setDiaSel(dataStr(h));
  };

  const abrirNovo = (ds?: string) => {
    setEditando(null);
    setDiaPre(ds ?? dataStr(new Date()));
    setModalAberto(true);
  };

  const abrirEditar = (e: Evento, ds: string) => {
    setEditando(e);
    setDiaPre(ds);
    setModalAberto(true);
  };

  /** Inicia o fluxo de exclusão: se recorrente → modal de escolha; senão → exclui direto */
  const iniciarExclusao = (ds: string) => {
    if (!editando) return;
    if (editando.recorrencia) {
      // fecha o modal de edição e abre o de confirmação
      setModalAberto(false);
      setDiaSelecionadoExclusao(ds);
      setModalExcluir(true);
    } else {
      // não recorrente — exclui diretamente
      setModalAberto(false);
      excluirTodos();
    }
  };

  const excluirEsteOcorrencia = async () => {
    if (!editando) return;
    await fetch(`/api/eventos/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excecao: diaSelecionadoExclusao }),
    });
    carregar();
  };

  const excluirTodos = async () => {
    if (!editando) return;
    await fetch(`/api/eventos/${editando.id}`, { method: "DELETE" });
    carregar();
  };

  const salvarEvento = async (form: typeof FORM_VAZIO) => {
    const buildDt = (date: string, time: string) =>
      form.diaInteiro || form.tipo === "aniversario"
        ? `${date}T00:00:00`
        : `${date}T${time}:00`;

    const body = {
      titulo:          form.titulo,
      descricao:       form.descricao       || null,
      local:           form.local           || null,
      dataInicio:      buildDt(form.dataInicio, form.horaInicio),
      dataFim:         form.dataFim
        ? buildDt(form.dataFim, form.horaFim || "23:59")
        : null,
      diaInteiro:      form.diaInteiro || form.tipo === "aniversario",
      cor:             form.cor,
      tipo:            form.tipo,
      recorrencia:     form.recorrencia || null,
      diasRecorrencia: form.recorrencia === "personalizado" && form.diasRecorrencia.length > 0
        ? form.diasRecorrencia
        : null,
    };

    const url    = editando ? `/api/eventos/${editando.id}` : "/api/eventos";
    const method = editando ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    carregar();
  };

  const hojeDs = dataStr(new Date());

  return (
    <div className="flex overflow-hidden" style={{ height: "100vh" }}>

      {/* ── Calendário ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col p-6 gap-4 min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navegarMes(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="font-heading font-semibold text-[#f5f5f5] text-xl capitalize min-w-48 text-center">
              {format(new Date(ano, mes - 1, 1), "MMMM yyyy", { locale: ptBR })}
            </h2>
            <button
              onClick={() => navegarMes(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={irParaHoje}
              className="px-3 py-1.5 text-xs text-[#a1a1aa] border border-[#27272a] rounded-lg hover:text-[#f5f5f5] hover:bg-[#1a1a1f] transition-colors"
            >
              Hoje
            </button>
          </div>
          <button
            onClick={() => abrirNovo()}
            className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Novo Evento
          </button>
        </div>

        {/* Grade */}
        <div className="flex-1 flex flex-col bg-[#111113] border border-[#27272a] rounded-xl overflow-hidden min-h-0">

          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 border-b border-[#27272a] flex-shrink-0">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-2.5 text-center text-[11px] font-medium text-[#52525b] uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Células */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-[#52525b] text-sm">
              Carregando...
            </div>
          ) : (
            <div
              className="flex-1 grid grid-cols-7 min-h-0"
              style={{ gridTemplateRows: `repeat(${numLinhas}, 1fr)` }}
            >
              {celulas.map((cell, idx) => {
                const d           = dataStr(cell.data);
                const eventosCell = eventosPorDia[d] ?? [];
                const isHoje      = d === hojeDs;
                const isSel       = d === diaSel;

                return (
                  <div
                    key={idx}
                    onClick={() => setDiaSel(d)}
                    className={`
                      border-b border-r border-[#1a1a1f] p-1.5 cursor-pointer
                      transition-colors overflow-hidden
                      ${isSel && !isHoje ? "bg-[#161618]" : "hover:bg-[#0d0d0f]"}
                      ${!cell.doMes ? "opacity-25" : ""}
                    `}
                  >
                    <div className="mb-0.5">
                      <span className={`
                        text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full
                        ${isHoje
                          ? "bg-[#3b82f6] text-white"
                          : isSel
                          ? "text-[#3b82f6] font-semibold"
                          : "text-[#a1a1aa]"
                        }
                      `}>
                        {cell.data.getDate()}
                      </span>
                    </div>

                    <div className="space-y-px">
                      {eventosCell.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          onClick={(ev) => { ev.stopPropagation(); setDiaSel(d); abrirEditar(e, d); }}
                          title={e.titulo}
                          className="flex items-center gap-0.5 px-1 py-px rounded text-[10px] leading-tight truncate cursor-pointer hover:opacity-75 transition-opacity"
                          style={{
                            background: e.tipo === "aniversario" ? "#ec489922" : `${e.cor}22`,
                            color:      e.tipo === "aniversario" ? "#ec4899"   : e.cor,
                          }}
                        >
                          {e.tipo === "aniversario" ? (
                            <span className="flex-shrink-0 text-[9px]">🎂</span>
                          ) : e.diaInteiro ? (
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: e.cor }} />
                          ) : (
                            <span className="font-mono flex-shrink-0 text-[9px]">
                              {formatarHora(e.dataInicio)}
                            </span>
                          )}
                          <span className="truncate ml-0.5">{e.titulo}</span>
                        </div>
                      ))}
                      {eventosCell.length > 3 && (
                        <div className="text-[9px] text-[#52525b] pl-1">+{eventosCell.length - 3} mais</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className="w-72 border-l border-[#27272a] flex flex-col overflow-hidden bg-[#0a0a0b] flex-shrink-0">

        {/* Dia selecionado */}
        <div className="p-5 border-b border-[#27272a] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-[#52525b] uppercase tracking-wide mb-0.5 capitalize">
                {diaSel === hojeDs
                  ? "Hoje"
                  : format(new Date(diaSel + "T12:00:00"), "EEEE", { locale: ptBR })}
              </p>
              <h3 className="font-heading font-semibold text-[#f5f5f5] capitalize">
                {format(new Date(diaSel + "T12:00:00"), "d 'de' MMMM", { locale: ptBR })}
              </h3>
            </div>
            <button
              onClick={() => abrirNovo(diaSel)}
              className="w-8 h-8 flex items-center justify-center text-[#a1a1aa] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>

          {eventosDiaSel.length === 0 ? (
            <div className="flex flex-col items-center py-5 text-center">
              <Calendar size={22} className="text-[#27272a] mb-2" />
              <p className="text-xs text-[#52525b]">Nenhum evento neste dia</p>
            </div>
          ) : (
            <div className="space-y-1">
              {eventosDiaSel.map((e) => (
                <div
                  key={e.id}
                  onClick={() => abrirEditar(e, diaSel)}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer hover:bg-[#111113] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: e.cor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {e.tipo === "aniversario" && <Cake size={11} className="text-[#ec4899] flex-shrink-0" />}
                      <p className="text-sm font-medium text-[#f5f5f5] truncate">{e.titulo}</p>
                    </div>
                    {e.tipo === "aniversario" ? (
                      <p className="text-[11px] text-[#ec4899]">
                        Aniversário {(() => {
                          const nascimento = new Date(e.dataInicio);
                          const hoje = new Date();
                          const idade = hoje.getFullYear() - nascimento.getFullYear();
                          return `· ${idade} anos`;
                        })()}
                      </p>
                    ) : e.diaInteiro ? (
                      <p className="text-[11px] text-[#52525b]">Dia inteiro</p>
                    ) : (
                      <p className="text-[11px] text-[#a1a1aa] flex items-center gap-1">
                        <Clock size={10} />
                        {formatarHora(e.dataInicio)}
                        {e.dataFim ? ` – ${formatarHora(e.dataFim)}` : ""}
                      </p>
                    )}
                    {e.local && (
                      <p className="text-[11px] text-[#a1a1aa] flex items-center gap-1 truncate mt-0.5">
                        <MapPin size={10} className="flex-shrink-0" />
                        {e.local}
                      </p>
                    )}
                    {e.recorrencia && e.tipo !== "aniversario" && (
                      <p className="text-[10px] text-[#52525b] flex items-center gap-1 mt-0.5">
                        <RefreshCw size={9} />
                        {labelRecorrencia(e)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos eventos */}
        <div className="p-5 flex-1 overflow-y-auto">
          <h3 className="text-[10px] font-medium text-[#52525b] uppercase tracking-wide mb-3">
            Próximos
          </h3>
          {proximosEventos.length === 0 ? (
            <p className="text-xs text-[#52525b] text-center py-4">Nenhum evento próximo</p>
          ) : (
            <div className="space-y-1">
              {proximosEventos.map(({ ds: d, evento: e }, i) => {
                const label =
                  d === hojeDs
                    ? "Hoje"
                    : format(new Date(d + "T12:00:00"), "EEE, d MMM", { locale: ptBR });
                return (
                  <div
                    key={`${e.id}-${d}-${i}`}
                    onClick={() => { setDiaSel(d); abrirEditar(e, d); }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[#111113] transition-colors"
                  >
                    {e.tipo === "aniversario"
                      ? <Cake size={12} className="text-[#ec4899] flex-shrink-0" />
                      : <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: e.cor }} />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#f5f5f5] truncate">{e.titulo}</p>
                      <p className="text-[10px] text-[#52525b] capitalize">{label}</p>
                    </div>
                    {!e.diaInteiro && e.tipo !== "aniversario" && (
                      <span className="text-[10px] text-[#52525b] flex-shrink-0 font-mono">
                        {formatarHora(e.dataInicio)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modais ───────────────────────────────────────────────────────── */}
      <ModalEvento
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSalvar={salvarEvento}
        onIniciarExclusao={editando ? () => iniciarExclusao(diaSel) : undefined}
        editando={editando}
        diaPre={diaPre}
      />

      <ModalExcluir
        open={modalExcluir}
        onClose={() => setModalExcluir(false)}
        onExcluirEste={excluirEsteOcorrencia}
        onExcluirTodos={excluirTodos}
        ds={diaSelecionadoExclusao}
      />
    </div>
  );
}
