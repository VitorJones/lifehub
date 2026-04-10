import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const metas = await prisma.meta.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(metas);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { titulo, descricao, categoria, tipo, valorAlvo, valorAtual, unidade, prazo } = body;

  const meta = await prisma.meta.create({
    data: {
      titulo,
      descricao,
      categoria,
      tipo,
      valorAlvo: valorAlvo ? Number(valorAlvo) : null,
      valorAtual: valorAtual ? Number(valorAtual) : null,
      unidade,
      prazo: prazo ? new Date(prazo) : null,
    },
  });

  return NextResponse.json(meta, { status: 201 });
}
