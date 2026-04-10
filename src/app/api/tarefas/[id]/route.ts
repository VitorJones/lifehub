import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body   = await request.json();

  const tarefa = await prisma.tarefa.update({
    where: { id },
    data: {
      titulo:     body.titulo,
      descricao:  body.descricao  ?? null,
      status:     body.status,
      prioridade: body.prioridade,
      dataLimite: body.dataLimite ? new Date(body.dataLimite) : null,
      tags:       body.tags       ? JSON.stringify(body.tags) : null,
    },
  });

  return NextResponse.json(tarefa);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.tarefa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
