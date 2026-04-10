import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const investimentos = await prisma.investimento.findMany({
    where: { ativo: true },
    include: { aportes: { orderBy: { data: "desc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    investimentos.map((inv) => {
      // Para caixinhas: valorAtual = soma de depósitos - resgates
      const valorAtualCaixinha = inv.aportes.reduce((acc, a) => {
        return a.tipo === "deposito" ? acc + a.valor : acc - a.valor;
      }, 0);

      // Para renda fixa: estima rendimento com base na taxa anual
      let valorEstimado = inv.valorAtual;
      if (!inv.ehCaixinha && inv.rendimentoAnual && inv.valorInvestido > 0) {
        const anos = (Date.now() - new Date(inv.dataInicio).getTime()) / (1000 * 60 * 60 * 24 * 365);
        valorEstimado = inv.valorInvestido * Math.pow(1 + inv.rendimentoAnual / 100, anos);
      }

      return {
        ...inv,
        valorAtual: inv.ehCaixinha ? valorAtualCaixinha : Math.round(valorEstimado * 100) / 100,
        totalAportes: inv.aportes.filter((a) => a.tipo === "deposito").reduce((s, a) => s + a.valor, 0),
        ultimoAporte: inv.aportes[0] ?? null,
      };
    })
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    nome, tipo, instituicao, valorInvestido, rendimentoAnual,
    tipoRendimento, dataInicio, dataVencimento, metaValor,
  } = body;

  const ehCaixinha = tipo === "caixinha";

  const investimento = await prisma.investimento.create({
    data: {
      nome,
      tipo,
      ehCaixinha,
      instituicao: instituicao || null,
      valorInvestido: ehCaixinha ? 0 : Number(valorInvestido ?? 0),
      valorAtual: ehCaixinha ? 0 : Number(valorInvestido ?? 0),
      rendimentoAnual: rendimentoAnual ? Number(rendimentoAnual) : null,
      tipoRendimento: tipoRendimento || null,
      dataInicio: new Date(dataInicio),
      dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
      metaValor: metaValor ? Number(metaValor) : null,
    },
  });

  // Cria aporte inicial para não-caixinhas
  if (!ehCaixinha && Number(valorInvestido) > 0) {
    await prisma.aporte.create({
      data: {
        investimentoId: investimento.id,
        valor: Number(valorInvestido),
        tipo: "deposito",
        data: new Date(dataInicio),
      },
    });
  }

  return NextResponse.json(investimento, { status: 201 });
}
