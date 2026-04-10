import { PrismaClient } from "@prisma/client";
import { subDays, subMonths, setDate } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Semeando dados...");

  // Limpa tudo na ordem correta
  await prisma.transacao.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.conta.deleteMany();

  // Categorias de despesa
  const [alim, moradia, transporte, saude, lazer, assinaturas, vestuario, educacao] =
    await Promise.all([
      prisma.categoria.create({ data: { nome: "Alimentação", tipo: "despesa", cor: "#f97316", icone: "UtensilsCrossed" } }),
      prisma.categoria.create({ data: { nome: "Moradia", tipo: "despesa", cor: "#3b82f6", icone: "Home" } }),
      prisma.categoria.create({ data: { nome: "Transporte", tipo: "despesa", cor: "#a855f7", icone: "Car" } }),
      prisma.categoria.create({ data: { nome: "Saúde", tipo: "despesa", cor: "#22c55e", icone: "Heart" } }),
      prisma.categoria.create({ data: { nome: "Lazer", tipo: "despesa", cor: "#eab308", icone: "Gamepad2" } }),
      prisma.categoria.create({ data: { nome: "Assinaturas", tipo: "despesa", cor: "#ec4899", icone: "CreditCard" } }),
      prisma.categoria.create({ data: { nome: "Vestuário", tipo: "despesa", cor: "#14b8a6", icone: "Shirt" } }),
      prisma.categoria.create({ data: { nome: "Educação", tipo: "despesa", cor: "#6366f1", icone: "BookOpen" } }),
    ]);

  // Categorias de receita
  const [salario, freelance, investRec] = await Promise.all([
    prisma.categoria.create({ data: { nome: "Salário", tipo: "receita", cor: "#22c55e", icone: "Briefcase" } }),
    prisma.categoria.create({ data: { nome: "Freelance", tipo: "receita", cor: "#3b82f6", icone: "Code2" } }),
    prisma.categoria.create({ data: { nome: "Investimentos", tipo: "receita", cor: "#a855f7", icone: "TrendingUp" } }),
  ]);

  // Contas
  const [nubank, brad, carteira] = await Promise.all([
    prisma.conta.create({ data: { nome: "Nubank", tipo: "corrente", saldoInicial: 1500, cor: "#a855f7", icone: "Landmark" } }),
    prisma.conta.create({ data: { nome: "Bradesco", tipo: "poupanca", saldoInicial: 8000, cor: "#ef4444", icone: "PiggyBank" } }),
    prisma.conta.create({ data: { nome: "Carteira", tipo: "carteira", saldoInicial: 200, cor: "#eab308", icone: "Wallet" } }),
  ]);

  const hoje = new Date();

  // Função para criar datas com hora ao meio-dia (evitar timezone issues)
  const d = (data: Date) => {
    const nd = new Date(data);
    nd.setHours(12, 0, 0, 0);
    return nd;
  };

  // Helper para pegar dia específico do mês
  const diaDoMes = (mes: number, dia: number) => {
    const ref = subMonths(hoje, mes);
    return d(setDate(ref, dia));
  };

  // Transações dos últimos 6 meses
  const transacoes = [];

  for (let m = 5; m >= 0; m--) {
    // Receitas mensais
    transacoes.push(
      { descricao: "Salário", valor: 6500, tipo: "receita", data: diaDoMes(m, 5), categoriaId: salario.id, contaId: nubank.id },
      { descricao: "Rendimento poupança", valor: 42 + Math.random() * 10, tipo: "receita", data: diaDoMes(m, 10), categoriaId: investRec.id, contaId: brad.id },
    );
    if (m % 2 === 0) {
      transacoes.push({ descricao: "Freela - site", valor: 1200 + Math.random() * 500, tipo: "receita", data: diaDoMes(m, 15), categoriaId: freelance.id, contaId: nubank.id });
    }

    // Despesas fixas
    transacoes.push(
      { descricao: "Aluguel", valor: 1800, tipo: "despesa", data: diaDoMes(m, 10), categoriaId: moradia.id, contaId: nubank.id, recorrente: true },
      { descricao: "Netflix", valor: 39.90, tipo: "despesa", data: diaDoMes(m, 12), categoriaId: assinaturas.id, contaId: nubank.id, recorrente: true },
      { descricao: "Spotify", valor: 21.90, tipo: "despesa", data: diaDoMes(m, 12), categoriaId: assinaturas.id, contaId: nubank.id, recorrente: true },
      { descricao: "Plano de saúde", valor: 320, tipo: "despesa", data: diaDoMes(m, 8), categoriaId: saude.id, contaId: nubank.id, recorrente: true },
      { descricao: "Academia", valor: 89.90, tipo: "despesa", data: diaDoMes(m, 1), categoriaId: saude.id, contaId: nubank.id, recorrente: true },
    );

    // Despesas variáveis
    const nMercado = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < nMercado; i++) {
      transacoes.push({
        descricao: ["Mercado Livre", "Supermercado Extra", "Pão de Açúcar", "Atacadão"][Math.floor(Math.random() * 4)],
        valor: 150 + Math.random() * 200,
        tipo: "despesa",
        data: d(subDays(diaDoMes(m, 15), Math.floor(Math.random() * 20))),
        categoriaId: alim.id,
        contaId: [nubank, carteira][Math.floor(Math.random() * 2)].id,
      });
    }

    transacoes.push(
      { descricao: "iFood", valor: 45 + Math.random() * 30, tipo: "despesa", data: diaDoMes(m, 3), categoriaId: alim.id, contaId: nubank.id },
      { descricao: "Gasolina", valor: 180 + Math.random() * 60, tipo: "despesa", data: diaDoMes(m, 7), categoriaId: transporte.id, contaId: carteira.id },
      { descricao: "Uber", valor: 35 + Math.random() * 20, tipo: "despesa", data: diaDoMes(m, 20), categoriaId: transporte.id, contaId: nubank.id },
    );

    if (m <= 2) {
      transacoes.push({ descricao: "Roupa", valor: 200 + Math.random() * 150, tipo: "despesa", data: diaDoMes(m, 18), categoriaId: vestuario.id, contaId: nubank.id });
    }
    if (m % 3 === 0) {
      transacoes.push({ descricao: "Cinema", valor: 60 + Math.random() * 40, tipo: "despesa", data: diaDoMes(m, 22), categoriaId: lazer.id, contaId: carteira.id });
      transacoes.push({ descricao: "Livro", valor: 45 + Math.random() * 30, tipo: "despesa", data: diaDoMes(m, 25), categoriaId: educacao.id, contaId: nubank.id });
    }
  }

  // Insere todas as transações
  for (const t of transacoes) {
    await prisma.transacao.create({
      data: {
        descricao: t.descricao,
        valor: Math.round((t.valor) * 100) / 100,
        tipo: t.tipo,
        data: t.data,
        categoriaId: t.categoriaId,
        contaId: t.contaId,
        recorrente: (t as { recorrente?: boolean }).recorrente ?? false,
      },
    });
  }

  console.log(`✅ ${transacoes.length} transações criadas`);
  console.log("✅ 11 categorias, 3 contas");
  console.log("🎉 Seed concluído!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
