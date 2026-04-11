"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  format, subDays, getDay, getDaysInMonth, startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dumbbell, Zap, BookOpen, Droplets, Moon, Sun, Apple, Coffee,
  Heart, Sparkles, Music, Code2, PenLine, Bike, Leaf, Star,
  Target, Flame, Activity, Timer, Smile, Trophy, Wind, Globe,
  Plus, Trash2, Check, ChevronLeft, ChevronRight, Minus, Settings2,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface RegistroHabito {
  id: string;
  habitoId: string;
  data: string; // ISO string
  concluido: boolean;
}

interface HabitoComRegistros {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  frequencia: string; // "diario" | "semanal" | "personalizado"
  diasSemana: string | null; // JSON "[0,1,2,3,4]"
  registros: RegistroHabito[];
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const ICONES: Record<string, LucideIcon> = {
  Dumbbell, Zap, BookOpen, Droplets, Moon, Sun, Apple, Coffee,
  Heart, Sparkles, Music, Code2, PenLine, Bike, Leaf, Star,
  Target, Flame, Activity, Timer, Smile, Trophy, Wind, Globe,
};
const LISTA_ICONES = Object.keys(ICONES);

const CORES_HABITO = [
  "#f97316", "#ef4444", "#22c55e", "#3b82f6", "#a855f7",
  "#eab308", "#06b6d4", "#ec4899", "#14b8a6", "#f59e0b",
];

const DIAS_SEMANA_NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const FORM_VAZIO = {
  nome: "", descricao: "", icone: "Target", cor: "#a855f7",
  frequencia: "diario" as "diario" | "semanal",
  diasSemana: [] as number[],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIcone(nome: string): LucideIcon {
  return ICONES[nome] ?? Target;
}

function dataStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function eHabitoDoDia(h: HabitoComRegistros, dia: Date): boolean {
  if (h.frequencia === "diario") return true;
  if (h.diasSemana) {
    const dias = JSON.parse(h.diasSemana) as number[];
    return dias.includes(getDay(dia));
  }
  return true;
}

function estaConcluidoNoDia(h: HabitoComRegistros, ds: string): boolean {
  return h.registros.some((r) => r.data.slice(0, 10) === ds && r.concluido);
}

function calcularStreak(h: HabitoComRegistros): number {
  const hoje = startOfDay(new Date());
  const mapa = new Set(h.registros.filter((r) => r.concluido).map((r) => r.data.slice(0, 10)));
  let dia = hoje;
  if (!mapa.has(dataStr(dia))) dia = subDays(dia, 1);
  let streak = 0;
  while (mapa.has(dataStr(dia))) {
    streak++;
    dia = subDays(dia, 1);
  }
  return streak;
}

function calcularMelhorStreak(h: HabitoComRegistros): number {
  const datas = h.registros
    .filter((r) => r.concluido)
    .map((r) => startOfDay(new Date(r.data)).getTime())
    .sort((a, b) => a - b);
  if (datas.length === 0) return 0;
  let melhor = 1, atual = 1;
  const umDia = 86400000;
  for (let i = 1; i < datas.length; i++) {
    if (datas[i] - datas[i - 1] === umDia) { atual++; melhor = Math.max(melhor, atual); }
    else atual = 1;
  }
  return melhor;
}

function corHeatmap(pct: number): string {
  if (pct <= 0) return "#1a1a1f";
  if (pct <= 0.25) return "rgba(168,85,247,0.3)";
  if (pct <= 0.5) return "rgba(168,85,247,0.5)";
  if (pct <= 0.75) return "rgba(168,85,247,0.7)";
  return "rgba(168,85,247,0.9)";
}

// ─── Tracker de Água ─────────────────────────────────────────────────────────

function TrackerAgua() {
  const COPO_ML = 250; // cada copo = 250ml
  const ds = format(new Date(), "yyyy-MM-dd");
  const [ml, setMl]               = useState(0);
  const [metaMl, setMetaMl]       = useState(2000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput]       = useState("2000");

  const carregar = useCallback(async () => {
    const res  = await fetch(`/api/agua?data=${ds}`);
    const data = await res.json();
    setMl(data.hoje.ml);
    setMetaMl(data.hoje.metaMl);
    setMetaInput(String(data.hoje.metaMl));
  }, [ds]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async (novoMl: number, novaMetaMl?: number) => {
    const m = Math.max(0, novoMl);
    setMl(m);
    await fetch("/api/agua", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ data: ds, ml: m, metaMl: novaMetaMl ?? metaMl }),
    });
  };

