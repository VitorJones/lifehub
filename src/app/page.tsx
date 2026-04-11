"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, addDays, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Calendar,
  Target, Wallet, CheckSquare, Flame, Clock, Users, Cake,
  ArrowRight, Check, Droplets, Plus, Settings2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell,
} from "recharts";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface DashData {
  financeiro: {
    receitas: number; despesas: number; saldo: number;
    receitasAnterior: number; despesasAnterior: number; saldoAnterior: number;
    evolucao: { mes: string; receitas: number; despesas: number }[];
  };
  habitos:  { total: number; concluidos: number; streakGlobal: number };
  tarefas:  { pendentes: number; urgentes: number; atrasadas: number };
  proximosEventos: Evento[];
  metas: Meta[];
  aniversariosProximos: AnivItem[];
  amigosAtencao: AmigoAtencao[];
}

interface Evento {
  id: string; titulo: string; dataInicio: string; cor: string;
  diaInteiro: boolean; recorrencia: string | null;
  diasRecorrencia: string | null; excecoes: string | null;
}

interface Meta {
  id: string; titulo: string; categoria: string;
  valorAlvo: number | null; valorAtual: number | null; unidade: string | null;
  prazo: string | null; concluida: boolean;
}

interface AnivItem {
  id: string; nome: string; apelido: string | null; cor: string; dias: number;
}

