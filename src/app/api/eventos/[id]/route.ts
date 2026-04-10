import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body   = await request.json();

  const evento = await prisma.evento.update({
    where: { id },
    data: {
      titulo:          body.titulo,
      descricao:       body.descricao       ?? null,
      dataInicio:      new Date(body.dataInicio),
      dataFim:         body.dataFim         ? new Date(body.dataFim) : null,
      local:           body.local           ?? null,
      cor:             body.cor,
      diaInteiro:      Boolean(body.diaInteiro),
      lembrete:        body.lembrete        != null ? Number(body.lembrete) : null,
      tipo:            body.tipo            ?? "evento",
      recorrencia:     body.recorrencia     ?? null,
      diasRecorrencia: body.diasRecorrencia ? JSON.stringify(body.diasRecorrencia) : null,
    },
  });

  return NextResponse.json(evento);
}

/** PATCH — adiciona uma data de exceção (excluir apenas esta ocorrência) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }   = await params;
  const body     = await request.json();
  const excecao: string = body.excecao; // "yyyy-MM-dd"

  const atual = await prisma.evento.findUnique({ where: { id } });
  if (!atual) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const lista: string[] = atual.excecoes ? JSON.parse(atual.excecoes) : [];
  if (!lista.includes(excecao)) lista.push(excecao);

  const evento = await prisma.evento.update({
    where: { id },
    data:  { excecoes: JSON.stringify(lista) },
  });

  return NextResponse.json(evento);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.evento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
