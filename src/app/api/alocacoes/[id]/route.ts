import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const alocacao = await prisma.alocacao.update({
    where: { id },
    data: {
      nome: body.nome,
      percentual: body.percentual ? Number(body.percentual) : null,
      valorFixo: body.valorFixo ? Number(body.valorFixo) : null,
      valorGuardado: body.valorGuardado !== undefined ? Number(body.valorGuardado) : undefined,
      cor: body.cor,
    },
  });

  return NextResponse.json(alocacao);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { incremento } = await request.json();

  const alocacao = await prisma.alocacao.update({
    where: { id },
    data: { valorGuardado: { increment: Number(incremento) } },
  });

  return NextResponse.json(alocacao);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.alocacao.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
