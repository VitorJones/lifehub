import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const inicio = subDays(new Date(), 365);

  const habito = await prisma.habito.findUnique({
    where: { id },
    include: {
      registros: {
        where: { data: { gte: inicio } },
        orderBy: { data: "asc" },
      },
    },
  });

  if (!habito) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(habito);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const habito = await prisma.habito.update({
    where: { id },
    data: {
      nome: body.nome,
      descricao: body.descricao ?? null,
      icone: body.icone,
      cor: body.cor,
      frequencia: body.frequencia,
      diasSemana: body.diasSemana ? JSON.stringify(body.diasSemana) : null,
    },
  });

  return NextResponse.json(habito);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.habito.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