  const confirmarMeta = async () => {
    const m = Math.max(250, parseInt(metaInput) || metaMl);
    setMetaMl(m);
    setEditandoMeta(false);
    await salvar(ml, m);
  };

  const numCopos = Math.ceil(metaMl / COPO_ML);
  const coposCheios = Math.floor(ml / COPO_ML);
  const pct     = Math.min(100, Math.round((ml / metaMl) * 100));
  const atingiu = ml >= metaMl;
  const fmt     = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1).replace(".0", "")}L` : `${v}ml`;

  return (
    <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-[#06b6d4]" />
          <h3 className="font-heading font-semibold text-[#f5f5f5] text-sm">Água</h3>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
            atingiu ? "bg-[#06b6d4]/20 text-[#06b6d4]" : "bg-[#1a1a1f] text-[#a1a1aa]"
          }`}>
            {fmt(ml)} / {fmt(metaMl)}
          </span>
        </div>
        <button
          onClick={() => setEditandoMeta((v) => !v)}
          className="w-7 h-7 flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] rounded-lg hover:bg-[#1a1a1f] transition-colors"
          title="Editar meta"
        >
          <Settings2 size={13} />
        </button>
      </div>

      {/* Editar meta */}
      {editandoMeta && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-[#a1a1aa]">Meta diária:</span>
          <input
            type="number"
            min={250}
            step={250}
            value={metaInput}
            onChange={(e) => setMetaInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmarMeta(); if (e.key === "Escape") setEditandoMeta(false); }}
            className="w-20 bg-[#1a1a1f] border border-[#27272a] text-[#f5f5f5] rounded-md px-2 py-1 text-xs focus:outline-none focus:border-[#06b6d4]"
            autoFocus
          />
          <span className="text-xs text-[#52525b]">ml</span>
          <button onClick={confirmarMeta} className="text-xs text-[#06b6d4] hover:underline">OK</button>
        </div>
      )}

      {/* Copos visuais (cada copo = 250ml) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Array.from({ length: numCopos }).map((_, i) => {
          const cheio = i < coposCheios;
          return (
            <button
              key={i}
              onClick={() => salvar(cheio ? i * COPO_ML : (i + 1) * COPO_ML)}
              title={cheio ? `Remover ${COPO_ML}ml` : `Adicionar ${COPO_ML}ml`}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all duration-150 border ${
                cheio
                  ? "bg-[#06b6d4]/20 border-[#06b6d4]/40 hover:bg-[#06b6d4]/30"
                  : "bg-[#1a1a1f] border-[#27272a] hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/10"
              }`}
            >
              <Droplets
                size={16}
                className={cheio ? "text-[#06b6d4]" : "text-[#3f3f46]"}
                fill={cheio ? "#06b6d420" : "none"}
              />
            </button>
          );
        })}
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-[#1a1a1f] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:      `${pct}%`,
              background: atingiu
                ? "#06b6d4"
                : "linear-gradient(to right, #06b6d4, #0891b2)",
            }}
          />
        </div>
        <span className={`text-xs font-mono w-10 text-right ${atingiu ? "text-[#06b6d4]" : "text-[#52525b]"}`}>
          {pct}%
        </span>
        {/* +/- rápido */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => salvar(ml - COPO_ML)}
            disabled={ml === 0}
            className="w-6 h-6 flex items-center justify-center bg-[#1a1a1f] border border-[#27272a] rounded-md text-[#a1a1aa] hover:text-[#ef4444] hover:border-[#ef4444]/30 disabled:opacity-30 transition-colors"
          >
            <Minus size={11} />
          </button>
          <button
            onClick={() => salvar(ml + COPO_ML)}
            className="w-6 h-6 flex items-center justify-center bg-[#1a1a1f] border border-[#27272a] rounded-md text-[#a1a1aa] hover:text-[#06b6d4] hover:border-[#06b6d4]/30 transition-colors"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      {atingiu && (
        <p className="text-xs text-[#06b6d4] mt-2 flex items-center gap-1">
          <Check size={11} /> Meta de hidratação atingida!
        </p>
      )}
    </div>
  );
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

