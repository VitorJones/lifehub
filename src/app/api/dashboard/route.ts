import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  startOfMonth, endOfMonth, startOfDay, endOfDay,
  addDays, subMonths, getDay,
} from "date-fns";

export async function GET() {
  try {
  const hoje       = new Date();
  const inicioMes  = startOfMonth(hoje);
  const fimMes     = endOfMonth(hoje);
  const inicioHoje = startOfDay(hoje);
  const fimHoje    = endOfDay(hoje);
  const em7Dias    = addDays(hoje, 7);
  const diaSemana  = getDay(hoje); // 0=dom … 6=sáb

  // ── Financeiro: mês atual ──────────────────────────────────────────────────
  const transacoesMes = await prisma.transacao.findMany({
    where: { data: { gte: inicioMes, lte: fimMes } },
    select: { valor: true, tipo: true },
  });

  const receitas = transacoesMes.filter((t) => t.tipo === "receita").reduce((a, t) => a + t.valor, 0);
  const despesas = transacoesMes.filter((t) => t.tipo === "despesa").reduce((a, t) => a + t.valor, 0);

  // Mês anterior
  const mesAnteriorInicio = startOfMonth(subMonths(hoje, 1));
  const mesAnteriorFim    = endOfMonth(subMonths(hoje, 1));
  const transacoesAnterior = await prisma.transacao.findMany({
    where: { data: { gte: mesAnteriorInicio, lte: mesAnteriorFim } },
    select: { valor: true, tipo: true },
  });
  const receitasAnterior = transacoesAnterior.filter((t) => t.tipo === "receita").reduce((a, t) => a + t.valor, 0);
  const despesasAnterior = transacoesAnterior.filter((t) => t.tipo === "despesa").reduce((a, t) => a + t.valor, 0);

  // Evolução últimos 6 meses (para gráfico de barras)
  const evolucao: { mes: string; receitas: number; despesas: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = subMonths(inicioMes, i);
    const ini = startOfMonth(ref);
    const fim = endOfMonth(ref);
    const ts  = await prisma.transacao.findMany({
      where: { data: { gte: ini, lte: fim } },
      select: { valor: true, tipo: true },
    });
    evolucao.push({
      mes:      ref.toLocaleDateString("pt-BR", { month: "short" }),
      receitas: ts.filter((t) => t.tipo === "receita").reduce((a, t) => a + t.valor, 0),
      despesas: ts.filter((t) => t.tipo === "despesa").reduce((a, t) => a + t.valor, 0),
    });
  }

  // ── Hábitos: filtra corretamente por dia da semana ─────────────────────────
  const habitos = await prisma.habito.findMany({ where: { ativo: true } });

  // Hábitos que se aplicam hoje
  const habitosHoje = habitos.filter((h) => {
    if (h.frequencia === "diario") return true;
    if (h.diasSemana) {
      try {
        const dias = JSON.parse(h.diasSemana) as number[];
        return dias.includes(diaSemana);
      } catch { return false; }
    }
    return true;
  });

  const registrosHoje = await prisma.registroHabito.findMany({
    where: {
      data:      { gte: inicioHoje, lte: fimHoje },
      concluido: true,
      habitoId:  { in: habitosHoje.map((h) => h.id) },
    },
  });

  // Streak do usuário (hábitos com pelo menos 1 dia consecutivo)
  const todasDatas = await prisma.registroHabito.findMany({
    where:   { concluido: true },
    select:  { data: true },
    orderBy: { data: "desc" },
  });

  // Streak global: dias consecutivos em que pelo menos 1 hábito foi concluído
  const datasUnicas = [...new Set(todasDatas.map((r) => r.data.toISOString().slice(0, 10)))].sort().reverse();
  let streakGlobal = 0;
  for (let i = 0; i < datasUnicas.length; i++) {
    const esperado = addDays(inicioHoje, -i).toISOString().slice(0, 10);
    if (datasUnicas[i] === esperado) streakGlobal++;
    else break;
  }

  // ── Tarefas ────────────────────────────────────────────────────────────────
  const tarefasPendentes = await prisma.tarefa.count({ where: { status: { not: "concluida" } } });
  const tarefasUrgentes  = await prisma.tarefa.count({ where: { status: { not: "concluida" }, prioridade: "urgente" } });
  const tarefasAtrasadas = await prisma.tarefa.count({
    where: {
      status:    { not: "concluida" },
      dataLimite:{ lt: inicioHoje },
    },
  });

  // ── Próximos eventos (7 dias) + recorrentes ────────────────────────────────
  // Retorna todos eventos com recorrência + eventos dos próximos 7 dias
  const todosEventos = await prisma.evento.findMany({ orderBy: { dataInicio: "asc" } });

  // ── Metas em progresso ─────────────────────────────────────────────────────
  const metas = await prisma.meta.findMany({
    where:   { concluida: false },
    orderBy: { prazo: "asc" },
    take:    4,
  });

  // ── Amigos: aniversários próximos (30 dias) ────────────────────────────────
  const amigos = await prisma.amigo.findMany({ select: { id: true, nome: true, apelido: true, aniversario: true, cor: true } });

  const hojeMMDD = `${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const aniversariosProximos = amigos
    .filter((a) => a.aniversario)
    .map((a) => {
      const mmdd = a.aniversario!.length === 5 ? a.aniversario! : a.aniversario!.slice(5);
      const anoRef = hoje.getFullYear();
      let alvo = new Date(`${anoRef}-${mmdd}T12:00:00`);
      if (alvo < startOfDay(hoje)) alvo = new Date(`${anoRef + 1}-${mmdd}T12:00:00`);
      const dias = Math.round((alvo.getTime() - startOfDay(hoje).getTime()) / 86400000);
      return { ...a, mmdd, dias };
    })
    .filter((a) => a.dias <= 30)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5);

  // Amigos precisando de atenção
  const todosAmigos = await prisma.amigo.findMany({
    select: { id: true, nome: true, apelido: true, cor: true, ultimoContato: true, frequenciaContato: true },
  });
  const freqDias: Record<string, number> = { semanal: 7, quinzenal: 14, mensal: 30, trimestral: 90 };
  const amigosAtencao = todosAmigos
    .filter((a) => {
      if (!a.frequenciaContato) return false;
      const limite = freqDias[a.frequenciaContato];
      if (!limite) return false;
      const diasDesde = a.ultimoContato
        ? Math.floor((hoje.getTime() - new Date(a.ultimoContato).getTime()) / 86400000)
        : 9999;
      return diasDesde > limite * 2;
    })
    .slice(0, 5);

  // ── Água do dia ────────────────────────────────────────────────────────────
  const registroAgua = await prisma.registroAgua.findUnique({ where: { data: inicioHoje } });

  // Últimos 7 dias de água para o gráfico
  const datasAgua: Date[] = Array.from({ length: 7 }, (_, i) =>
    new Date(new Date(inicioHoje).setUTCDate(inicioHoje.getUTCDate() - (6 - i)))
  );
  const registrosAgua = await prisma.registroAgua.findMany({
    where: { data: { in: datasAgua } },
  });
  const semanaAgua = datasAgua.map((d) => {
    const ds  = d.toISOString().slice(0, 10);
    const reg = registrosAgua.find((r) => r.data.toISOString().slice(0, 10) === ds);
    return { data: ds, ml: reg?.ml ?? 0 };
  });

  return NextResponse.json({
    financeiro: {
      receitas, despesas, saldo: receitas - despesas,
      receitasAnterior, despesasAnterior,
      saldoAnterior: receitasAnterior - despesasAnterior,
      evolucao,
    },
    habitos: {
      total:      habitosHoje.length,
      concluidos: registrosHoje.length,
      streakGlobal,
    },
    tarefas: { pendentes: tarefasPendentes, urgentes: tarefasUrgentes, atrasadas: tarefasAtrasadas },
    agua: { ml: registroAgua?.ml ?? 0, metaMl: registroAgua?.metaMl ?? 2000, semana: semanaAgua },
    proximosEventos: todosEventos,
    metas,
    aniversariosProximos,
    amigosAtencao,
  });
  } catch (err) {
    console.error("[dashboard] erro:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
