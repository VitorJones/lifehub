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
  const { descricao, valor, tipo, data, categoriaId, contaId, cartaoId, formaPagamento, recorrente, observacao } = body;

  const dataParseada = typeof data === "string" && data.length === 10
    ? new Date(`${data}T12:00:00`)
    : new Date(data);

  const transacao = await prisma.transacao.update({
    where: { id },
    data: {
      descricao,
      valor: Number(valor),
      tipo,
      data: dataParseada,
      categoriaId,
      contaId: contaId && contaId !== "__none__" ? contaId : null,
      cartaoId: (formaPagamento === "credito" || formaPagamento === "debito") && cartaoId && cartaoId !== "__none__" ? cartaoId : null,
      formaPagamento: formaPagamento ?? "dinheiro",
      recorrente: Boolean(recorrente),
      observacao: observacao || null,
    },
    include: { categoria: true, conta: true, cartao: { select: { id: true, nome: true, cor: true } } },
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
