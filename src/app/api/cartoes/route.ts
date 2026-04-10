import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  const hoje = new Date();
  const inicio = startOfMonth(hoje);
  const fim = endOfMonth(hoje);

  const cartoes = await prisma.cartao.findMany({
    where: { ativo: true },
    include: {
      transacoes: {
        where: { data: { gte: inicio, lte: fim } },
        select: { valor: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    cartoes.map((c) => ({
      id: c.id,
      nome: c.nome,
      bandeira: c.bandeira,
      limite: c.limite,
      diaFechamento: c.diaFechamento,
      diaVencimento: c.diaVencimento,
      cor: c.cor,
      gastoMes: c.transacoes.reduce((a, t) => a + t.valor, 0),
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const { nome, bandeira, limite, diaFechamento, diaVencimento, cor } = body;

  const cartao = await prisma.cartao.create({
    data: {
      nome,
      bandeira: bandeira ?? "visa",
      limite: Number(limite),
      diaFechamento: Number(diaFechamento),
      diaVencimento: Number(diaVencimento),
      cor: cor ?? "#a855f7",
    },
  });

  return NextResponse.json(cartao, { status: 201 });
}
