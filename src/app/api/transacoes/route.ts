import { NextResponse } from "next/server";
import { addMonths, format } from "date-fns";
import { prisma } from "@/lib/prisma";

// Converte string "yyyy-MM-dd" para Date ao meio-dia local (evita shift de UTC)
function parseData(data: string): Date {
  return data.length === 10 ? new Date(`${data}T12:00:00`) : new Date(data);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes");
  const ano = searchParams.get("ano");
  const tipo = searchParams.get("tipo");
  const categoriaId = searchParams.get("categoriaId");
  const contaId = searchParams.get("contaId");
  const busca = searchParams.get("busca");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (mes && ano) {
    const inicio = new Date(Number(ano), Number(mes) - 1, 1);
    const fim = new Date(Number(ano), Number(mes), 0, 23, 59, 59);
    where.data = { gte: inicio, lte: fim };
  }

  if (tipo) where.tipo = tipo;
  if (categoriaId) where.categoriaId = categoriaId;
  if (contaId) where.contaId = contaId;
  if (busca) where.descricao = { contains: busca };

  const transacoes = await prisma.transacao.findMany({
    where,
    include: { categoria: true, conta: true, cartao: { select: { id: true, nome: true, cor: true } } },
    orderBy: { data: "desc" },
  });

  return NextResponse.json(transacoes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    descricao, valor, tipo, data,
    categoriaId, contaId, cartaoId,
    formaPagamento, recorrente, observacao,
    parcelado, numParcelas,
  } = body;

  const v = Number(valor);
  const dataBase = parseData(data);
  const fpago = formaPagamento ?? "dinheiro";
  const cartIdFinal = (fpago === "credito" || fpago === "debito") && cartaoId ? cartaoId : null;
  const contaIdFinal = contaId && contaId !== "__none__" ? contaId : null;

  // ── Parcelamento ────────────────────────────────────────────────────────────
  if (parcelado && numParcelas && Number(numParcelas) > 1) {
    const np = Number(numParcelas);
    const valorParcela = Math.round((v / np) * 100) / 100;

    const parcelamento = await prisma.parcelamento.create({
      data: {
        descricao,
        valorTotal: v,
        numParcelas: np,
        valorParcela,
        parcelaAtual: 1,
        cartaoId: cartIdFinal,
        categoriaId,
        dataInicio: dataBase,
      },
    });

    for (let i = 0; i < np; i++) {
      const dataParcela = addMonths(dataBase, i);

      // Cria/garante fatura do mês para o cartão (só crédito tem fatura)
      if (cartIdFinal && fpago === "credito") {
        const mesRef = format(dataParcela, "yyyy-MM");
        await prisma.fatura.upsert({
          where: { cartaoId_mesReferencia: { cartaoId: cartIdFinal, mesReferencia: mesRef } },
          update: {},
          create: { cartaoId: cartIdFinal, mesReferencia: mesRef, status: "aberta" },
        });
      }

      await prisma.transacao.create({
        data: {
          descricao: `${descricao} (${i + 1}/${np})`,
          valor: valorParcela,
          tipo,
          data: dataParcela,
          categoriaId,
          contaId: contaIdFinal,
          cartaoId: cartIdFinal,
          formaPagamento: fpago,
          recorrente: false,
          observacao: observacao || null,
        },
      });
    }

    return NextResponse.json({ parcelamentoId: parcelamento.id }, { status: 201 });
  }

  // ── Transação simples ────────────────────────────────────────────────────────
  if (cartIdFinal && fpago === "credito") {
    const mesRef = format(dataBase, "yyyy-MM");
    await prisma.fatura.upsert({
      where: { cartaoId_mesReferencia: { cartaoId: cartIdFinal, mesReferencia: mesRef } },
      update: {},
      create: { cartaoId: cartIdFinal, mesReferencia: mesRef, status: "aberta" },
    });
  }

  const transacao = await prisma.transacao.create({
    data: {
      descricao,
      valor: v,
      tipo,
      data: dataBase,
      categoriaId,
      contaId: contaIdFinal,
      cartaoId: cartIdFinal,
      formaPagamento: fpago,
      recorrente: Boolean(recorrente),
      observacao: observacao || null,
    },
    include: { categoria: true, conta: true, cartao: { select: { id: true, nome: true, cor: true } } },
  });

  return NextResponse.json(transacao, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes");
  const ano = searchParams.get("ano");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (mes && ano) {
    const inicio = new Date(Number(ano), Number(mes) - 1, 1);
    const fim = new Date(Number(ano), Number(mes), 0, 23, 59, 59);
    where.data = { gte: inicio, lte: fim };
  }

  const { count } = await prisma.transacao.deleteMany({ where });
  return NextResponse.json({ ok: true, count });
}
