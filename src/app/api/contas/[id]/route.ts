import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { nome, tipo, saldoInicial, cor, icone } = body;

  const conta = await prisma.conta.update({
    where: { id },
    data: {
      nome,
      tipo,
      saldoInicial: Number(saldoInicial ?? 0),
      cor,
      icone,
    },
  });

  return NextResponse.json(conta);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.conta.update({
    where: { id },
    data: { ativo: false },
  });

  return NextResponse.json({ ok: true });
}
