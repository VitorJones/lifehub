import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET() {
  const inicio = subDays(new Date(), 365);

  const habitos = await prisma.habito.findMany({
    where: { ativo: true },
    include: {
      registros: {
        where: { data: { gte: inicio } },
        orderBy: { data: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(habitos);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { nome, descricao, icone, cor, frequencia, diasSemana } = body;

  const habito = await prisma.habito.create({
    data: {
      nome,
      descricao: descricao || null,
      icone,
      cor,
      frequencia,
      diasSemana: diasSemana ? JSON.stringify(diasSemana) : null,
    },
  });

  return NextResponse.json(habito, { status: 201 });
}
