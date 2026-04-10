"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, CreditCard } from "lucide-react";
import { formatarMoeda } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Cartao {
  id: string;
  nome: string;
  bandeira: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  cor: string;
  gastoMes: number;
}

const BANDEIRAS = ["visa", "mastercard", "elo", "amex", "hipercard"];
const CORES = ["#a855f7", "#3b82f6", "#ef4444", "#22c55e", "#f97316", "#eab308", "#ec4899", "#0f172a"];

const FORM_VAZIO = { nome: "", bandeira: "visa", limite: "", diaFechamento: "10", diaVencimento: "15", cor: "#a855f7" };

function ChipSVG() {
  return (
    <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
      <rect width="32" height="24" rx="4" fill="#d4a841" fillOpacity="0.85" />
      <rect x="1" y="8" width="30" height="8" fill="#c49930" fillOpacity="0.6" />
      <rect x="11" y="1" width="10" height="22" fill="#c49930" fillOpacity="0.6" />
      <rect x="1" y="1" width="30" height="22" rx="3" stroke="#b8882a" strokeWidth="0.5" fill="none" />
    </svg>
  );
}

function BandeiraLogo({ bandeira }: { bandeira: string }) {
  const labels: Record<string, string> = { visa: "VISA", mastercard: "MC", elo: "ELO", amex: "AMEX", hipercard: "HIPER" };
  return <span className="text-white/90 font-bold text-xs tracking-widest">{labels[bandeira] ?? bandeira.toUpperCase()}</span>;
}

