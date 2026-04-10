"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Wallet, PiggyBank, TrendingUp, Landmark, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarMoeda } from "@/lib/formatters";

interface Conta {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
  icone: string;
  saldo: number;
  totalTransacoes: number;
}

const TIPOS_CONTA = [
  { value: "corrente", label: "Conta Corrente", icon: Landmark },
  { value: "poupanca", label: "Poupança", icon: PiggyBank },
  { value: "carteira", label: "Carteira", icon: Wallet },
  { value: "investimento", label: "Investimento", icon: TrendingUp },
  { value: "outro", label: "Outro", icon: Package },
];

const CORES_PRESET = [
  "#3b82f6", "#22c55e", "#f97316", "#a855f7",
  "#ef4444", "#eab308", "#14b8a6", "#ec4899",
];

const FORM_VAZIO = {
  nome: "",
  tipo: "corrente",
  saldoInicial: "0",
  cor: "#3b82f6",
};

function IconeConta({ tipo, cor }: { tipo: string; cor: string }) {
  const found = TIPOS_CONTA.find((t) => t.value === tipo);
  const Icon = found?.icon ?? Wallet;
  return (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center"
      style={{ background: `${cor}20` }}
    >
      <Icon size={22} style={{ color: cor }} />
    </div>
  );
}

export default function ContasPage() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState<Conta | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contas");
      setContas(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  };

  const abrirEditar = (c: Conta) => {
    setEditando(c);
    setForm({ nome: c.nome, tipo: c.tipo, saldoInicial: "0", cor: c.cor });
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    try {
      const body = { ...form, saldoInicial: parseFloat(form.saldoInicial || "0") };
      if (editando) {
        await fetch(`/api/contas/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/contas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!confirmExcluir) return;
    await fetch(`/api/contas/${confirmExcluir.id}`, { method: "DELETE" });
    setConfirmExcluir(null);
    carregar();
  };

  const saldoTotal = contas.reduce((a, c) => a + c.saldo, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="bg-[#111113] border border-[#27272a] rounded-xl px-5 py-3">
          <p className="text-xs text-[#a1a1aa] mb-0.5">Saldo Total das Contas</p>
          <p className={`text-xl font-mono font-semibold ${saldoTotal >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {formatarMoeda(saldoTotal)}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nova Conta
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : contas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111113] border border-[#27272a] rounded-xl">
          <Wallet size={40} className="text-[#27272a] mb-3" />
          <p className="text-[#a1a1aa] font-medium mb-1">Nenhuma conta cadastrada</p>
          <p className="text-[#52525b] text-sm mb-4">
            Adicione suas contas bancárias, carteira e investimentos
          </p>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Adicionar conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {contas.map((conta) => {
            const tipoInfo = TIPOS_CONTA.find((t) => t.value === conta.tipo);
            return (
              <div
                key={conta.id}
                className="bg-[#111113] border border-[#27272a] rounded-xl p-5 hover:border-[#3f3f46] transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <IconeConta tipo={conta.tipo} cor={conta.cor} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => abrirEditar(conta)}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#222228] text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmExcluir(conta)}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#ef4444]/10 text-[#a1a1aa] hover:text-[#ef4444] transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="font-medium text-[#f5f5f5] mb-0.5">{conta.nome}</p>
                <p className="text-xs text-[#52525b] mb-3">{tipoInfo?.label ?? conta.tipo}</p>

                <p
                  className={`text-xl font-mono font-semibold ${
                    conta.saldo >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                  }`}
                >
                  {formatarMoeda(conta.saldo)}
                </p>

                <p className="text-xs text-[#52525b] mt-1">
                  {conta.totalTransacoes} transaç{conta.totalTransacoes === 1 ? "ão" : "ões"}
                </p>

                {/* Barra de cor */}
                <div
                  className="mt-4 h-0.5 rounded-full"
                  style={{ background: `linear-gradient(to right, ${conta.cor}, transparent)` }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">
              {editando ? "Editar Conta" : "Nova Conta"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Nome da conta</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Nubank, Bradesco, Carteira..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50"
              />
            </div>

            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v ?? "corrente" }))}>
                <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] focus:ring-[#f97316]/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                  {TIPOS_CONTA.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-[#f5f5f5] focus:bg-[#222228]">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editando && (
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Saldo Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.saldoInicial}
                  onChange={(e) => setForm((f) => ({ ...f, saldoInicial: e.target.value }))}
                  placeholder="0,00"
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50 font-mono"
                />
              </div>
            )}

            <div>
              <Label className="text-[#a1a1aa] text-xs mb-2 block">Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_PRESET.map((cor) => (
                  <button
                    key={cor}
                    onClick={() => setForm((f) => ({ ...f, cor }))}
                    className={`w-7 h-7 rounded-lg transition-all duration-150 ${
                      form.cor === cor
                        ? "scale-110 ring-2 ring-white/40 ring-offset-1 ring-offset-[#111113]"
                        : "hover:scale-105"
                    }`}
                    style={{ background: cor }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 bg-[#1a1a1f] rounded-xl p-3">
              <IconeConta tipo={form.tipo} cor={form.cor} />
              <div>
                <p className="text-sm font-medium text-[#f5f5f5]">{form.nome || "Nome da conta"}</p>
                <p className="text-xs text-[#52525b]">
                  {TIPOS_CONTA.find((t) => t.value === form.tipo)?.label}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !form.nome.trim()}
                className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              >
                {salvando ? "Salvando..." : editando ? "Salvar" : "Criar conta"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar exclusão */}
      <Dialog open={!!confirmExcluir} onOpenChange={() => setConfirmExcluir(null)}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">Desativar Conta</DialogTitle>
          </DialogHeader>
          <p className="text-[#a1a1aa] text-sm mt-2">
            Deseja desativar a conta{" "}
            <span className="text-[#f5f5f5] font-medium">&quot;{confirmExcluir?.nome}&quot;</span>?
            As transações vinculadas serão preservadas.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setConfirmExcluir(null)}
              className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={excluir}
              className="flex-1 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Desativar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
