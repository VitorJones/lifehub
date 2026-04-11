"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, Plus, Pencil, Trash2, PiggyBank, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarMoeda } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Aporte {
  id: string;
  valor: number;
  tipo: "deposito" | "resgate";
  data: string;
  investimento: { nome: string };
}

interface Investimento {
  id: string;
  nome: string;
  tipo: string;
  instituicao: string | null;
  valorInvestido: number;
  valorAtual: number;
  rendimentoAnual: number | null;
  tipoRendimento: string | null;
  dataInicio: string;
  dataVencimento: string | null;
  ehCaixinha: boolean;
  metaValor: number | null;
  totalAportes: number;
  ultimoAporte: Aporte | null;
}

const TIPO_RENDIMENTO_LABELS: Record<string, string> = {
  cdi: "CDI",
  prefixado: "Prefixado",
  "ipca+": "IPCA+",
  selic: "Selic",
  outro: "Outro",
};

const TIPO_INV_LABELS: Record<string, string> = {
  renda_fixa: "Renda Fixa",
  renda_variavel: "Renda Variável",
  caixinha: "Caixinha",
};

const FORM_INV_VAZIO = {
  nome: "",
  tipo: "renda_fixa",
  instituicao: "",
  valorInvestido: "",
  rendimentoAnual: "",
  tipoRendimento: "cdi",
  dataInicio: new Date().toISOString().slice(0, 10),
  dataVencimento: "",
  metaValor: "",
};

const FORM_APORTE_VAZIO = {
  valor: "",
  tipo: "deposito" as "deposito" | "resgate",
  data: new Date().toISOString().slice(0, 10),
};