function CartaoVisual({ cartao }: { cartao: Cartao }) {
  const disponivel = cartao.limite - cartao.gastoMes;
  const pctUsado = cartao.limite > 0 ? (cartao.gastoMes / cartao.limite) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Card físico */}
      <div
        className="relative rounded-2xl p-5 aspect-[1.586/1] flex flex-col justify-between overflow-hidden select-none"
        style={{ background: `linear-gradient(135deg, ${cartao.cor} 0%, ${cartao.cor}88 100%)` }}
      >
        {/* Reflexo */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 rounded-t-2xl" />

        {/* Topo */}
        <div className="flex items-start justify-between relative z-10">
          <ChipSVG />
          <BandeiraLogo bandeira={cartao.bandeira} />
        </div>

        {/* Número mascarado */}
        <div className="relative z-10">
          <p className="font-mono text-white/70 text-sm tracking-[0.25em]">
            **** **** **** ****
          </p>
        </div>

        {/* Rodapé */}
        <div className="flex items-end justify-between relative z-10">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">Titular</p>
            <p className="text-white font-semibold text-sm tracking-wide">{cartao.nome}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">Vence dia</p>
            <p className="text-white font-semibold text-sm">{String(cartao.diaVencimento).padStart(2, "0")}</p>
          </div>
        </div>
      </div>

      {/* Info abaixo */}
      <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#a1a1aa]">Usado este mês</span>
          <span className="font-mono font-semibold text-[#ef4444]">{formatarMoeda(cartao.gastoMes)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#a1a1aa]">Disponível</span>
          <span className="font-mono font-semibold text-[#22c55e]">{formatarMoeda(Math.max(disponivel, 0))}</span>
        </div>
        {/* Barra de uso */}
        <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(pctUsado, 100)}%`,
              background: pctUsado > 80 ? "#ef4444" : pctUsado > 50 ? "#f97316" : "#22c55e",
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-[#52525b]">
          <span>Limite: {formatarMoeda(cartao.limite)}</span>
          <span>{pctUsado.toFixed(0)}% usado</span>
        </div>
        <div className="flex gap-3 text-xs text-[#52525b] pt-1 border-t border-[#27272a]">
          <span>Fecha dia {cartao.diaFechamento}</span>
          <span>·</span>
          <span>Vence dia {cartao.diaVencimento}</span>
        </div>
      </div>
    </div>
  );
}

export default function CartoesPage() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Cartao | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState<Cartao | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cartoes");
      setCartoes(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setEditando(null); setForm(FORM_VAZIO); setModalAberto(true); };
  const abrirEditar = (c: Cartao) => {
    setEditando(c);
    setForm({ nome: c.nome, bandeira: c.bandeira, limite: String(c.limite), diaFechamento: String(c.diaFechamento), diaVencimento: String(c.diaVencimento), cor: c.cor });
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.nome || !form.limite) return;
    setSalvando(true);
    try {
      const body = { ...form, limite: Number(form.limite), diaFechamento: Number(form.diaFechamento), diaVencimento: Number(form.diaVencimento) };
      if (editando) {
        await fetch(`/api/cartoes/${editando.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        await fetch("/api/cartoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!confirmExcluir) return;
    await fetch(`/api/cartoes/${confirmExcluir.id}`, { method: "DELETE" });
    setConfirmExcluir(null);
    carregar();
  };

  const totalLimite = cartoes.reduce((a, c) => a + c.limite, 0);
  const totalGasto = cartoes.reduce((a, c) => a + c.gastoMes, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        {/* Resumo geral */}
        <div className="flex gap-4">
          <div className="bg-[#111113] border border-[#27272a] rounded-xl px-5 py-3">
            <p className="text-xs text-[#a1a1aa] mb-0.5">Limite total</p>
            <p className="text-lg font-mono font-semibold text-[#f5f5f5]">{formatarMoeda(totalLimite)}</p>
          </div>
          <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl px-5 py-3">
            <p className="text-xs text-[#a1a1aa] mb-0.5">Gasto este mês</p>
            <p className="text-lg font-mono font-semibold text-[#ef4444]">{formatarMoeda(totalGasto)}</p>
          </div>
          <div className="bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-xl px-5 py-3">
            <p className="text-xs text-[#a1a1aa] mb-0.5">Disponível</p>
            <p className="text-lg font-mono font-semibold text-[#22c55e]">{formatarMoeda(Math.max(totalLimite - totalGasto, 0))}</p>
          </div>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novo Cartão
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => <div key={i} className="h-80 bg-[#111113] border border-[#27272a] rounded-2xl animate-pulse" />)}
        </div>
      ) : cartoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111113] border border-[#27272a] rounded-xl">
          <CreditCard size={40} className="text-[#27272a] mb-3" />
          <p className="text-[#a1a1aa] font-medium mb-1">Nenhum cartão cadastrado</p>
          <p className="text-[#52525b] text-sm mb-4">Adicione seus cartões de crédito para controlar os gastos</p>
          <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Adicionar cartão
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {cartoes.map((cartao) => (
            <div key={cartao.id} className="group relative">
              <CartaoVisual cartao={cartao} />
              {/* Ações flutuantes */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button onClick={() => abrirEditar(cartao)} className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setConfirmExcluir(cartao)} className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-[#ef4444] transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">{editando ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Nome do cartão</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Nubank, Itaucard..." className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Bandeira</Label>
                <Select value={form.bandeira} onValueChange={(v) => setForm((f) => ({ ...f, bandeira: v ?? "visa" }))}>
                  <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                    {BANDEIRAS.map((b) => <SelectItem key={b} value={b} className="text-[#f5f5f5] capitalize focus:bg-[#222228]">{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Limite (R$)</Label>
                <Input type="number" value={form.limite} onChange={(e) => setForm((f) => ({ ...f, limite: e.target.value }))} placeholder="5000" className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] font-mono focus-visible:ring-[#f97316]/50" />
              </div>
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Dia de fechamento</Label>
                <Input type="number" min="1" max="31" value={form.diaFechamento} onChange={(e) => setForm((f) => ({ ...f, diaFechamento: e.target.value }))} className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] font-mono focus-visible:ring-[#f97316]/50" />
              </div>
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Dia de vencimento</Label>
                <Input type="number" min="1" max="31" value={form.diaVencimento} onChange={(e) => setForm((f) => ({ ...f, diaVencimento: e.target.value }))} className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] font-mono focus-visible:ring-[#f97316]/50" />
              </div>
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-2 block">Cor do cartão</Label>
              <div className="flex gap-2 flex-wrap">
                {CORES.map((cor) => (
                  <button key={cor} onClick={() => setForm((f) => ({ ...f, cor }))} className={`w-7 h-7 rounded-lg transition-all ${form.cor === cor ? "scale-110 ring-2 ring-white/40 ring-offset-1 ring-offset-[#111113]" : "hover:scale-105"}`} style={{ background: cor }} />
                ))}
                <input type="color" value={form.cor} onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))} className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
              </div>
            </div>
            {/* Preview */}
            {form.nome && (
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${form.cor}, ${form.cor}88)` }}>
                <ChipSVG />
                <div>
                  <p className="text-white font-semibold text-sm">{form.nome}</p>
                  <p className="text-white/60 text-xs capitalize">{form.bandeira} · vence dia {form.diaVencimento}</p>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome || !form.limite} className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">{salvando ? "Salvando..." : editando ? "Salvar" : "Criar cartão"}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm excluir */}
      <Dialog open={!!confirmExcluir} onOpenChange={() => setConfirmExcluir(null)}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm">
          <DialogHeader><DialogTitle className="font-heading text-[#f5f5f5]">Remover Cartão</DialogTitle></DialogHeader>
          <p className="text-[#a1a1aa] text-sm mt-2">Deseja remover o cartão <span className="text-[#f5f5f5] font-medium">&quot;{confirmExcluir?.nome}&quot;</span>? As transações vinculadas serão mantidas.</p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setConfirmExcluir(null)} className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors">Cancelar</button>
            <button onClick={excluir} className="flex-1 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl text-sm font-medium transition-colors">Remover</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
