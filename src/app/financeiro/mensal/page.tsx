"use client";

import { useEffect, useState, useCallback } from "react";
import { format, getDaysInMonth, getDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { formatarMoeda } from "@/lib/formatters";

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  data: string;
  categoria: { nome: string; cor: string };
}

interface DiaDados {
  dia: number;
  transacoes: Transacao[];
  totalReceitas: number;
  totalDespesas: number;
}

export default function MensalPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transacoes?mes=${mes}&ano=${ano}`);
      setTransacoes(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const navegarMes = (dir: -1 | 1) => {
    const d = new Date(ano, mes - 1 + dir, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
    setDiaSelecionado(null);
  };

  const mesLabel = format(new Date(ano, mes - 1, 1), "MMMM yyyy", { locale: ptBR });
  const totalDias = getDaysInMonth(new Date(ano, mes - 1, 1));
  // Dia da semana do 1º do mês (0=dom, ajustando para seg=0)
  const inicioSemana = (getDay(startOfMonth(new Date(ano, mes - 1, 1))) + 6) % 7;

  // Monta mapa de transações por dia
  const porDia: Record<number, DiaDados> = {};
  for (let d = 1; d <= totalDias; d++) {
    porDia[d] = { dia: d, transacoes: [], totalReceitas: 0, totalDespesas: 0 };
  }
  transacoes.forEach((t) => {
    const dia = new Date(t.data).getDate();
    if (!porDia[dia]) return;
    porDia[dia].transacoes.push(t);
    if (t.tipo === "receita") porDia[dia].totalReceitas += t.valor;
    else porDia[dia].totalDespesas += t.valor;
  });

  const totalReceitas = transacoes.filter((t) => t.tipo === "receita").reduce((a, t) => a + t.valor, 0);
  const totalDespesas = transacoes.filter((t) => t.tipo === "despesa").reduce((a, t) => a + t.valor, 0);

  // Dias com mais movimento (para escalar a barra)
  const maxMovimento = Math.max(...Object.values(porDia).map((d) => d.totalReceitas + d.totalDespesas), 1);

  const transacoesDia = diaSelecionado ? (porDia[diaSelecionado]?.transacoes ?? []) : [];

  const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="p-8">
      {/* Nav */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navegarMes(-1)}
            className="w-8 h-8 rounded-lg bg-[#1a1a1f] border border-[#27272a] flex items-center justify-center hover:bg-[#222228] transition-colors"
          >
            <ChevronLeft size={16} className="text-[#a1a1aa]" />
          </button>
          <span className="font-heading font-medium text-[#f5f5f5] capitalize min-w-[160px] text-center">
            {mesLabel}
          </span>
          <button
            onClick={() => navegarMes(1)}
            className="w-8 h-8 rounded-lg bg-[#1a1a1f] border border-[#27272a] flex items-center justify-center hover:bg-[#222228] transition-colors"
          >
            <ChevronRight size={16} className="text-[#a1a1aa]" />
          </button>
        </div>

        {/* Totais rápidos */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-4 py-2">
            <TrendingUp size={13} className="text-[#22c55e]" />
            <span className="text-xs text-[#a1a1aa]">Receitas</span>
            <span className="text-sm font-mono font-semibold text-[#22c55e]">{formatarMoeda(totalReceitas)}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-2">
            <TrendingDown size={13} className="text-[#ef4444]" />
            <span className="text-xs text-[#a1a1aa]">Despesas</span>
            <span className="text-sm font-mono font-semibold text-[#ef4444]">{formatarMoeda(totalDespesas)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendário */}
        <div className="flex-1 bg-[#111113] border border-[#27272a] rounded-xl p-5">
          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {diasSemana.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-[#52525b] py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Células do calendário */}
          <div className="grid grid-cols-7 gap-1">
            {/* Células vazias no início */}
            {Array.from({ length: inicioSemana }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Dias */}
            {Array.from({ length: totalDias }, (_, i) => i + 1).map((dia) => {
              const dados = porDia[dia];
              const temTransacoes = dados.transacoes.length > 0;
              const isHoje =
                dia === hoje.getDate() &&
                mes === hoje.getMonth() + 1 &&
                ano === hoje.getFullYear();
              const isSelecionado = diaSelecionado === dia;
              const movimento = dados.totalReceitas + dados.totalDespesas;
              const saldo = dados.totalReceitas - dados.totalDespesas;

              return (
                <button
                  key={dia}
                  onClick={() => setDiaSelecionado(isSelecionado ? null : dia)}
                  className={`
                    relative flex flex-col items-center rounded-xl p-2 transition-all duration-200 min-h-[64px]
                    ${isSelecionado ? "bg-[#f97316]/10 border border-[#f97316]/40" : "hover:bg-[#1a1a1f] border border-transparent"}
                    ${isHoje && !isSelecionado ? "border-[#27272a]" : ""}
                  `}
                >
                  <span
                    className={`text-sm font-medium mb-1 ${
                      isHoje
                        ? "w-6 h-6 flex items-center justify-center rounded-full bg-[#f97316] text-white"
                        : isSelecionado
                        ? "text-[#f97316]"
                        : "text-[#a1a1aa]"
                    }`}
                  >
                    {dia}
                  </span>

                  {temTransacoes && (
                    <>
                      {/* Barra de movimento */}
                      <div className="w-full h-1 bg-[#27272a] rounded-full overflow-hidden mt-auto">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(movimento / maxMovimento) * 100}%`,
                            background: saldo >= 0 ? "#22c55e" : "#ef4444",
                          }}
                        />
                      </div>
                      {/* Valor líquido */}
                      <span
                        className={`text-[10px] font-mono mt-0.5 ${
                          saldo >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                        }`}
                      >
                        {saldo >= 0 ? "+" : ""}
                        {saldo >= 1000 || saldo <= -1000
                          ? `${(saldo / 1000).toFixed(1)}k`
                          : saldo.toFixed(0)}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel lateral — detalhes do dia */}
        <div className="w-72 flex-shrink-0">
          {diaSelecionado ? (
            <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-[#52525b] capitalize">
                    {format(new Date(ano, mes - 1, diaSelecionado), "EEEE", { locale: ptBR })}
                  </p>
                  <p className="font-heading font-semibold text-[#f5f5f5]">
                    {diaSelecionado} de {format(new Date(ano, mes - 1, 1), "MMMM", { locale: ptBR })}
                  </p>
                </div>
                <span className="text-xs text-[#52525b] bg-[#1a1a1f] px-2 py-1 rounded-lg">
                  {transacoesDia.length} transaç{transacoesDia.length === 1 ? "ão" : "ões"}
                </span>
              </div>

              {transacoesDia.length === 0 ? (
                <p className="text-[#52525b] text-sm text-center py-6">
                  Sem transações neste dia
                </p>
              ) : (
                <div className="space-y-2">
                  {transacoesDia.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[#1a1a1f] last:border-0">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: t.categoria.cor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#f5f5f5] truncate">{t.descricao}</p>
                        <p className="text-xs text-[#52525b]">{t.categoria.nome}</p>
                      </div>
                      <span
                        className={`text-sm font-mono font-medium flex-shrink-0 ${
                          t.tipo === "receita" ? "text-[#22c55e]" : "text-[#f5f5f5]"
                        }`}
                      >
                        {t.tipo === "receita" ? "+" : "-"}
                        {formatarMoeda(t.valor)}
                      </span>
                    </div>
                  ))}

                  {/* Saldo do dia */}
                  <div className="pt-2 mt-1 border-t border-[#27272a] flex items-center justify-between">
                    <span className="text-xs text-[#52525b]">Saldo do dia</span>
                    <span
                      className={`text-sm font-mono font-semibold ${
                        (porDia[diaSelecionado]?.totalReceitas ?? 0) -
                          (porDia[diaSelecionado]?.totalDespesas ?? 0) >=
                        0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {formatarMoeda(
                        (porDia[diaSelecionado]?.totalReceitas ?? 0) -
                          (porDia[diaSelecionado]?.totalDespesas ?? 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5">
              <p className="text-[#52525b] text-sm text-center py-8">
                Clique em um dia para ver as transações
              </p>

              {/* Resumo do mês */}
              {!loading && transacoes.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-[#27272a]">
                  <p className="text-xs font-medium text-[#52525b] uppercase tracking-wider">
                    Dias com movimento
                  </p>
                  {Object.values(porDia)
                    .filter((d) => d.transacoes.length > 0)
                    .sort((a, b) => b.totalDespesas + b.totalReceitas - (a.totalDespesas + a.totalReceitas))
                    .slice(0, 5)
                    .map((d) => (
                      <button
                        key={d.dia}
                        onClick={() => setDiaSelecionado(d.dia)}
                        className="w-full flex items-center justify-between py-1.5 hover:text-[#f5f5f5] transition-colors group"
                      >
                        <span className="text-sm text-[#a1a1aa] group-hover:text-[#f5f5f5]">
                          Dia {d.dia}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#52525b]">
                            {d.transacoes.length}x
                          </span>
                          <span
                            className={`text-xs font-mono ${
                              d.totalReceitas - d.totalDespesas >= 0
                                ? "text-[#22c55e]"
                                : "text-[#ef4444]"
                            }`}
                          >
                            {formatarMoeda(Math.abs(d.totalReceitas - d.totalDespesas))}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