export default function InvestimentosPage() {
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalInv, setModalInv] = useState(false);
  const [modalAporte, setModalAporte] = useState<Investimento | null>(null);
  const [editando, setEditando] = useState<Investimento | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [formInv, setFormInv] = useState(FORM_INV_VAZIO);
  const [formAporte, setFormAporte] = useState(FORM_APORTE_VAZIO);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [resI, resA] = await Promise.all([fetch("/api/investimentos"), fetch("/api/aportes")]);
      const [is, as] = await Promise.all([resI.json(), resA.json()]);
      setInvestimentos(is);
      setAportes(as);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirModalInv = (inv?: Investimento) => {
    if (inv) {
      setEditando(inv);
      setFormInv({
        nome: inv.nome,
        tipo: inv.tipo,
        instituicao: inv.instituicao ?? "",
        valorInvestido: inv.valorInvestido.toString(),
        rendimentoAnual: inv.rendimentoAnual?.toString() ?? "",
        tipoRendimento: inv.tipoRendimento ?? "cdi",
        dataInicio: inv.dataInicio.slice(0, 10),
        dataVencimento: inv.dataVencimento?.slice(0, 10) ?? "",
        metaValor: inv.metaValor?.toString() ?? "",
      });
    } else {
      setEditando(null);
      setFormInv(FORM_INV_VAZIO);
    }
    setModalInv(true);
  };

  const salvarInv = async () => {
    if (!formInv.nome) return;
    setSalvando(true);
    try {
      const payload = {
        nome: formInv.nome,
        tipo: formInv.tipo,
        instituicao: formInv.instituicao || null,
        valorInvestido: formInv.valorInvestido ? Number(formInv.valorInvestido) : 0,
        rendimentoAnual: formInv.rendimentoAnual ? Number(formInv.rendimentoAnual) : null,
        tipoRendimento: formInv.tipoRendimento || null,
        dataInicio: formInv.dataInicio,
        dataVencimento: formInv.dataVencimento || null,
        metaValor: formInv.metaValor ? Number(formInv.metaValor) : null,
      };
      if (editando) {
        await fetch(`/api/investimentos/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/investimentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setModalInv(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const salvarAporte = async () => {
    if (!modalAporte || !formAporte.valor) return;
    setSalvando(true);
    try {
      await fetch("/api/aportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investimentoId: modalAporte.id,
          valor: Number(formAporte.valor),
          tipo: formAporte.tipo,
          data: formAporte.data,
        }),
      });
      setModalAporte(null);
      setFormAporte(FORM_APORTE_VAZIO);
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: string) => {
    await fetch(`/api/investimentos/${id}`, { method: "DELETE" });
    carregar();
  };

  const regulares = investimentos.filter((i) => !i.ehCaixinha);
  const caixinhas = investimentos.filter((i) => i.ehCaixinha);

  const totalInvestido = regulares.reduce((s, i) => s + i.valorInvestido, 0);
  const totalAtual = regulares.reduce((s, i) => s + i.valorAtual, 0);
  const rendimentoEstimado = totalAtual - totalInvestido;
  const totalCaixinhas = caixinhas.reduce((s, i) => s + i.valorAtual, 0);

  const ehCaixinha = formInv.tipo === "caixinha";

  return (
    <div className="p-4 md:p-8">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#52525b] mb-1">Total Investido</p>
          <p className="text-lg md:text-2xl font-mono font-semibold text-[#22c55e] truncate">{formatarMoeda(totalInvestido)}</p>
        </div>
        <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#52525b] mb-1">Rendimento Estimado</p>
          <p className="text-lg md:text-2xl font-mono font-semibold truncate" style={{ color: rendimentoEstimado >= 0 ? "#22c55e" : "#ef4444" }}>
            {rendimentoEstimado >= 0 ? "+" : ""}{formatarMoeda(rendimentoEstimado)}
          </p>
        </div>
        <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#52525b] mb-1">Total em Caixinhas</p>
          <p className="text-lg md:text-2xl font-mono font-semibold text-[#a855f7] truncate">{formatarMoeda(totalCaixinhas)}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading font-semibold text-[#f5f5f5]">Investimentos & Caixinhas</h2>
          <p className="text-xs text-[#52525b] mt-0.5">Acompanhe seu patrimônio investido</p>
        </div>
        <button
          onClick={() => abrirModalInv()}
          className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Novo Investimento
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* Seção: Investimentos regulares */}
          {regulares.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp size={16} className="text-[#22c55e]" />
                <h3 className="font-medium text-[#f5f5f5] text-sm">Investimentos</h3>
                <div className="flex-1 h-px bg-[#27272a]" />
              </div>
              <div className="space-y-3">
                {regulares.map((inv) => {
                  const rendPct = inv.valorInvestido > 0
                    ? ((inv.valorAtual - inv.valorInvestido) / inv.valorInvestido) * 100
                    : 0;

                  return (
                    <div key={inv.id} className="bg-[#111113] border border-[#27272a] rounded-xl px-5 py-4 hover:border-[#3f3f46] transition-all duration-200 group">
                      <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#22c55e]/10 shrink-0">
                          <TrendingUp size={16} className="text-[#22c55e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[#f5f5f5]">{inv.nome}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {inv.instituicao && <span className="text-xs text-[#52525b]">{inv.instituicao}</span>}
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] font-medium">
                                  {TIPO_INV_LABELS[inv.tipo] ?? inv.tipo}
                                </span>
                                {inv.rendimentoAnual && (
                                  <span className="text-xs text-[#3b82f6]">
                                    {inv.rendimentoAnual}% a.a. {inv.tipoRendimento ? `(${TIPO_RENDIMENTO_LABELS[inv.tipoRendimento] ?? inv.tipoRendimento})` : ""}
                                  </span>
                                )}
                                {inv.dataVencimento && (
                                  <span className="text-xs text-[#52525b]">
                                    vence {format(new Date(inv.dataVencimento), "MMM yyyy", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => { setModalAporte(inv); setFormAporte(FORM_APORTE_VAZIO); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#3b82f6] border border-[#3b82f6]/30 rounded-lg hover:bg-[#3b82f6]/10 transition-colors"
                              >
                                <Plus size={11} /> Aporte
                              </button>
                              <button onClick={() => abrirModalInv(inv)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => excluir(inv.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-semibold text-[#f5f5f5]">{formatarMoeda(inv.valorAtual)}</p>
                          <p className="text-xs mt-0.5" style={{ color: rendPct >= 0 ? "#22c55e" : "#ef4444" }}>
                            {rendPct >= 0 ? "+" : ""}{rendPct.toFixed(2)}%
                          </p>
                          <p className="text-xs text-[#52525b]">investido: {formatarMoeda(inv.valorInvestido)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção: Caixinhas */}
          {caixinhas.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <PiggyBank size={16} className="text-[#a855f7]" />
                <h3 className="font-medium text-[#f5f5f5] text-sm">Caixinhas</h3>
                <div className="flex-1 h-px bg-[#27272a]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {caixinhas.map((inv) => {
                  const pct = inv.metaValor && inv.metaValor > 0
                    ? Math.min((inv.valorAtual / inv.metaValor) * 100, 100)
                    : null;

                  return (
                    <div key={inv.id} className="bg-[#111113] border border-[#27272a] rounded-xl p-4 hover:border-[#3f3f46] transition-all duration-200 group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#a855f7]/10">
                            <PiggyBank size={15} className="text-[#a855f7]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#f5f5f5] text-sm">{inv.nome}</p>
                            <p className="text-xs text-[#52525b]">{inv.totalAportes} aporte{inv.totalAportes !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setModalAporte(inv); setFormAporte(FORM_APORTE_VAZIO); }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-[#a855f7] border border-[#a855f7]/30 rounded-lg hover:bg-[#a855f7]/10 transition-colors"
                          >
                            <Plus size={10} /> Guardar
                          </button>
                          <button onClick={() => excluir(inv.id)} className="w-6 h-6 rounded flex items-center justify-center text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-semibold text-[#f5f5f5]">{formatarMoeda(inv.valorAtual)}</span>
                          {inv.metaValor && (
                            <span className="text-xs text-[#52525b]">meta: {formatarMoeda(inv.metaValor)}</span>
                          )}
                        </div>
                        {pct !== null && (
                          <>
                            <div className="h-2 bg-[#1a1a1f] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, background: pct >= 100 ? "#22c55e" : "#a855f7" }}
                              />
                            </div>
                            <p className="text-xs text-[#52525b] mt-1">{pct.toFixed(0)}% da meta</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {investimentos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111113] border border-[#27272a] rounded-xl">
              <TrendingUp size={40} className="text-[#27272a] mb-3" />
              <p className="text-[#a1a1aa] font-medium mb-1">Nenhum investimento cadastrado</p>
              <p className="text-[#52525b] text-sm mb-4">Adicione investimentos e caixinhas para acompanhar seu patrimônio</p>
              <button onClick={() => abrirModalInv()} className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors">
                <Plus size={15} /> Novo Investimento
              </button>
            </div>
          )}

          {/* Histórico de aportes */}
          {aportes.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-medium text-[#f5f5f5] text-sm">Histórico de Aportes</h3>
                <div className="flex-1 h-px bg-[#27272a]" />
              </div>
              <div className="space-y-2">
                {aportes.slice(0, 20).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 bg-[#111113] border border-[#27272a] rounded-xl px-4 py-3">
                    {a.tipo === "deposito" ? (
                      <ArrowDownCircle size={16} className="text-[#22c55e] shrink-0" />
                    ) : (
                      <ArrowUpCircle size={16} className="text-[#ef4444] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#f5f5f5]">{a.investimento.nome}</p>
                      <p className="text-xs text-[#52525b]">{format(new Date(a.data), "dd 'de' MMM yyyy", { locale: ptBR })}</p>
                    </div>
                    <p className="font-mono font-medium" style={{ color: a.tipo === "deposito" ? "#22c55e" : "#ef4444" }}>
                      {a.tipo === "deposito" ? "+" : "-"}{formatarMoeda(a.valor)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Novo/Editar Investimento */}
      <Dialog open={modalInv} onOpenChange={setModalInv}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">{editando ? "Editar Investimento" : "Novo Investimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Nome</Label>
              <Input value={formInv.nome} onChange={(e) => setFormInv((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Tesouro Selic, CDB Nubank..." className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]" />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Tipo</Label>
              <Select value={formInv.tipo} onValueChange={(v) => setFormInv((f) => ({ ...f, tipo: v ?? f.tipo }))}>
                <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                  {Object.entries(TIPO_INV_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-[#f5f5f5] focus:bg-[#222228]">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!ehCaixinha && (
              <>
                <div>
                  <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Instituição</Label>
                  <Input value={formInv.instituicao} onChange={(e) => setFormInv((f) => ({ ...f, instituicao: e.target.value }))} placeholder="Nubank, XP, Rico..." className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Rendimento (% a.a.)</Label>
                    <Input type="number" value={formInv.rendimentoAnual} onChange={(e) => setFormInv((f) => ({ ...f, rendimentoAnual: e.target.value }))} placeholder="13.25" className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]" />
                  </div>
                  <div>
                    <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Tipo de rendimento</Label>
                    <Select value={formInv.tipoRendimento} onValueChange={(v) => setFormInv((f) => ({ ...f, tipoRendimento: v ?? f.tipoRendimento }))}>
                      <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                        {Object.entries(TIPO_RENDIMENTO_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-[#f5f5f5] focus:bg-[#222228]">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Valor inicial (R$)</Label>
                  <Input type="number" value={formInv.valorInvestido} onChange={(e) => setFormInv((f) => ({ ...f, valorInvestido: e.target.value }))} placeholder="0,00" className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]" />
                </div>
                <div>
                  <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Data de vencimento (opcional)</Label>
                  <Input type="date" value={formInv.dataVencimento} onChange={(e) => setFormInv((f) => ({ ...f, dataVencimento: e.target.value }))} className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]" />
                </div>
              </>
            )}

            {ehCaixinha && (
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Meta (R$)</Label>
                <Input type="number" value={formInv.metaValor} onChange={(e) => setFormInv((f) => ({ ...f, metaValor: e.target.value }))} placeholder="Ex: 5000,00" className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]" />
              </div>
            )}

            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Data de início</Label>
              <Input type="date" value={formInv.dataInicio} onChange={(e) => setFormInv((f) => ({ ...f, dataInicio: e.target.value }))} className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalInv(false)} className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">Cancelar</button>
              <button onClick={salvarInv} disabled={salvando || !formInv.nome} className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                {salvando ? "Salvando..." : editando ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Aporte */}
      <Dialog open={!!modalAporte} onOpenChange={(open) => { if (!open) setModalAporte(null); }}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">
              {modalAporte?.ehCaixinha ? "Guardar / Resgatar" : "Registrar Aporte"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {modalAporte && (
              <div className="bg-[#1a1a1f] border border-[#27272a] rounded-lg px-4 py-2.5">
                <p className="text-xs text-[#52525b]">{modalAporte.ehCaixinha ? "Caixinha" : "Investimento"}</p>
                <p className="text-sm font-medium text-[#f5f5f5]">{modalAporte.nome}</p>
              </div>
            )}

            {/* Tipo depósito/resgate */}
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Tipo</Label>
              <div className="flex gap-2">
                {(["deposito", "resgate"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFormAporte((f) => ({ ...f, tipo: t }))}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                      formAporte.tipo === t
                        ? t === "deposito"
                          ? "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10"
                          : "border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10"
                        : "border-[#27272a] text-[#a1a1aa] hover:bg-[#1a1a1f]"
                    }`}
                  >
                    {t === "deposito" ? "Depósito" : "Resgate"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Valor (R$)</Label>
              <Input
                type="number"
                value={formAporte.valor}
                onChange={(e) => setFormAporte((f) => ({ ...f, valor: e.target.value }))}
                placeholder="0,00"
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Data</Label>
              <Input
                type="date"
                value={formAporte.data}
                onChange={(e) => setFormAporte((f) => ({ ...f, data: e.target.value }))}
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAporte(null)} className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">Cancelar</button>
              <button onClick={salvarAporte} disabled={salvando || !formAporte.valor} className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                {salvando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
