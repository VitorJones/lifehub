import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const meta = await prisma.meta.update({
    where: { id },
    data: {
      titulo: body.titulo,
      descricao: body.descricao ?? null,
      categoria: body.categoria,
      tipo: body.tipo,
      valorAlvo: body.valorAlvo != null ? Number(body.valorAlvo) : null,
      valorAtual: body.valorAtual != null ? Number(body.valorAtual) : null,
      unidade: body.unidade ?? null,
      prazo: body.prazo ? new Date(body.prazo) : null,
      concluida: body.concluida ?? undefined,
    },
  });

  return NextResponse.json(meta);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.meta.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
