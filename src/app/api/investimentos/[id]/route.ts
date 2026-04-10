import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const investimento = await prisma.investimento.update({
    where: { id },
    data: {
      nome: body.nome,
      instituicao: body.instituicao || null,
      rendimentoAnual: body.rendimentoAnual ? Number(body.rendimentoAnual) : null,
      tipoRendimento: body.tipoRendimento || null,
      dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : null,
      metaValor: body.metaValor ? Number(body.metaValor) : null,
    },
  });

  return NextResponse.json(investimento);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.investimento.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
