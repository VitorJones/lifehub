import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get("inicio");
  const fim    = searchParams.get("fim");

  const where: Record<string, unknown> = {};
  if (inicio && fim) {
    where.dataInicio = { gte: new Date(inicio), lte: new Date(fim) };
  }

  const eventos = await prisma.evento.findMany({
    where,
    orderBy: { dataInicio: "asc" },
  });

  return NextResponse.json(eventos);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    titulo, descricao, dataInicio, dataFim,
    local, cor, diaInteiro, lembrete,
    tipo, recorrencia, diasRecorrencia,
  } = body;

  const evento = await prisma.evento.create({
    data: {
      titulo,
      descricao:        descricao       ?? null,
      dataInicio:       new Date(dataInicio),
      dataFim:          dataFim         ? new Date(dataFim) : null,
      local:            local           ?? null,
      cor:              cor             ?? "#3b82f6",
      diaInteiro:       Boolean(diaInteiro),
      lembrete:         lembrete        ? Number(lembrete) : null,
      tipo:             tipo            ?? "evento",
      recorrencia:      recorrencia     ?? null,
      diasRecorrencia:  diasRecorrencia ? JSON.stringify(diasRecorrencia) : null,
    },
  });

  return NextResponse.json(evento, { status: 201 });
}
