import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { nome, tipo, cor, icone } = body;

  const categoria = await prisma.categoria.update({
    where: { id },
    data: { nome, tipo, cor, icone },
  });

  return NextResponse.json(categoria);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verifica se há transações vinculadas
  const count = await prisma.transacao.count({ where: { categoriaId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: "Categoria possui transações vinculadas e não pode ser removida." },
      { status: 400 }
    );
  }

  await prisma.categoria.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
