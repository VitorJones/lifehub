import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mes = Number(searchParams.get("mes") ?? new Date().getMonth() + 1);
  const ano = Number(searchParams.get("ano") ?? new Date().getFullYear());

  const inicioMes = startOfMonth(new Date(ano, mes - 1, 1));
  const fimMes = endOfMonth(new Date(ano, mes - 1, 1));

  // Mês anterior para comparação
  const mesAnterior = subMonths(inicioMes, 1);
  const inicioAnterior = startOfMonth(mesAnterior);
  const fimAnterior = endOfMonth(mesAnterior);

  const [transacoesMes, transacoesAnterior] = await Promise.all([
    prisma.transacao.findMany({
      where: { data: { gte: inicioMes, lte: fimMes } },
      include: { categoria: true },
    }),
    prisma.transacao.findMany({
      where: { data: { gte: inicioAnterior, lte: fimAnterior } },
    }),
  ]);

  const receitas = transacoesMes
    .filter((t) => t.tipo === "receita")
    .reduce((acc, t) => acc + t.valor, 0);
  const despesas = transacoesMes
    .filter((t) => t.tipo === "despesa")
    .reduce((acc, t) => acc + t.valor, 0);

  const receitasAnterior = transacoesAnterior
    .filter((t) => t.tipo === "receita")
    .reduce((acc, t) => acc + t.valor, 0);
  const despesasAnterior = transacoesAnterior
    .filter((t) => t.tipo === "despesa")
    .reduce((acc, t) => acc + t.valor, 0);

  // Gastos por categoria
  const porCategoria: Record<string, { nome: string; cor: string; total: number }> = {};
  transacoesMes
    .filter((t) => t.tipo === "despesa")
    .forEach((t) => {
      const cat = t.categoria;
      if (!porCategoria[cat.id]) {
        porCategoria[cat.id] = { nome: cat.nome, cor: cat.cor, total: 0 };
      }
      porCategoria[cat.id].total += t.valor;
    });

  // Evolução últimos 6 meses
  const evolucao = [];
  for (let i = 5; i >= 0; i--) {
    const ref = subMonths(inicioMes, i);
    const ini = startOfMonth(ref);
    const fim = endOfMonth(ref);
    const ts = await prisma.transacao.findMany({
      where: { data: { gte: ini, lte: fim } },
      select: { valor: true, tipo: true },
    });
    const r = ts.filter((t) => t.tipo === "receita").reduce((a, t) => a + t.valor, 0);
    const d = ts.filter((t) => t.tipo === "despesa").reduce((a, t) => a + t.valor, 0);
    evolucao.push({
      mes: ref.toLocaleDateString("pt-BR", { month: "short" }),
      receitas: r,
      despesas: d,
    });
  }

  return NextResponse.json({
    receitas,
    despesas,
    saldo: receitas - despesas,
    receitasAnterior,
    despesasAnterior,
    saldoAnterior: receitasAnterior - despesasAnterior,
    porCategoria: Object.values(porCategoria).sort((a, b) => b.total - a.total),
    evolucao,
  });
}
