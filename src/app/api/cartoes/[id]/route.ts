import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { nome, bandeira, limite, diaFechamento, diaVencimento, cor } = body;

  const cartao = await prisma.cartao.update({
    where: { id },
    data: { nome, bandeira, limite: Number(limite), diaFechamento: Number(diaFechamento), diaVencimento: Number(diaVencimento), cor },
  });

  return NextResponse.json(cartao);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.cartao.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