function HojeView({
  habitos,
  onToggle,
  onExcluir,
}: {
  habitos: HabitoComRegistros[];
  onToggle: (id: string, concluido: boolean) => void;
  onExcluir: (id: string) => void;
}) {
  const hoje = startOfDay(new Date());
  const ds = dataStr(hoje);
  const habitosDoDia = habitos.filter((h) => eHabitoDoDia(h, hoje));
  const numConcluidos = habitosDoDia.filter((h) => estaConcluidoNoDia(h, ds)).length;
  const pct = habitosDoDia.length > 0 ? (numConcluidos / habitosDoDia.length) * 100 : 0;

  return (
    <div>
      {/* Cabeçalho do dia */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-heading font-semibold text-[#f5f5f5] capitalize">
            {format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <p className="text-sm text-[#a1a1aa] mt-0.5">
            {numConcluidos}/{habitosDoDia.length} hábitos completos
          </p>
        </div>
        <div className="flex items-center gap-3 w-52">
          <div className="flex-1 h-2 bg-[#1a1a1f] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct === 100 ? "#22c55e" : "#a855f7" }}
            />
          </div>
          <span className="text-xs font-mono text-[#a1a1aa] w-10 text-right">{Math.round(pct)}%</span>
        </div>
      </div>

      <TrackerAgua />

      {habitosDoDia.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-[#111113] border border-[#27272a] rounded-xl">
          <Target size={36} className="text-[#27272a] mb-3" />
          <p className="text-[#a1a1aa] font-medium mb-1">Nenhum hábito para hoje</p>
          <p className="text-[#52525b] text-sm">Crie seu primeiro hábito clicando em "+ Novo Hábito"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {habitos.map((h) => {
            const concluido = estaConcluidoNoDia(h, ds);
            const aplicaHoje = eHabitoDoDia(h, hoje);
            const streak = calcularStreak(h);
            const Icone = getIcone(h.icone);

            return (
              <div
                key={h.id}
                onClick={() => aplicaHoje && onToggle(h.id, !concluido)}
                className={`
                  flex items-center gap-4 px-5 py-4 rounded-xl border
                  transition-all duration-200
                  ${aplicaHoje ? "cursor-pointer" : "cursor-default opacity-50"}
                  ${concluido
                    ? "bg-[#111113] border-[#a855f7]/30"
                    : "bg-[#111113] border-[#27272a] hover:border-[#3f3f46]"
                  }
                `}
              >
                {/* Checkbox visual */}
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                  transition-all duration-200
                  ${concluido ? "border-[#a855f7] bg-[#a855f7]" : "border-[#3f3f46]"}
                `}>
                  {concluido && <Check size={13} className="text-white" />}
                </div>

                {/* Ícone */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${h.cor}20` }}
                >
                  <Icone size={16} style={{ color: h.cor }} />
                </div>

                {/* Nome */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium transition-all ${concluido ? "line-through text-[#52525b]" : "text-[#f5f5f5]"}`}>
                    {h.nome}
                  </p>
                  {h.descricao && (
                    <p className="text-xs text-[#52525b] truncate">{h.descricao}</p>
                  )}
                </div>

                {/* Streak */}
                {streak > 0 && (
                  <div className="flex items-center gap-1 text-[#f97316] shrink-0">
                    <Flame size={14} />
                    <span className="text-sm font-medium font-mono">{streak}</span>
                  </div>
                )}

                {/* Badge frequência */}
                <span className="text-[10px] text-[#52525b] border border-[#27272a] rounded-full px-2 py-0.5 shrink-0">
                  {h.frequencia === "diario" ? "Diário" : "Personalizado"}
                </span>

                {/* Excluir */}
                <button
                  onClick={(e) => { e.stopPropagation(); onExcluir(h.id); }}
                  className="w-7 h-7 flex items-center justify-center text-[#52525b] hover:text-[#ef4444] transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MesView({
  habitos,
  mes,
  ano,
  onNavegar,
  onToggle,
}: {
  habitos: HabitoComRegistros[];
  mes: number;
  ano: number;
  onNavegar: (delta: number) => void;
  onToggle: (id: string, concluido: boolean, dateStr: string) => void;
}) {
  const primeiroDia = new Date(ano, mes - 1, 1);
  const numDias = getDaysInMonth(primeiroDia);
  const dias = Array.from({ length: numDias }, (_, i) => i + 1);
  const hoje = startOfDay(new Date());

  return (
    <div>
      {/* Navegação de mês */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => onNavegar(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="font-heading font-semibold text-[#f5f5f5] capitalize min-w-36 text-center">
          {format(primeiroDia, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <button
          onClick={() => onNavegar(1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {habitos.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[#52525b] text-sm">
          Nenhum hábito criado ainda
        </div>
      ) : (
        <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
          {/* Cabeçalho de dias */}
          <div className="flex items-center mb-3">
            <div className="w-44 shrink-0" />
            <div className="flex gap-1">
              {dias.map((d) => {
                const diaDate = new Date(ano, mes - 1, d);
                const diaSem = DIAS_SEMANA_NOMES[getDay(diaDate)];
                const isHoje = dataStr(diaDate) === dataStr(hoje);
                return (
                  <div key={d} className="w-7 text-center shrink-0">
                    <p className="text-[9px] text-[#52525b]">{diaSem}</p>
                    <p className={`text-[10px] font-medium ${isHoje ? "text-[#a855f7]" : "text-[#a1a1aa]"}`}>
                      {d}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linhas por hábito */}
          <div className="space-y-2">
            {habitos.map((h) => {
              const Icone = getIcone(h.icone);
              return (
                <div key={h.id} className="flex items-center">
                  <div className="w-44 flex items-center gap-2 shrink-0 pr-3">
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `${h.cor}20` }}>
                      <Icone size={12} style={{ color: h.cor }} />
                    </div>
                    <span className="text-xs text-[#f5f5f5] truncate">{h.nome}</span>
                  </div>
                  <div className="flex gap-1">
                    {dias.map((d) => {
                      const diaDate = new Date(ano, mes - 1, d);
                      const ds = dataStr(diaDate);
                      const aplicavel = eHabitoDoDia(h, diaDate);
                      const concluido = estaConcluidoNoDia(h, ds);
                      const futuro = diaDate > hoje;
                      const clicavel = aplicavel && !futuro;

                      return (
                        <div
                          key={d}
                          onClick={() => clicavel && onToggle(h.id, !concluido, ds)}
                          className={`w-7 h-7 rounded-md shrink-0 transition-all ${clicavel ? "cursor-pointer hover:opacity-80" : ""}`}
                          style={{
                            background: !aplicavel
                              ? "transparent"
                              : concluido
                              ? `${h.cor}99`
                              : futuro
                              ? "#1a1a1f"
                              : "#1a1a1f",
                            border: aplicavel && !concluido && !futuro
                              ? "1px solid #27272a"
                              : aplicavel && futuro
                              ? "1px solid #1a1a1f"
                              : "none",
                          }}
                          title={ds}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({ habitos }: { habitos: HabitoComRegistros[] }) {
  const hoje = startOfDay(new Date());

  const diasHeatmap = useMemo(() => {
    const result: Array<{ data: string; pct: number; concluidos: number; total: number }> = [];
    for (let i = 364; i >= 0; i--) {
      const date = subDays(hoje, i);
      const ds = dataStr(date);
      let total = 0, concluidos = 0;
      for (const h of habitos) {
        if (eHabitoDoDia(h, date)) {
          total++;
          if (estaConcluidoNoDia(h, ds)) concluidos++;
        }
      }
      result.push({ data: ds, pct: total > 0 ? concluidos / total : 0, concluidos, total });
    }
    return result;
  }, [habitos]);

  const semanas = useMemo(() => {
    const result: typeof diasHeatmap[] = [];
    const primeiroDiaDate = subDays(hoje, 364);
    const inicioSemana = getDay(primeiroDiaDate);
    let semana: typeof diasHeatmap = Array.from({ length: inicioSemana }, () => ({
      data: "", pct: -1, concluidos: 0, total: 0,
    }));
    for (const d of diasHeatmap) {
      semana.push(d);
      if (semana.length === 7) { result.push([...semana]); semana = []; }
    }
    if (semana.length > 0) {
      while (semana.length < 7) semana.push({ data: "", pct: -1, concluidos: 0, total: 0 });
      result.push(semana);
    }
    return result;
  }, [diasHeatmap]);

  // Labels de mês
  const mesesLabels = useMemo(() => {
    const labels: { nome: string; col: number }[] = [];
    let mesAnterior = -1;
    semanas.forEach((semana, si) => {
      const primeiroValido = semana.find((d) => d.data !== "");
      if (primeiroValido) {
        const mes = new Date(primeiroValido.data).getMonth();
        if (mes !== mesAnterior) {
          labels.push({ nome: format(new Date(primeiroValido.data), "MMM", { locale: ptBR }), col: si });
          mesAnterior = mes;
        }
      }
    });
    return labels;
  }, [semanas]);

  // Stats globais
  const streakAtual = habitos.length > 0 ? Math.max(...habitos.map(calcularStreak)) : 0;
  const melhorStreak = habitos.length > 0 ? Math.max(...habitos.map(calcularMelhorStreak)) : 0;

  const taxaN = (n: number) => {
    const slice = diasHeatmap.slice(-n);
    const tot = slice.reduce((s, d) => s + d.total, 0);
    const con = slice.reduce((s, d) => s + d.concluidos, 0);
    return tot > 0 ? Math.round((con / tot) * 100) : 0;
  };

  return (
    <div>
      {/* Cards de stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: "Streak atual",   valor: `${streakAtual}d`,     cor: "#f97316", icon: Flame },
          { label: "Melhor streak",  valor: `${melhorStreak}d`,    cor: "#eab308", icon: Trophy },
          { label: "Taxa 7 dias",    valor: `${taxaN(7)}%`,        cor: "#3b82f6", icon: Activity },
          { label: "Taxa 30 dias",   valor: `${taxaN(30)}%`,       cor: "#a855f7", icon: Target },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[#111113] border border-[#27272a] rounded-xl p-3 md:p-4 flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.cor}20` }}>
                <Icon size={15} style={{ color: s.cor }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-[#52525b] truncate">{s.label}</p>
                <p className="text-base md:text-xl font-mono font-semibold text-[#f5f5f5]">{s.valor}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Heatmap */}
      <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 mb-6">
        <h3 className="font-medium text-[#f5f5f5] mb-4 text-sm">Histórico de 365 dias</h3>

        {habitos.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[#52525b] text-sm">
            Crie hábitos para ver o histórico
          </div>
        ) : (
          <>
            {/* Labels de mês */}
            <div className="relative h-4 mb-1" style={{ width: semanas.length * 14 }}>
              {mesesLabels.map((m, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] text-[#52525b] capitalize"
                  style={{ left: m.col * 14 }}
                >
                  {m.nome}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-0.5">
              {semanas.map((semana, si) => (
                <div key={si} className="flex flex-col gap-0.5">
                  {semana.map((dia, di) => (
                    <div
                      key={di}
                      className="w-3 h-3 rounded-sm"
                      style={{ background: dia.pct < 0 ? "transparent" : corHeatmap(dia.pct) }}
                      title={dia.data ? `${dia.data}: ${dia.concluidos}/${dia.total}` : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-1 mt-2 justify-end">
              <span className="text-[10px] text-[#52525b]">Menos</span>
              {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                <div key={p} className="w-3 h-3 rounded-sm" style={{ background: corHeatmap(p) }} />
              ))}
              <span className="text-[10px] text-[#52525b]">Mais</span>
            </div>
          </>
        )}
      </div>

      {/* Tabela por hábito */}
      {habitos.length > 0 && (
        <div className="bg-[#111113] border border-[#27272a] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#27272a]">
                {["Hábito", "Streak", "Melhor", "7 dias", "30 dias"].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs text-[#52525b] font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habitos.map((h) => {
                const Icone = getIcone(h.icone);
                const streak = calcularStreak(h);
                const melhor = calcularMelhorStreak(h);

                const taxa = (n: number) => {
                  let tot = 0, con = 0;
                  for (let i = 0; i < n; i++) {
                    const d = subDays(hoje, i);
                    if (eHabitoDoDia(h, d)) {
                      tot++;
                      if (estaConcluidoNoDia(h, dataStr(d))) con++;
                    }
                  }
                  return tot > 0 ? Math.round((con / tot) * 100) : 0;
                };

                return (
                  <tr key={h.id} className="border-b border-[#27272a] last:border-0 hover:bg-[#1a1a1f] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${h.cor}20` }}>
                          <Icone size={12} style={{ color: h.cor }} />
                        </div>
                        <span className="text-sm text-[#f5f5f5]">{h.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm font-mono text-[#f97316]">
                        {streak > 0 && <Flame size={12} />}{streak}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-[#eab308]">{melhor}d</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-[#3b82f6]">{taxa(7)}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-[#a855f7]">{taxa(30)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModalNovoHabito({
  open,
  onClose,
  onSalvar,
}: {
  open: boolean;
  onClose: () => void;
  onSalvar: (dados: typeof FORM_VAZIO) => Promise<void>;
}) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (open) setForm(FORM_VAZIO); }, [open]);

  const salvar = async () => {
    if (!form.nome) return;
    setSalvando(true);
    try { await onSalvar(form); onClose(); }
    finally { setSalvando(false); }
  };

  const toggleDia = (dia: number) => {
    setForm((f) => ({
      ...f,
      diasSemana: f.diasSemana.includes(dia)
        ? f.diasSemana.filter((d) => d !== dia)
        : [...f.diasSemana, dia],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-[#f5f5f5]">Novo Hábito</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Nome */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Nome</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Beber água, Correr, Leitura..."
              className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Descrição (opcional)</Label>
            <Input
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Detalhes do hábito..."
              className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
            />
          </div>

          {/* Ícone */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Ícone</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {LISTA_ICONES.map((nome) => {
                const Icone = getIcone(nome);
                return (
                  <button
                    key={nome}
                    onClick={() => setForm((f) => ({ ...f, icone: nome }))}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      form.icone === nome
                        ? "border-2 border-[#a855f7] bg-[#a855f7]/10"
                        : "border border-[#27272a] bg-[#1a1a1f] hover:bg-[#222228]"
                    }`}
                  >
                    <Icone size={14} style={{ color: form.icone === nome ? form.cor : "#a1a1aa" }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cor */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Cor</Label>
            <div className="flex gap-2">
              {CORES_HABITO.map((cor) => (
                <button
                  key={cor}
                  onClick={() => setForm((f) => ({ ...f, cor }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.cor === cor ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ background: cor }}
                />
              ))}
            </div>
          </div>

          {/* Frequência */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Frequência</Label>
            <div className="flex gap-2">
              {(["diario", "semanal"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setForm((prev) => ({ ...prev, frequencia: f, diasSemana: [] }))}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    form.frequencia === f
                      ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                      : "border-[#27272a] text-[#a1a1aa] hover:bg-[#1a1a1f]"
                  }`}
                >
                  {f === "diario" ? "Diário" : "Dias específicos"}
                </button>
              ))}
            </div>
          </div>

          {/* Dias da semana (só para semanal) */}
          {form.frequencia === "semanal" && (
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Dias da semana</Label>
              <div className="flex gap-1.5">
                {DIAS_SEMANA_NOMES.map((nome, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDia(i)}
                    className={`flex-1 py-1.5 text-[11px] rounded-lg border transition-colors ${
                      form.diasSemana.includes(i)
                        ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                        : "border-[#27272a] text-[#a1a1aa] hover:bg-[#1a1a1f]"
                    }`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-[#1a1a1f] border border-[#27272a] rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${form.cor}20` }}>
              {(() => { const I = getIcone(form.icone); return <I size={16} style={{ color: form.cor }} />; })()}
            </div>
            <div>
              <p className="text-sm font-medium text-[#f5f5f5]">{form.nome || "Meu hábito"}</p>
              <p className="text-xs text-[#52525b]">
                {form.frequencia === "diario" ? "Todos os dias" :
                  form.diasSemana.length > 0
                    ? form.diasSemana.sort().map((d) => DIAS_SEMANA_NOMES[d]).join(", ")
                    : "Nenhum dia selecionado"
                }
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">Cancelar</button>
            <button onClick={salvar} disabled={salvando || !form.nome} className="flex-1 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
              {salvando ? "Criando..." : "Criar Hábito"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function HabitosPage() {
  const [view, setView] = useState<"hoje" | "mes" | "dashboard">("hoje");
  const [habitos, setHabitos] = useState<HabitoComRegistros[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/habitos");
      setHabitos(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const toggleHabito = async (id: string, concluido: boolean, dateStr?: string) => {
    const ds = dateStr ?? format(new Date(), "yyyy-MM-dd");
    await fetch(`/api/habitos/${id}/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: ds, concluido }),
    });
    carregar();
  };

  const excluirHabito = async (id: string) => {
    await fetch(`/api/habitos/${id}`, { method: "DELETE" });
    carregar();
  };

  const criarHabito = async (form: typeof FORM_VAZIO) => {
    await fetch("/api/habitos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome,
        descricao: form.descricao || null,
        icone: form.icone,
        cor: form.cor,
        frequencia: form.frequencia,
        diasSemana: form.frequencia === "semanal" ? form.diasSemana : null,
      }),
    });
    carregar();
  };

  const navegarMes = (delta: number) => {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes > 12) { novoMes = 1; novoAno++; }
    if (novoMes < 1)  { novoMes = 12; novoAno--; }
    setMes(novoMes);
    setAno(novoAno);
  };

  const VIEWS = [
    { id: "hoje",      label: "Hoje" },
    { id: "mes",       label: "Mês" },
    { id: "dashboard", label: "Dashboard" },
  ] as const;

  return (
    <div className="p-8">
      {/* Controles de view + novo hábito */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-[#1a1a1f] rounded-xl p-1 gap-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                view === v.id
                  ? "bg-[#a855f7] text-white"
                  : "text-[#a1a1aa] hover:text-[#f5f5f5]"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Novo Hábito
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {view === "hoje" && (
            <HojeView habitos={habitos} onToggle={toggleHabito} onExcluir={excluirHabito} />
          )}
          {view === "mes" && (
            <MesView habitos={habitos} mes={mes} ano={ano} onNavegar={navegarMes} onToggle={toggleHabito} />
          )}
          {view === "dashboard" && (
            <DashboardView habitos={habitos} />
          )}
        </>
      )}

      <ModalNovoHabito
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSalvar={criarHabito}
      />
    </div>
  );
}
