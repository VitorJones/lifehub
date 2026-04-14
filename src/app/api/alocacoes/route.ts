import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const alocacoes = await prisma.alocacao.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(alocacoes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { nome, percentual, valorFixo, valorGuardado, cor } = body;

  const alocacao = await prisma.alocacao.create({
    data: {
      nome,
      percentual: percentual ? Number(percentual) : null,
      valorFixo: valorFixo ? Number(valorFixo) : null,
      valorGuardado: valorGuardado ? Number(valorGuardado) : 0,
      cor: cor ?? "#3b82f6",
    },
  });

  return NextResponse.json(alocacao, { status: 201 });
}
