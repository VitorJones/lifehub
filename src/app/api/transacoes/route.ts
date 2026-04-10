import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes");
  const ano = searchParams.get("ano");
  const tipo = searchParams.get("tipo");
  const categoriaId = searchParams.get("categoriaId");
  const contaId = searchParams.get("contaId");
  const busca = searchParams.get("busca");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (mes && ano) {
    const inicio = new Date(Number(ano), Number(mes) - 1, 1);
    const fim = new Date(Number(ano), Number(mes), 0, 23, 59, 59);
    where.data = { gte: inicio, lte: fim };
  }

  if (tipo) where.tipo = tipo;
  if (categoriaId) where.categoriaId = categoriaId;
  if (contaId) where.contaId = contaId;
  if (busca) where.descricao = { contains: busca };

  const transacoes = await prisma.transacao.findMany({
    where,
    include: { categoria: true, conta: true },
    orderBy: { data: "desc" },
  });

  return NextResponse.json(transacoes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { descricao, valor, tipo, data, categoriaId, contaId, recorrente, observacao } = body;

  const transacao = await prisma.transacao.create({
    data: {
      descricao,
      valor: Number(valor),
      tipo,
      data: new Date(data),
      categoriaId,
      contaId: contaId || null,
      recorrente: Boolean(recorrente),
      observacao: observacao || null,
    },
    include: { categoria: true, conta: true },
  });

  return NextResponse.json(transacao, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes");
  const ano = searchParams.get("ano");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (mes && ano) {
    const inicio = new Date(Number(ano), Number(mes) - 1, 1);
    const fim = new Date(Number(ano), Number(mes), 0, 23, 59, 59);
    where.data = { gte: inicio, lte: fim };
  }

  const { count } = await prisma.transacao.deleteMany({ where });
  return NextResponse.json({ ok: true, count });
}
