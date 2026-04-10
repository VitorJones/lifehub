"use client";

import { useEffect, useState, useCallback } from "react";
import { PiggyBank, Plus, Pencil, Trash2 } from "lucide-react";
import { formatarMoeda } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Alocacao {
  id: string;
  nome: string;
  percentual: number | null;
  valorFixo: number | null;
  cor: string;
}

const CORES_PADRAO = ["#3b82f6", "#a855f7", "#f97316", "#22c55e", "#ef4444", "#eab308", "#06b6d4", "#ec4899"];

const FORM_VAZIO = { nome: "", percentual: "", valorFixo: "", cor: "#3b82f6", modo: "percentual" as "percentual" | "fixo" };

export default function AlocacaoPage() {
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  const [rendaMensal, setRendaMensal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Alocacao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [resA, resR] = await Promise.all([
        fetch("/api/alocacoes"),
        fetch("/api/financeiro/resumo"),
      ]);
      const [as, resumo] = await Promise.all([resA.json(), resR.json()]);
      setAlocacoes(as);
      setRendaMensal(resumo.receitas ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirModal = (a?: Alocacao) => {
    if (a) {
      setEditando(a);
      setForm({
        nome: a.nome,
        percentual: a.percentual?.toString() ?? "",
        valorFixo: a.valorFixo?.toString() ?? "",
        cor: a.cor,
        modo: a.percentual !== null ? "percentual" : "fixo",
      });
    } else {
      setEditando(null);
      setForm(FORM_VAZIO);
    }
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.nome) return;
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome,
        percentual: form.modo === "percentual" && form.percentual ? Number(form.percentual) : null,
        valorFixo: form.modo === "fixo" && form.valorFixo ? Number(form.valorFixo) : null,
        cor: form.cor,
      };

      if (editando) {
        await fetch(`/api/alocacoes/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/alocacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string) => {
    await fetch(`/api/alocacoes/${id}`, { method: "DELETE" });
    carregar();
  };

  // Calcula valores de cada alocação
  const alocacoesComValor = alocacoes.map((a) => {
    const valor = a.percentual !== null
      ? (rendaMensal * a.percentual) / 100
      : (a.valorFixo ?? 0);
    return { ...a, valorCalculado: valor };
  });

  const totalAlocado = alocacoesComValor.reduce((s, a) => s + a.valorCalculado, 0);
  const restante = rendaMensal - totalAlocado;
  const pctAlocado = rendaMensal > 0 ? (totalAlocado / rendaMensal) * 100 : 0;

  const dadosGrafico = [
    ...alocacoesComValor.filter((a) => a.valorCalculado > 0).map((a) => ({
      name: a.nome,
      value: a.valorCalculado,
      cor: a.cor,
    })),
    ...(restante > 0 ? [{ name: "Não alocado", value: restante, cor: "#27272a" }] : []),
  ];

  return (
    <div className="p-8">
      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Renda do Mês", valor: formatarMoeda(rendaMensal), cor: "#22c55e" },
          { label: "Total Alocado", valor: formatarMoeda(totalAlocado), cor: "#eab308" },
          { label: "Restante", valor: formatarMoeda(Math.max(restante, 0)), cor: restante >= 0 ? "#3b82f6" : "#ef4444" },
          { label: "% Alocado", valor: `${pctAlocado.toFixed(0)}%`, cor: "#a855f7" },
        ].map((c) => (
          <div key={c.label} className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
            <p className="text-xs text-[#52525b] mb-1">{c.label}</p>
            <p className="text-xl font-mono font-semibold" style={{ color: c.cor }}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading font-semibold text-[#f5f5f5]">Alocação de Renda</h2>
          <p className="text-xs text-[#52525b] mt-0.5">Planeje para onde vai seu dinheiro</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nova Alocação
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
          <div className="h-64 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Lista de alocações */}
          <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5">
            <h3 className="font-medium text-[#f5f5f5] mb-4 text-sm">Suas Alocações</h3>
            {alocacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PiggyBank size={36} className="text-[#27272a] mb-3" />
                <p className="text-[#52525b] text-sm">Nenhuma alocação configurada</p>
                <button onClick={() => abrirModal()} className="mt-3 text-xs text-[#f97316] hover:underline">
                  Criar primeira alocação
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {alocacoesComValor.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 group">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: a.cor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[#f5f5f5] font-medium">{a.nome}</span>
                        <span className="text-sm font-mono text-[#a1a1aa]">{formatarMoeda(a.valorCalculado)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#1a1a1f] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${rendaMensal > 0 ? Math.min((a.valorCalculado / rendaMensal) * 100, 100) : 0}%`,
                              background: a.cor,
                            }}
                          />
                        </div>
                        <span className="text-xs text-[#52525b] flex-shrink-0 w-10 text-right">
                          {a.percentual !== null ? `${a.percentual}%` : `R$`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => abrirModal(a)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => excluir(a.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {restante > 0 && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#27272a]">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 bg-[#27272a]" />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-[#52525b]">Não alocado</span>
                      <span className="text-sm font-mono text-[#52525b]">{formatarMoeda(restante)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gráfico donut */}
          <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5">
            <h3 className="font-medium text-[#f5f5f5] mb-4 text-sm">Distribuição da Renda</h3>
            {dadosGrafico.length === 0 || rendaMensal === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#52525b] text-sm">
                Sem dados para exibir
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie
                      data={dadosGrafico}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {dadosGrafico.map((entry, i) => (
                        <Cell key={i} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#1a1a1f", border: "1px solid #27272a", borderRadius: 8 }}
                      labelStyle={{ color: "#f5f5f5" }}
                      formatter={(v) => formatarMoeda(Number(v))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {dadosGrafico.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.cor }} />
                      <span className="text-xs text-[#a1a1aa] truncate">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">{editando ? "Editar Alocação" : "Nova Alocação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Essenciais, Lazer, Investimentos..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              />
            </div>

            {/* Modo: percentual ou valor fixo */}
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Tipo</Label>
              <div className="flex gap-2">
                {(["percentual", "fixo"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, modo: m }))}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                      form.modo === m
                        ? "border-[#f97316] text-[#f97316] bg-[#f97316]/10"
                        : "border-[#27272a] text-[#a1a1aa] hover:bg-[#1a1a1f]"
                    }`}
                  >
                    {m === "percentual" ? "% da renda" : "Valor fixo"}
                  </button>
                ))}
              </div>
            </div>

            {form.modo === "percentual" ? (
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Percentual (%)</Label>
                <Input
                  type="number"
                  value={form.percentual}
                  onChange={(e) => setForm((f) => ({ ...f, percentual: e.target.value }))}
                  placeholder="50"
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
                />
                {form.percentual && rendaMensal > 0 && (
                  <p className="text-xs text-[#52525b] mt-1">
                    ≈ {formatarMoeda((rendaMensal * Number(form.percentual)) / 100)} com renda atual
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Valor fixo (R$)</Label>
                <Input
                  type="number"
                  value={form.valorFixo}
                  onChange={(e) => setForm((f) => ({ ...f, valorFixo: e.target.value }))}
                  placeholder="1000,00"
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
                />
              </div>
            )}

            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {CORES_PADRAO.map((cor) => (
                  <button
                    key={cor}
                    onClick={() => setForm((f) => ({ ...f, cor }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      form.cor === cor ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ background: cor }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome} className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                {salvando ? "Salvando..." : editando ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
