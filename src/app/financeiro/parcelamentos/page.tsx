"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreditCard, Plus, ChevronRight } from "lucide-react";
import { formatarMoeda } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Cartao {
  id: string;
  nome: string;
  cor: string;
}

interface Parcelamento {
  id: string;
  descricao: string;
  valorTotal: number;
  numParcelas: number;
  parcelaAtual: number;
  valorParcela: number;
  cartaoId: string | null;
  cartao: Cartao | null;
  dataInicio: string;
  ativo: boolean;
}

const CORES = ["#3b82f6", "#a855f7", "#f97316", "#22c55e", "#ef4444", "#eab308", "#06b6d4", "#ec4899"];

export default function ParcelamentosPage() {
  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [avancando, setAvancando] = useState<string | null>(null);

  const [form, setForm] = useState({
    descricao: "",
    valorTotal: "",
    numParcelas: "",
    cartaoId: "",
    dataInicio: new Date().toISOString().slice(0, 10),
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [resP, resC] = await Promise.all([fetch("/api/parcelamentos"), fetch("/api/cartoes")]);
      const [ps, cs] = await Promise.all([resP.json(), resC.json()]);
      setParcelamentos(ps);
      setCartoes(cs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const criar = async () => {
    if (!form.descricao || !form.valorTotal || !form.numParcelas) return;
    setSalvando(true);
    try {
      await fetch("/api/parcelamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: form.descricao,
          valorTotal: Number(form.valorTotal),
          numParcelas: Number(form.numParcelas),
          cartaoId: form.cartaoId || null,
          dataInicio: form.dataInicio,
        }),
      });
      setModalAberto(false);
      setForm({ descricao: "", valorTotal: "", numParcelas: "", cartaoId: "", dataInicio: new Date().toISOString().slice(0, 10) });
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const avancarParcela = async (p: Parcelamento) => {
    if (p.parcelaAtual >= p.numParcelas) return;
    setAvancando(p.id);
    try {
      await fetch(`/api/parcelamentos/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelaAtual: p.parcelaAtual + 1 }),
      });
      carregar();
    } finally {
      setAvancando(null);
    }
  };

  const excluir = async (id: string) => {
    await fetch(`/api/parcelamentos/${id}`, { method: "DELETE" });
    carregar();
  };

  const totalMensal = parcelamentos.reduce((s, p) => s + p.valorParcela, 0);
  const totalRestante = parcelamentos.reduce((s, p) => s + p.valorParcela * (p.numParcelas - p.parcelaAtual + 1), 0);

  const valorParcela = form.valorTotal && form.numParcelas
    ? (Number(form.valorTotal) / Number(form.numParcelas))
    : null;

  return (
    <div className="p-8">
      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#52525b] mb-1">Parcelamentos ativos</p>
          <p className="text-2xl font-mono font-semibold text-[#f5f5f5]">{parcelamentos.length}</p>
        </div>
        <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#52525b] mb-1">Custo mensal</p>
          <p className="text-2xl font-mono font-semibold text-[#ef4444]">{formatarMoeda(totalMensal)}</p>
        </div>
        <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
          <p className="text-xs text-[#52525b] mb-1">Total restante</p>
          <p className="text-2xl font-mono font-semibold text-[#eab308]">{formatarMoeda(totalRestante)}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading font-semibold text-[#f5f5f5]">Parcelamentos</h2>
          <p className="text-xs text-[#52525b] mt-0.5">Controle suas compras parceladas</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Novo Parcelamento
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />)}</div>
      ) : parcelamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111113] border border-[#27272a] rounded-xl">
          <CreditCard size={40} className="text-[#27272a] mb-3" />
          <p className="text-[#a1a1aa] font-medium mb-1">Nenhum parcelamento ativo</p>
          <p className="text-[#52525b] text-sm mb-4">Adicione parcelamentos para acompanhar suas compras</p>
          <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Novo Parcelamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {parcelamentos.map((p) => {
            const pct = ((p.parcelaAtual - 1) / p.numParcelas) * 100;
            const concluido = p.parcelaAtual > p.numParcelas;
            const cor = p.cartao?.cor ?? "#3b82f6";

            return (
              <div key={p.id} className="bg-[#111113] border border-[#27272a] rounded-xl px-5 py-4 hover:border-[#3f3f46] transition-all duration-200">
                <div className="flex items-start gap-4">
                  {/* Ícone */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${cor}20` }}>
                    <CreditCard size={16} style={{ color: cor }} />
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-[#f5f5f5]">{p.descricao}</p>
                      <div className="flex items-center gap-2 ml-4">
                        {!concluido && (
                          <button
                            onClick={() => avancarParcela(p)}
                            disabled={avancando === p.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#3b82f6] border border-[#3b82f6]/30 rounded-lg hover:bg-[#3b82f6]/10 transition-colors disabled:opacity-50"
                          >
                            <ChevronRight size={12} /> Pagar parcela
                          </button>
                        )}
                        <button
                          onClick={() => excluir(p.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* Subtítulo */}
                    <div className="flex items-center gap-3 text-xs text-[#52525b] mb-3">
                      {p.cartao && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: p.cartao.cor }} />
                          {p.cartao.nome}
                        </span>
                      )}
                      <span>desde {format(new Date(p.dataInicio), "MMM yyyy", { locale: ptBR })}</span>
                      <span className="text-[#3b82f6] font-medium">{formatarMoeda(p.valorParcela)}/mês</span>
                    </div>

                    {/* Barra de progresso */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[#1a1a1f] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: concluido ? "#22c55e" : cor }}
                        />
                      </div>
                      <span className="text-xs font-mono text-[#a1a1aa] flex-shrink-0">
                        {concluido ? "Concluído" : `${p.parcelaAtual}/${p.numParcelas}`}
                      </span>
                    </div>
                  </div>

                  {/* Valor total */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-semibold text-[#f5f5f5]">{formatarMoeda(p.valorTotal)}</p>
                    <p className="text-xs text-[#52525b]">total</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">Novo Parcelamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: iPhone 15, Notebook..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Valor total (R$)</Label>
                <Input
                  type="number"
                  value={form.valorTotal}
                  onChange={(e) => setForm((f) => ({ ...f, valorTotal: e.target.value }))}
                  placeholder="0,00"
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
                />
              </div>
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Nº de parcelas</Label>
                <Input
                  type="number"
                  value={form.numParcelas}
                  onChange={(e) => setForm((f) => ({ ...f, numParcelas: e.target.value }))}
                  placeholder="12"
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
                />
              </div>
            </div>

            {valorParcela !== null && (
              <div className="bg-[#1a1a1f] border border-[#27272a] rounded-lg px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-[#52525b]">Valor da parcela</span>
                <span className="font-mono font-semibold text-[#22c55e]">{formatarMoeda(valorParcela)}/mês</span>
              </div>
            )}

            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Cartão (opcional)</Label>
              <Select value={form.cartaoId} onValueChange={(v) => setForm((f) => ({ ...f, cartaoId: v ?? "" }))}>
                <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]">
                  <SelectValue placeholder="Selecionar cartão..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                  {cartoes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-[#f5f5f5] focus:bg-[#222228]">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: c.cor }} />
                        {c.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Data de início</Label>
              <Input
                type="date"
                value={form.dataInicio}
                onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))}
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={criar}
                disabled={salvando || !form.descricao || !form.valorTotal || !form.numParcelas}
                className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {salvando ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cores não usadas, mantidas para evitar purge */}
      <div className="hidden">{CORES.join("")}</div>
    </div>
  );
}
