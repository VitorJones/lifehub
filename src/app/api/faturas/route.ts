import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  const faturas = await prisma.fatura.findMany({
    include: { cartao: true },
    orderBy: [{ mesReferencia: "desc" }, { createdAt: "desc" }],
  });

  // Para cada fatura, calcula o total real a partir das transações do cartão naquele mês
  const faturasComTotal = await Promise.all(
    faturas.map(async (f) => {
      const [ano, mesStr] = f.mesReferencia.split("-");
      const mes = Number(mesStr) - 1;
      const inicio = startOfMonth(new Date(Number(ano), mes, 1));
      const fim = endOfMonth(new Date(Number(ano), mes, 1));

      const transacoes = await prisma.transacao.findMany({
        where: { cartaoId: f.cartaoId, data: { gte: inicio, lte: fim } },
        select: { valor: true },
      });
      const total = transacoes.reduce((a, t) => a + t.valor, 0);

      return { ...f, totalCalculado: total };
    })
  );

  return NextResponse.json(faturasComTotal);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { cartaoId, mesReferencia } = body;

  const fatura = await prisma.fatura.upsert({
    where: { cartaoId_mesReferencia: { cartaoId, mesReferencia } },
    update: {},
    create: { cartaoId, mesReferencia, status: "aberta" },
    include: { cartao: true },
  });

  return NextResponse.json(fatura, { status: 201 });
}
