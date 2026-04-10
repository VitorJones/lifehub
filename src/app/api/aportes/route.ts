import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const investimentoId = searchParams.get("investimentoId");

  const aportes = await prisma.aporte.findMany({
    where: investimentoId ? { investimentoId } : undefined,
    include: { investimento: { select: { nome: true } } },
    orderBy: { data: "desc" },
    take: 50,
  });

  return NextResponse.json(aportes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { investimentoId, valor, tipo, data } = body;

  const aporte = await prisma.aporte.create({
    data: {
      investimentoId,
      valor: Number(valor),
      tipo: tipo ?? "deposito",
      data: new Date(data),
    },
  });

  return NextResponse.json(aporte, { status: 201 });
}
