import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const contas = await prisma.conta.findMany({
    where: { ativo: true },
    include: {
      _count: { select: { transacoes: true } },
      transacoes: { select: { valor: true, tipo: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const contasComSaldo = contas.map((conta) => {
    const saldoTransacoes = conta.transacoes.reduce((acc, t) => {
      return t.tipo === "receita" ? acc + t.valor : acc - t.valor;
    }, 0);
    return {
      id: conta.id,
      nome: conta.nome,
      tipo: conta.tipo,
      cor: conta.cor,
      icone: conta.icone,
      ativo: conta.ativo,
      createdAt: conta.createdAt,
      totalTransacoes: conta._count.transacoes,
      saldo: conta.saldoInicial + saldoTransacoes,
    };
  });

  return NextResponse.json(contasComSaldo);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { nome, tipo, saldoInicial, cor, icone } = body;

  const conta = await prisma.conta.create({
    data: {
      nome,
      tipo,
      saldoInicial: Number(saldoInicial ?? 0),
      cor: cor ?? "#3b82f6",
      icone: icone ?? "Wallet",
    },
  });

  return NextResponse.json(conta, { status: 201 });
}
