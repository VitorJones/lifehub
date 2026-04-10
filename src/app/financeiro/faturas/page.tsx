"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Plus, CheckCircle2, Lock, Circle } from "lucide-react";
import { formatarMoeda } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Cartao {
  id: string;
  nome: string;
  cor: string;
  bandeira: string;
  diaVencimento: number;
}

interface Fatura {
  id: string;
  cartaoId: string;
  cartao: Cartao;
  mesReferencia: string;
  status: "aberta" | "fechada" | "paga";
  totalFatura: number;
  totalCalculado: number;
  createdAt: string;
}

const STATUS_CONFIG = {
  aberta:  { label: "Aberta",  cor: "#eab308", icon: Circle },
  fechada: { label: "Fechada", cor: "#3b82f6", icon: Lock },
  paga:    { label: "Paga",    cor: "#22c55e", icon: CheckCircle2 },
};

const PROXIMOS_MESES = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - 2 + i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
});

export default function FaturasPage() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [formCartaoId, setFormCartaoId] = useState("");
  const [formMes, setFormMes] = useState(PROXIMOS_MESES[2]);
  const [salvando, setSalvando] = useState(false);
  const [atualizando, setAtualizando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [resF, resC] = await Promise.all([fetch("/api/faturas"), fetch("/api/cartoes")]);
      const [fs, cs] = await Promise.all([resF.json(), resC.json()]);
      setFaturas(fs);
      setCartoes(cs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const criarFatura = async () => {
    if (!formCartaoId || !formMes) return;
    setSalvando(true);
    try {
      await fetch("/api/faturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartaoId: formCartaoId, mesReferencia: formMes }),
      });
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const atualizarStatus = async (fatura: Fatura, novoStatus: "aberta" | "fechada" | "paga") => {
    setAtualizando(fatura.id);
    try {
      await fetch(`/api/faturas/${fatura.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      carregar();
    } finally {
      setAtualizando(null);
    }
  };

  const excluir = async (id: string) => {
    await fetch(`/api/faturas/${id}`, { method: "DELETE" });
    carregar();
  };

  // Agrupa faturas por cartão
  const porCartao: Record<string, Fatura[]> = {};
  faturas.forEach((f) => {
    if (!porCartao[f.cartaoId]) porCartao[f.cartaoId] = [];
    porCartao[f.cartaoId].push(f);
  });

  const mesLabel = (ref: string) => {
    const [ano, mes] = ref.split("-");
    return format(new Date(Number(ano), Number(mes) - 1, 1), "MMMM yyyy", { locale: ptBR });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3 text-sm">
          {(["aberta", "fechada", "paga"] as const).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            const count = faturas.filter((f) => f.status === s).length;
            return (
              <div key={s} className="flex items-center gap-2 bg-[#111113] border border-[#27272a] rounded-lg px-4 py-2">
                <Icon size={14} style={{ color: cfg.cor }} />
                <span className="text-[#a1a1aa]">{cfg.label}:</span>
                <span className="font-medium text-[#f5f5f5]">{count}</span>
              </div>
            );
          })}
        </div>
        <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nova Fatura
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-40 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />)}</div>
      ) : faturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111113] border border-[#27272a] rounded-xl">
          <FileText size={40} className="text-[#27272a] mb-3" />
          <p className="text-[#a1a1aa] font-medium mb-1">Nenhuma fatura cadastrada</p>
          <p className="text-[#52525b] text-sm mb-4">Crie faturas para acompanhar os gastos por cartão e mês</p>
          <button onClick={() => setModalAberto(true)} className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Criar fatura
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(porCartao).map(([cartaoId, fs]) => {
            const cartao = cartoes.find((c) => c.id === cartaoId) ?? fs[0]?.cartao;
            if (!cartao) return null;

            return (
              <div key={cartaoId}>
                {/* Header do cartão */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: cartao.cor }} />
                  <h2 className="font-heading font-semibold text-[#f5f5f5]">{cartao.nome}</h2>
                  <span className="text-xs text-[#52525b] capitalize">{cartao.bandeira}</span>
                  <div className="flex-1 h-px bg-[#27272a]" />
                </div>

                <div className="space-y-2">
                  {fs.map((fatura) => {
                    const cfg = STATUS_CONFIG[fatura.status];
                    const StatusIcon = cfg.icon;
                    const total = fatura.totalCalculado || fatura.totalFatura;
                    const isAtualizando = atualizando === fatura.id;

                    return (
                      <div key={fatura.id} className="bg-[#111113] border border-[#27272a] rounded-xl px-5 py-4 hover:border-[#3f3f46] transition-all duration-200 flex items-center gap-4">
                        {/* Status icon */}
                        <StatusIcon size={18} style={{ color: cfg.cor }} className="flex-shrink-0" />

                        {/* Mês */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#f5f5f5] capitalize">{mesLabel(fatura.mesReferencia)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${cfg.cor}20`, color: cfg.cor }}>
                              {cfg.label}
                            </span>
                            <span className="text-xs text-[#52525b]">vence dia {cartao.diaVencimento}</span>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="text-right">
                          <p className="font-mono font-semibold text-[#ef4444]">{formatarMoeda(total)}</p>
                          {fatura.totalCalculado > 0 && (
                            <p className="text-xs text-[#52525b]">de transações</p>
                          )}
                        </div>

                        {/* Ações de status */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {fatura.status === "aberta" && (
                            <button
                              onClick={() => atualizarStatus(fatura, "fechada")}
                              disabled={isAtualizando}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3b82f6] border border-[#3b82f6]/30 rounded-lg hover:bg-[#3b82f6]/10 transition-colors disabled:opacity-50"
                            >
                              <Lock size={12} /> Fechar
                            </button>
                          )}
                          {fatura.status === "fechada" && (
                            <button
                              onClick={() => atualizarStatus(fatura, "paga")}
                              disabled={isAtualizando}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#22c55e] border border-[#22c55e]/30 rounded-lg hover:bg-[#22c55e]/10 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} /> Pagar
                            </button>
                          )}
                          {fatura.status === "paga" && (
                            <span className="text-xs text-[#22c55e] px-3">✓ Paga</span>
                          )}
                          <button
                            onClick={() => excluir(fatura.id)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-[#52525b] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nova fatura */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm">
          <DialogHeader><DialogTitle className="font-heading text-[#f5f5f5]">Nova Fatura</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Cartão</Label>
              <Select value={formCartaoId} onValueChange={(v) => setFormCartaoId(v ?? "")}>
                <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]"><SelectValue placeholder="Selecionar cartão..." /></SelectTrigger>
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
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Mês de referência</Label>
              <Select value={formMes} onValueChange={(v) => setFormMes(v ?? formMes)}>
                <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                  {PROXIMOS_MESES.map((m) => (
                    <SelectItem key={m} value={m} className="text-[#f5f5f5] capitalize focus:bg-[#222228]">{mesLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">Cancelar</button>
              <button onClick={criarFatura} disabled={salvando || !formCartaoId} className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">{salvando ? "Criando..." : "Criar"}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
