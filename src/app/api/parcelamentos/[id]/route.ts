import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const parcelamento = await prisma.parcelamento.update({
    where: { id },
    data: {
      descricao: body.descricao,
      parcelaAtual: body.parcelaAtual !== undefined ? Number(body.parcelaAtual) : undefined,
      cartaoId: body.cartaoId || null,
    },
    include: { cartao: true },
  });

  return NextResponse.json(parcelamento);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.parcelamento.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
