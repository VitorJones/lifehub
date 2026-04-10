"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatarMoeda } from "@/lib/formatters";

interface Resumo {
  receitas: number;
  despesas: number;
  saldo: number;
  receitasAnterior: number;
  despesasAnterior: number;
  saldoAnterior: number;
  porCategoria: { nome: string; cor: string; total: number }[];
  evolucao: { mes: string; receitas: number; despesas: number }[];
}

function CardResumo({
  label,
  valor,
  anterior,
  cor,
  icon: Icon,
}: {
  label: string;
  valor: number;
  anterior: number;
  cor: string;
  icon: React.ElementType;
}) {
  const diff = anterior === 0 ? 0 : ((valor - anterior) / Math.abs(anterior)) * 100;
  const positivo = diff >= 0;

  return (
    <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 hover:border-[#3f3f46] transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${cor}18` }}>
          <Icon size={20} style={{ color: cor }} />
        </div>
        {anterior > 0 && (
          <span className={`flex items-center gap-1 text-xs ${positivo ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {positivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(diff).toFixed(0)}% vs anterior
          </span>
        )}
      </div>
      <p className="text-[#a1a1aa] text-sm mb-1">{label}</p>
      <p className="text-2xl font-mono font-semibold text-[#f5f5f5]">
        {formatarMoeda(valor)}
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipBar({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1f] border border-[#27272a] rounded-lg p-3 text-sm">
      <p className="text-[#a1a1aa] mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {formatarMoeda(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function VisaoGeralPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financeiro/resumo?mes=${mes}&ano=${ano}`);
      setResumo(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const navegarMes = (dir: -1 | 1) => {
    const d = new Date(ano, mes - 1 + dir, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
  };

  const mesLabel = format(new Date(ano, mes - 1, 1), "MMMM yyyy", { locale: ptBR });

  const totalPorCategoria = resumo?.porCategoria.reduce((a, c) => a + c.total, 0) ?? 0;

  return (
    <div className="p-8">
      {/* Navegação de mês */}
      <div className="flex items-center gap-3 mb-6">
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

      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <CardResumo
              label="Receitas"
              valor={resumo?.receitas ?? 0}
              anterior={resumo?.receitasAnterior ?? 0}
              cor="#22c55e"
              icon={TrendingUp}
            />
            <CardResumo
              label="Despesas"
              valor={resumo?.despesas ?? 0}
              anterior={resumo?.despesasAnterior ?? 0}
              cor="#ef4444"
              icon={TrendingDown}
            />
            <CardResumo
              label="Saldo do Mês"
              valor={resumo?.saldo ?? 0}
              anterior={resumo?.saldoAnterior ?? 0}
              cor="#f97316"
              icon={Wallet}
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Evolução mensal */}
            <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5">
              <h2 className="font-heading font-semibold text-[#f5f5f5] mb-5">
                Evolução Mensal
              </h2>
              {(resumo?.evolucao.every((e) => e.receitas === 0 && e.despesas === 0)) ? (
                <div className="flex items-center justify-center h-48 text-[#52525b] text-sm">
                  Sem dados para exibir
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={resumo?.evolucao} barGap={4}>
                    <XAxis
                      dataKey="mes"
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      width={45}
                    />
                    <Tooltip content={<TooltipBar />} cursor={{ fill: "#ffffff08" }} />
                    <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pizza por categoria */}
            <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5">
              <h2 className="font-heading font-semibold text-[#f5f5f5] mb-5">
                Gastos por Categoria
              </h2>
              {!resumo?.porCategoria.length ? (
                <div className="flex items-center justify-center h-48 text-[#52525b] text-sm">
                  Sem despesas no mês atual
                </div>
              ) : (
                <div className="flex gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={resumo.porCategoria}
                        dataKey="total"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {resumo.porCategoria.map((cat, i) => (
                          <Cell key={i} fill={cat.cor} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => formatarMoeda(Number(v))}
                        contentStyle={{
                          background: "#1a1a1f",
                          border: "1px solid #27272a",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 flex flex-col justify-center gap-2 overflow-y-auto max-h-52">
                    {resumo.porCategoria.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: cat.cor }}
                          />
                          <span className="text-[#a1a1aa] truncate max-w-[100px]">{cat.nome}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#f5f5f5] font-mono text-xs">
                            {formatarMoeda(cat.total)}
                          </span>
                          <span className="text-[#52525b] text-xs ml-1">
                            {totalPorCategoria > 0
                              ? `${((cat.total / totalPorCategoria) * 100).toFixed(0)}%`
                              : "0%"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