interface AmigoAtencao {
  id: string; nome: string; apelido: string | null; cor: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function variacao(atual: number, anterior: number): { pct: number; positivo: boolean } {
  if (anterior === 0) return { pct: 0, positivo: atual >= 0 };
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100;
  return { pct, positivo: pct >= 0 };
}

function iniciais(nome: string): string {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

/** Verifica se um evento recorrente ocorre num dado dia */
function ocorrNoDia(e: Evento, ds: string): boolean {
  const inicioDs = format(new Date(e.dataInicio), "yyyy-MM-dd");
  if (ds < inicioDs) return false;
  const excList: string[] = e.excecoes ? (JSON.parse(e.excecoes) as string[]) : [];
  if (excList.includes(ds)) return false;
  if (!e.recorrencia) return inicioDs === ds;
  switch (e.recorrencia) {
    case "diario":  return true;
    case "semanal": return new Date(ds + "T12:00:00").getDay() === new Date(inicioDs + "T12:00:00").getDay();
    case "mensal":  return ds.slice(8) === inicioDs.slice(8);
    case "anual":   return ds.slice(5) === inicioDs.slice(5);
    case "personalizado": {
      if (!e.diasRecorrencia) return false;
      const dias = JSON.parse(e.diasRecorrencia) as number[];
      return dias.includes(new Date(ds + "T12:00:00").getDay());
    }
    default: return false;
  }
}

function proximosEventosFiltrados(eventos: Evento[]): { ds: string; evento: Evento }[] {
  const result: { ds: string; evento: Evento }[] = [];
  for (let i = 0; i <= 7 && result.length < 6; i++) {
    const d    = addDays(new Date(), i);
    const dStr = format(d, "yyyy-MM-dd");
    for (const e of eventos) {
      if (result.length >= 6) break;
      if (ocorrNoDia(e, dStr)) result.push({ ds: dStr, evento: e });
    }
  }
  return result;
}

// ─── Componentes menores ─────────────────────────────────────────────────────

function Card({ children, className = "", href }: { children: React.ReactNode; className?: string; href?: string }) {
  const base = `bg-[#111113] border border-[#27272a] rounded-xl p-5 transition-all duration-200 hover:border-[#3f3f46] ${className}`;
  if (href) return <Link href={href} className={base}>{children}</Link>;
  return <div className={base}>{children}</div>;
}

function Delta({ atual, anterior, inverso = false }: { atual: number; anterior: number; inverso?: boolean }) {
  const { pct, positivo } = variacao(atual, anterior);
  if (anterior === 0) return null;
  const bom = inverso ? !positivo : positivo;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-medium ${bom ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
      {bom ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

const TooltipCustom = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1f] border border-[#27272a] rounded-lg px-3 py-2 text-xs">
      <p className="text-[#a1a1aa] mb-1 capitalize">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.name === "receitas" ? "#22c55e" : "#ef4444" }}>
          {p.name === "receitas" ? "Receitas" : "Despesas"}: {moeda(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Widget Água ──────────────────────────────────────────────────────────────

function WidgetAgua() {
  const hojeDs = format(new Date(), "yyyy-MM-dd");

  const [ml, setMl]               = useState(0);
  const [metaMl, setMetaMl]       = useState(2000);
  const [semana, setSemana]       = useState<{ data: string; ml: number }[]>([]);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState("2000");
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const res  = await fetch(`/api/agua?data=${hojeDs}`);
      if (!res.ok) return;
      const data = await res.json();
      setMl(data.hoje?.ml ?? 0);
      setMetaMl(data.hoje?.metaMl ?? 2000);
      setMetaInput(String(data.hoje?.metaMl ?? 2000));
      setSemana(data.semana ?? []);
    } catch { /* silencioso */ }
  }, [hojeDs]);

  useEffect(() => { carregar(); }, [carregar]);

  const adicionar = async (delta: number) => {
    const novo = Math.max(0, ml + delta);
    setMl(novo);
    setCarregando(true);
    try {
      await fetch("/api/agua", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ data: hojeDs, ml: novo, metaMl }),
      });
    } finally { setCarregando(false); }
  };

  const salvarMeta = async () => {
    const m = Math.max(100, parseInt(metaInput) || metaMl);
    setMetaMl(m);
    setEditandoMeta(false);
    await fetch("/api/agua", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ data: hojeDs, ml, metaMl: m }),
    });
  };

  const pct = Math.min(100, Math.round((ml / metaMl) * 100));
  const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1).replace(".0", "")}L` : `${v}ml`;

  const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const chartData = semana.map((d) => ({
    dia:    DIAS[new Date(d.data + "T12:00:00").getDay()],
    ml:     d.ml,
    isHoje: d.data === hojeDs,
  }));

  const maxDomain = Math.max(metaMl, ...chartData.map((d) => d.ml), 1);

  return (
    <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 hover:border-[#3f3f46] transition-all duration-200">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#06b6d4]/10 flex items-center justify-center flex-shrink-0">
            <Droplets size={17} className="text-[#06b6d4]" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-[#f5f5f5] text-sm leading-none">Água</h2>
            <p className="text-xs text-[#a1a1aa] mt-0.5">{fmt(ml)} / {fmt(metaMl)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adicionar(250)}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#06b6d4]/10 hover:bg-[#06b6d4]/20 border border-[#06b6d4]/20 rounded-lg text-[#06b6d4] text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Plus size={12} /> +250ml
          </button>
          <button
            onClick={() => { setEditandoMeta((v) => !v); setMetaInput(String(metaMl)); }}
            className="w-7 h-7 flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] rounded-lg hover:bg-[#1a1a1f] transition-colors"
          >
            <Settings2 size={13} />
          </button>
        </div>
      </div>

      {/* Editar meta */}
      {editandoMeta && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-xs text-[#a1a1aa]">Meta:</span>
          <input
            type="number"
            min={100}
            step={250}
            value={metaInput}
            onChange={(e) => setMetaInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") salvarMeta(); if (e.key === "Escape") setEditandoMeta(false); }}
            className="w-20 bg-[#1a1a1f] border border-[#27272a] text-[#f5f5f5] rounded-md px-2 py-1 text-xs focus:outline-none focus:border-[#06b6d4]"
            autoFocus
          />
          <span className="text-xs text-[#52525b]">ml</span>
          <button onClick={salvarMeta} className="text-xs text-[#06b6d4] hover:underline">OK</button>
        </div>
      )}

      {/* Gráfico de barras horizontal — últimos 7 dias */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={182}>
          <BarChart data={chartData} layout="vertical" barSize={10} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
            <XAxis type="number" hide domain={[0, maxDomain]} />
            <YAxis
              dataKey="dia"
              type="category"
              interval={0}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              cursor={{ fill: "#1a1a1f" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-[#1a1a1f] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-xs">
                    <p className="text-[#a1a1aa] capitalize mb-0.5">{label}</p>
                    <p className="text-[#06b6d4]">{fmt(payload[0].value as number)}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="ml" radius={[0, 3, 3, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isHoje ? "#06b6d4" : "#06b6d440"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[182px] flex items-center justify-center">
          <p className="text-xs text-[#3f3f46]">Carregando...</p>
        </div>
      )}

      {/* Barra de progresso + % */}
      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1 h-1.5 bg-[#1a1a1f] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:      `${pct}%`,
              background: pct >= 100 ? "#06b6d4" : "linear-gradient(to right, #06b6d4, #0891b2)",
            }}
          />
        </div>
        <span className="text-xs font-mono text-[#71717a] w-8 text-right">{pct}%</span>
      </div>
      {pct >= 100 && (
        <p className="text-[11px] text-[#06b6d4] mt-1.5 flex items-center gap-1">
          <Check size={10} /> Meta atingida!
        </p>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]     = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/dashboard");
      if (!res.ok) return;
      const text = await res.text();
      if (text) setData(JSON.parse(text));
    } catch (e) {
      console.error("Erro ao carregar dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const hoje = new Date();
  const hora = hoje.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  // Eventos próximos (filtragem de recorrência no client)
  const eventosProximos = data ? proximosEventosFiltrados(data.proximosEventos) : [];
  const hojeDs = format(hoje, "yyyy-MM-dd");

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">

      {/* ── Saudação ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[#52525b] text-sm capitalize">
          {format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <h1 className="text-3xl font-heading font-semibold text-[#f5f5f5] mt-0.5">
          {saudacao} 👋
        </h1>
        {data?.habitos.streakGlobal && data.habitos.streakGlobal > 1 ? (
          <p className="text-sm text-[#a1a1aa] mt-1 flex items-center gap-1.5">
            <Flame size={14} className="text-[#f97316]" />
            {data.habitos.streakGlobal} dias de streak!
          </p>
        ) : (
          <p className="text-sm text-[#a1a1aa] mt-1">Aqui está o panorama do seu dia</p>
        )}
      </div>

      {/* ── 3 cards resumo ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">

        {/* Saldo do mês */}
        <Card href="/financeiro">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
              <Wallet size={20} className="text-[#22c55e]" />
            </div>
            {data && (
              <Delta atual={data.financeiro.saldo} anterior={data.financeiro.saldoAnterior} />
            )}
          </div>
          <p className="text-[#a1a1aa] text-sm mb-1">Saldo do Mês</p>
          {loading ? (
            <div className="h-7 w-32 bg-[#1a1a1f] rounded animate-pulse" />
          ) : (
            <p className={`text-lg md:text-2xl font-mono font-semibold truncate ${
              (data?.financeiro.saldo ?? 0) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
            }`}>
              {moeda(data?.financeiro.saldo ?? 0)}
            </p>
          )}
          {data && (
            <div className="flex gap-3 mt-2">
              <span className="text-[11px] text-[#22c55e]">↑ {moeda(data.financeiro.receitas)}</span>
              <span className="text-[11px] text-[#ef4444]">↓ {moeda(data.financeiro.despesas)}</span>
            </div>
          )}
        </Card>

        {/* Hábitos de hoje */}
        <Card href="/habitos">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#a855f7]/10 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[#a855f7]" />
            </div>
            <span className="text-xs text-[#a1a1aa]">
              {loading ? "—" : `${data?.habitos.concluidos ?? 0} de ${data?.habitos.total ?? 0} hoje`}
            </span>
          </div>
          <p className="text-[#a1a1aa] text-sm mb-1">Hábitos de Hoje</p>
          {loading ? (
            <div className="h-7 w-16 bg-[#1a1a1f] rounded animate-pulse" />
          ) : (
            <p className="text-xl md:text-2xl font-heading font-semibold text-[#f5f5f5]">
              {data?.habitos.total
                ? `${Math.round((data.habitos.concluidos / data.habitos.total) * 100)}%`
                : "—"}
            </p>
          )}
          <div className="mt-3 h-1.5 bg-[#1a1a1f] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: data?.habitos.total
                  ? `${(data.habitos.concluidos / data.habitos.total) * 100}%`
                  : "0%",
                background: data?.habitos.concluidos === data?.habitos.total && data?.habitos.total
                  ? "#22c55e"
                  : "linear-gradient(to right, #a855f7, #7c3aed)",
              }}
            />
          </div>
        </Card>

        {/* Tarefas */}
        <Card href="/tarefas">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#f97316]/10 flex items-center justify-center">
              <CheckSquare size={20} className="text-[#f97316]" />
            </div>
            {(data?.tarefas.urgentes ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#ef4444]">
                <AlertCircle size={11} />
                {data!.tarefas.urgentes} urgente{data!.tarefas.urgentes > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-[#a1a1aa] text-sm mb-1">Tarefas Pendentes</p>
          {loading ? (
            <div className="h-7 w-10 bg-[#1a1a1f] rounded animate-pulse" />
          ) : (
            <p className="text-xl md:text-2xl font-heading font-semibold text-[#f5f5f5]">
              {data?.tarefas.pendentes ?? 0}
            </p>
          )}
          {(data?.tarefas.atrasadas ?? 0) > 0 && (
            <p className="text-[11px] text-[#ef4444] mt-1 flex items-center gap-1">
              <Clock size={10} />
              {data!.tarefas.atrasadas} atrasada{data!.tarefas.atrasadas > 1 ? "s" : ""}
            </p>
          )}
        </Card>

      </div>

      {/* ── Gráfico de barras + Widget Água ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="col-span-2">
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-heading font-semibold text-[#f5f5f5]">Receitas vs Despesas</h2>
            <p className="text-xs text-[#52525b] mt-0.5">Últimos 6 meses</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#a1a1aa]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" /> Receitas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" /> Despesas
            </span>
          </div>
        </div>
        {loading ? (
          <div className="h-52 bg-[#1a1a1f] rounded-lg animate-pulse" />
        ) : !data?.financeiro.evolucao.some((e) => e.receitas > 0 || e.despesas > 0) ? (
          <div className="h-52 flex flex-col items-center justify-center text-center">
            <TrendingUp size={36} className="text-[#27272a] mb-3" />
            <p className="text-[#52525b] text-sm">Adicione transações para ver o gráfico</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data!.financeiro.evolucao} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1f" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip content={<TooltipCustom />} cursor={{ fill: "#1a1a1f" }} />
              <Bar dataKey="receitas" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
      </div>

      {/* Widget Água */}
      <WidgetAgua />
      </div>

      {/* ── Linha inferior: Eventos + Metas + Amigos ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Próximos eventos */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar size={16} className="text-[#3b82f6] shrink-0" />
              <h2 className="font-heading font-semibold text-[#f5f5f5] text-sm truncate">Próximos Eventos</h2>
            </div>
            <Link href="/agenda" className="text-[10px] text-[#52525b] hover:text-[#a1a1aa] flex items-center gap-0.5 transition-colors shrink-0">
              Ver tudo <ArrowRight size={10} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-[#1a1a1f] rounded-lg animate-pulse" />)}
            </div>
          ) : eventosProximos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <Calendar size={28} className="text-[#27272a] mb-2" />
              <p className="text-[#52525b] text-xs">Nenhum evento nos próximos 7 dias</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {eventosProximos.map(({ ds, evento: e }, i) => {
                const isHoje = ds === hojeDs;
                const label  = isHoje
                  ? "Hoje"
                  : format(new Date(ds + "T12:00:00"), "EEE, d MMM", { locale: ptBR });
                return (
                  <div key={`${e.id}-${ds}-${i}`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#0d0d0f]">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: e.cor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#f5f5f5] truncate">{e.titulo}</p>
                      <p className="text-[10px] text-[#52525b] capitalize">{label}</p>
                    </div>
                    {!e.diaInteiro && (
                      <span className="text-[10px] text-[#52525b] font-mono flex-shrink-0">
                        {format(new Date(e.dataInicio), "HH:mm")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Metas em progresso */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Target size={16} className="text-[#a855f7] shrink-0" />
              <h2 className="font-heading font-semibold text-[#f5f5f5] text-sm truncate">Metas</h2>
            </div>
            <Link href="/habitos/metas" className="text-[10px] text-[#52525b] hover:text-[#a1a1aa] flex items-center gap-0.5 transition-colors shrink-0">
              Ver tudo <ArrowRight size={10} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-[#1a1a1f] rounded-lg animate-pulse" />)}
            </div>
          ) : !data?.metas.length ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <Target size={28} className="text-[#27272a] mb-2" />
              <p className="text-[#52525b] text-xs">Nenhuma meta cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data!.metas.map((m) => {
                const pct = m.valorAlvo && m.valorAtual != null
                  ? Math.min(100, Math.round((m.valorAtual / m.valorAlvo) * 100))
                  : null;
                const diasRestantes = m.prazo
                  ? Math.ceil((new Date(m.prazo).getTime() - hoje.getTime()) / 86400000)
                  : null;
                return (
                  <div key={m.id} className="px-3 py-2.5 bg-[#0d0d0f] rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-[#f5f5f5] truncate flex-1">{m.titulo}</p>
                      {pct !== null && (
                        <span className="text-[10px] text-[#a855f7] font-mono ml-2 flex-shrink-0">{pct}%</span>
                      )}
                    </div>
                    {pct !== null ? (
                      <div className="h-1 bg-[#1a1a1f] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100 ? "#22c55e" : "linear-gradient(to right, #a855f7, #7c3aed)",
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#52525b]">Meta qualitativa</p>
                    )}
                    {diasRestantes !== null && (
                      <p className={`text-[10px] mt-1 ${diasRestantes < 0 ? "text-[#ef4444]" : diasRestantes <= 7 ? "text-[#eab308]" : "text-[#52525b]"}`}>
                        {diasRestantes < 0
                          ? `Atrasada ${Math.abs(diasRestantes)}d`
                          : diasRestantes === 0
                          ? "Prazo hoje"
                          : `${diasRestantes}d restantes`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Amigos — Aniversários + Atenção */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Users size={16} className="text-[#ec4899] shrink-0" />
              <h2 className="font-heading font-semibold text-[#f5f5f5] text-sm truncate">Amigos</h2>
            </div>
            <Link href="/amigos" className="text-[10px] text-[#52525b] hover:text-[#a1a1aa] flex items-center gap-0.5 transition-colors shrink-0">
              Ver tudo <ArrowRight size={10} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-[#1a1a1f] rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Aniversários próximos */}
              {(data?.aniversariosProximos.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] text-[#52525b] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Cake size={10} /> Aniversários
                  </p>
                  <div className="space-y-1">
                    {data!.aniversariosProximos.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-[#0d0d0f] rounded-lg">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0"
                          style={{ background: a.cor }}
                        >
                          {iniciais(a.nome)}
                        </div>
                        <p className="text-xs text-[#f5f5f5] flex-1 truncate">{a.apelido || a.nome.split(" ")[0]}</p>
                        <span className={`text-[10px] flex-shrink-0 font-medium ${a.dias === 0 ? "text-[#ec4899]" : a.dias <= 3 ? "text-[#eab308]" : "text-[#52525b]"}`}>
                          {a.dias === 0 ? "🎂 Hoje!" : a.dias === 1 ? "Amanhã" : `${a.dias}d`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Precisam de atenção */}
              {(data?.amigosAtencao.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] text-[#52525b] uppercase tracking-wide mb-1.5">
                    Dar atenção
                  </p>
                  <div className="space-y-1">
                    {data!.amigosAtencao.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-[#0d0d0f] rounded-lg">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0"
                          style={{ background: a.cor }}
                        >
                          {iniciais(a.nome)}
                        </div>
                        <p className="text-xs text-[#ef4444] flex-1 truncate">{a.apelido || a.nome.split(" ")[0]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data?.aniversariosProximos.length ?? 0) === 0 &&
               (data?.amigosAtencao.length ?? 0) === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <Check size={28} className="text-[#27272a] mb-2" />
                  <p className="text-[#52525b] text-xs">Tudo em dia com os amigos!</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
