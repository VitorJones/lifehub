import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const transacao = await prisma.transacao.findUnique({
    where: { id },
    include: { categoria: true, conta: true },
  });

  if (!transacao) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json(transacao);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { descricao, valor, tipo, data, categoriaId, contaId, recorrente, observacao } = body;

  const transacao = await prisma.transacao.update({
    where: { id },
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

  return NextResponse.json(transacao);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.transacao.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
