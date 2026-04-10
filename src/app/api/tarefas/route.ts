import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const prioridade = searchParams.get("prioridade");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (prioridade) where.prioridade = prioridade;

  const tarefas = await prisma.tarefa.findMany({
    where,
    orderBy: [{ prioridade: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tarefas);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { titulo, descricao, status, prioridade, dataLimite, tags } = body;

  const tarefa = await prisma.tarefa.create({
    data: {
      titulo,
      descricao,
      status: status ?? "pendente",
      prioridade: prioridade ?? "media",
      dataLimite: dataLimite ? new Date(dataLimite) : null,
      tags: tags ? JSON.stringify(tags) : null,
    },
  });

  return NextResponse.json(tarefa, { status: 201 });
}
