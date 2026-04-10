import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const parcelamentos = await prisma.parcelamento.findMany({
    where: { ativo: true },
    include: { cartao: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(parcelamentos);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { descricao, valorTotal, numParcelas, cartaoId, categoriaId, dataInicio } = body;

  const vt = Number(valorTotal);
  const np = Number(numParcelas);

  const parcelamento = await prisma.parcelamento.create({
    data: {
      descricao,
      valorTotal: vt,
      numParcelas: np,
      valorParcela: Math.round((vt / np) * 100) / 100,
      parcelaAtual: 1,
      cartaoId: cartaoId || null,
      categoriaId: categoriaId || null,
      dataInicio: new Date(dataInicio),
    },
    include: { cartao: true },
  });

  return NextResponse.json(parcelamento, { status: 201 });
}
