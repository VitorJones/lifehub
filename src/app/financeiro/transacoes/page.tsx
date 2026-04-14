"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eraser,
  AlertTriangle,
} from "lucide-react";
import { formatarMoeda } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
  icone: string;
}

interface Conta {
  id: string;
  nome: string;
}

interface Cartao {
  id: string;
  nome: string;
  cor: string;
}

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  data: string;
  recorrente: boolean;
  observacao?: string;
  categoria: Categoria;
  conta?: Conta;
  categoriaId: string;
  contaId?: string;
}

const FORM_VAZIO = {
  descricao: "",
  valor: "",
  tipo: "despesa" as "receita" | "despesa",
  data: format(new Date(), "yyyy-MM-dd"),
  categoriaId: "",
  contaId: "",
  cartaoId: "",
  formaPagamento: "dinheiro" as "dinheiro" | "debito" | "credito",
  parcelado: false,
  numParcelas: "",
  recorrente: false,
  observacao: "",
};

export default function TransacoesPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Transacao | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [modalLimpeza, setModalLimpeza] = useState(false);
  const [escopoLimpeza, setEscopoLimpeza] = useState<"mes" | "tudo">("mes");
  const [limpando, setLimpando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mes: String(mes), ano: String(ano) });
      if (filtroTipo) params.set("tipo", filtroTipo);
      if (busca) params.set("busca", busca);
      const [resT, resC, resCon, resCar] = await Promise.all([
        fetch(`/api/transacoes?${params}`),
        fetch("/api/categorias"),
        fetch("/api/contas"),
        fetch("/api/cartoes"),
      ]);
      const [ts, cats, cons, cars] = await Promise.all([resT.json(), resC.json(), resCon.json(), resCar.json()]);
      setTransacoes(ts);
      setCategorias(cats);
      setContas(cons);
      setCartoes(cars);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, filtroTipo, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  const navegarMes = (dir: -1 | 1) => {
    const d = new Date(ano, mes - 1 + dir, 1);
    setMes(d.getMonth() + 1);
    setAno(d.getFullYear());
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  };

  const abrirEditar = (t: Transacao) => {
    setEditando(t);
    setForm({
      descricao: t.descricao,
      valor: String(t.valor),
      tipo: t.tipo,
      data: format(new Date(t.data + (t.data.includes("T") ? "" : "T12:00:00")), "yyyy-MM-dd"),
      categoriaId: t.categoriaId,
      contaId: t.contaId ?? "",
      cartaoId: (t as { cartaoId?: string }).cartaoId ?? "",
      formaPagamento: ((t as { formaPagamento?: string }).formaPagamento ?? "dinheiro") as "dinheiro" | "debito" | "credito",
      parcelado: false,
      numParcelas: "",
      recorrente: t.recorrente,
      observacao: t.observacao ?? "",
    });
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.descricao || !form.valor || !form.categoriaId) return;
    setSalvando(true);
    try {
      const body = {
        ...form,
        valor: parseFloat(form.valor.replace(",", ".")),
        contaId: form.contaId && form.contaId !== "__none__" ? form.contaId : null,
        cartaoId: form.formaPagamento === "credito" && form.cartaoId ? form.cartaoId : null,
      };
      if (editando) {
        await fetch(`/api/transacoes/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/transacoes", {
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

  const excluir = async (id: string) => {
    setDeletando(id);
    await fetch(`/api/transacoes/${id}`, { method: "DELETE" });
    setDeletando(null);
    carregar();
  };

  const limpar = async () => {
    setLimpando(true);
    try {
      const params =
        escopoLimpeza === "mes"
          ? new URLSearchParams({ mes: String(mes), ano: String(ano) })
          : new URLSearchParams();
      await fetch(`/api/transacoes?${params}`, { method: "DELETE" });
      setModalLimpeza(false);
      carregar();
    } finally {
      setLimpando(false);
    }
  };

  const totalReceitas = transacoes.filter((t) => t.tipo === "receita").reduce((a, t) => a + t.valor, 0);
  const totalDespesas = transacoes.filter((t) => t.tipo === "despesa").reduce((a, t) => a + t.valor, 0);
  const categoriasFiltradas = form.tipo ? categorias.filter((c) => c.tipo === form.tipo) : categorias;
  const mesLabel = format(new Date(ano, mes - 1, 1), "MMMM yyyy", { locale: ptBR });

  // Agrupa transações por data
  const porData: Record<string, Transacao[]> = {};
  transacoes.forEach((t) => {
    const key = format(new Date(t.data), "yyyy-MM-dd");
    if (!porData[key]) porData[key] = [];
    porData[key].push(t);
  });
  const datasOrdenadas = Object.keys(porData).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-4 md:p-8">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
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

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Busca */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
            <Input
              placeholder="Buscar transação..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 w-44 sm:w-52 bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50"
            />
          </div>

          {/* Filtro tipo */}
          <div className="flex rounded-lg border border-[#27272a] overflow-hidden">
            {["", "receita", "despesa"].map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filtroTipo === t
                    ? "bg-[#f97316] text-white"
                    : "text-[#a1a1aa] hover:bg-[#1a1a1f]"
                }`}
              >
                {t === "" ? "Todos" : t === "receita" ? "Receitas" : "Despesas"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setModalLimpeza(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[#27272a] hover:border-[#ef4444]/50 hover:bg-[#ef4444]/10 hover:text-[#ef4444] text-[#a1a1aa] rounded-lg text-sm font-medium transition-all duration-200"
          >
            <Eraser size={15} />
            Limpeza Geral
          </button>

          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Mini totais */}
      <div className="flex flex-wrap gap-2 md:gap-4 mb-6">
        <div className="flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-4 py-2">
          <TrendingUp size={14} className="text-[#22c55e]" />
          <span className="text-xs text-[#a1a1aa]">Receitas:</span>
          <span className="text-sm font-mono font-semibold text-[#22c55e]">
            {formatarMoeda(totalReceitas)}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-2">
          <TrendingDown size={14} className="text-[#ef4444]" />
          <span className="text-xs text-[#a1a1aa]">Despesas:</span>
          <span className="text-sm font-mono font-semibold text-[#ef4444]">
            {formatarMoeda(totalDespesas)}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-[#f97316]/10 border border-[#f97316]/20 rounded-lg px-4 py-2">
          <span className="text-xs text-[#a1a1aa]">Saldo:</span>
          <span className={`text-sm font-mono font-semibold ${totalReceitas - totalDespesas >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {formatarMoeda(totalReceitas - totalDespesas)}
          </span>
        </div>
      </div>

      {/* Lista agrupada por data */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : transacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1a1a1f] flex items-center justify-center mb-4">
            <TrendingDown size={24} className="text-[#52525b]" />
          </div>
          <p className="text-[#a1a1aa] font-medium mb-1">Nenhuma transação encontrada</p>
          <p className="text-[#52525b] text-sm">
            Clique em &quot;Nova Transação&quot; para começar
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {datasOrdenadas.map((dataKey) => {
            const grupo = porData[dataKey];
            const dataObj = new Date(dataKey + "T12:00:00");
            return (
              <div key={dataKey}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-medium text-[#52525b] capitalize">
                    {format(dataObj, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                  <div className="flex-1 h-px bg-[#27272a]" />
                </div>
                <div className="bg-[#111113] border border-[#27272a] rounded-xl overflow-hidden">
                  {grupo.map((t, idx) => (
                    <div
                      key={t.id}
                      className={`flex items-center gap-4 px-5 py-3.5 hover:bg-[#1a1a1f] transition-colors group ${
                        idx < grupo.length - 1 ? "border-b border-[#27272a]" : ""
                      }`}
                    >
                      {/* Bolinha da categoria */}
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: t.categoria.cor }}
                      />

                      {/* Descrição + categoria */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#f5f5f5] truncate">{t.descricao}</p>
                          {t.recorrente && (
                            <RefreshCw size={11} className="text-[#52525b] flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[#52525b]">{t.categoria.nome}</span>
                          {t.conta && (
                            <>
                              <span className="text-[#3f3f46]">·</span>
                              <span className="text-xs text-[#52525b]">{t.conta.nome}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Valor */}
                      <span
                        className={`font-mono font-semibold text-sm ${
                          t.tipo === "receita" ? "text-[#22c55e]" : "text-[#f5f5f5]"
                        }`}
                      >
                        {t.tipo === "receita" ? "+" : "-"} {formatarMoeda(t.valor)}
                      </span>

                      {/* Ações (visíveis no hover) */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => abrirEditar(t)}
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#222228] text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => excluir(t.id)}
                          disabled={deletando === t.id}
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#ef4444]/10 text-[#a1a1aa] hover:text-[#ef4444] transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal CRUD */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5]">
              {editando ? "Editar Transação" : "Nova Transação"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Tipo */}
            <div className="flex rounded-xl border border-[#27272a] overflow-hidden">
              {(["despesa", "receita"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tipo: t, categoriaId: "", formaPagamento: "dinheiro", cartaoId: "", parcelado: false }))}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    form.tipo === t
                      ? t === "receita" ? "bg-[#22c55e] text-white" : "bg-[#ef4444] text-white"
                      : "text-[#a1a1aa] hover:bg-[#1a1a1f]"
                  }`}
                >
                  {t === "receita" ? "Receita" : "Despesa"}
                </button>
              ))}
            </div>

            {/* Descrição */}
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Mercado, Salário..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50"
              />
            </div>

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Valor (R$)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50 font-mono"
                />
              </div>
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Data</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] focus-visible:ring-[#f97316]/50"
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Categoria</Label>
              <Select value={form.categoriaId} onValueChange={(v) => setForm((f) => ({ ...f, categoriaId: v ?? "" }))}>
                <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] focus:ring-[#f97316]/50">
                  <SelectValue placeholder="Selecionar...">
                    {form.categoriaId ? (() => { const c = categorias.find(x => x.id === form.categoriaId); return c ? <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.cor }} />{c.nome}</span> : null; })() : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                  {categoriasFiltradas.length === 0
                    ? <SelectItem value="__none__" disabled>Nenhuma categoria disponível</SelectItem>
                    : categoriasFiltradas.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-[#f5f5f5] focus:bg-[#222228]">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.cor }} />
                            {c.nome}
                          </span>
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Forma de pagamento — só para despesas */}
            {form.tipo === "despesa" && (
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Forma de pagamento</Label>
                <div className="flex rounded-xl border border-[#27272a] overflow-hidden">
                  {(["dinheiro", "debito", "credito"] as const).map((fp) => (
                    <button
                      key={fp}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, formaPagamento: fp, cartaoId: "", parcelado: false, numParcelas: "" }))}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${
                        form.formaPagamento === fp ? "bg-[#f97316] text-white" : "text-[#a1a1aa] hover:bg-[#1a1a1f]"
                      }`}
                    >
                      {fp === "dinheiro" ? "Dinheiro" : fp === "debito" ? "Débito" : "Crédito"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conta — Dinheiro, Débito ou Receita */}
            {(form.tipo === "receita" || form.formaPagamento !== "credito") && (
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">
                  Conta{form.tipo === "despesa" ? " (opcional)" : ""}
                </Label>
                <Select value={form.contaId || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, contaId: !v || v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] focus:ring-[#f97316]/50">
                    <SelectValue placeholder="Selecionar conta...">
                      {form.contaId && form.contaId !== "__none__"
                        ? contas.find(c => c.id === form.contaId)?.nome
                        : <span className="text-[#52525b]">Nenhuma</span>
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                    <SelectItem value="__none__" className="text-[#a1a1aa] focus:bg-[#222228]">Nenhuma</SelectItem>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-[#f5f5f5] focus:bg-[#222228]">
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cartão — débito ou crédito */}
            {form.tipo === "despesa" && (form.formaPagamento === "credito" || form.formaPagamento === "debito") && (
              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Cartão</Label>
                <Select value={form.cartaoId || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, cartaoId: !v || v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] focus:ring-[#f97316]/50">
                    <SelectValue placeholder="Selecionar cartão...">
                      {form.cartaoId && form.cartaoId !== "__none__"
                        ? cartoes.find(c => c.id === form.cartaoId)?.nome
                        : <span className="text-[#52525b]">Selecionar...</span>
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                    <SelectItem value="__none__" className="text-[#a1a1aa] focus:bg-[#222228]">Nenhum</SelectItem>
                    {cartoes.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-[#f5f5f5] focus:bg-[#222228]">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.cor }} />
                          {c.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Parcelado — crédito + nova transação */}
            {form.tipo === "despesa" && form.formaPagamento === "credito" && !editando && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, parcelado: !f.parcelado, numParcelas: "" }))}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.parcelado ? "bg-[#f97316]" : "bg-[#27272a]"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.parcelado ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                  <Label className="text-[#a1a1aa] text-sm">Parcelado?</Label>
                </div>
                {form.parcelado && (
                  <div>
                    <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Número de parcelas</Label>
                    <Input
                      type="number" min="2" max="72"
                      value={form.numParcelas}
                      onChange={(e) => setForm((f) => ({ ...f, numParcelas: e.target.value }))}
                      placeholder="Ex: 12"
                      className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50 font-mono"
                    />
                    {form.numParcelas && form.valor && Number(form.numParcelas) > 1 && (
                      <p className="text-xs text-[#52525b] mt-1">
                        {form.numParcelas}x de {formatarMoeda(parseFloat(form.valor) / parseInt(form.numParcelas))}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Observação */}
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Observação (opcional)</Label>
              <Textarea
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Anotações sobre esta transação..."
                rows={2}
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50 resize-none"
              />
            </div>

            {/* Recorrente — só se não parcelado */}
            {!form.parcelado && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, recorrente: !f.recorrente }))}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.recorrente ? "bg-[#f97316]" : "bg-[#27272a]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.recorrente ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <Label className="text-[#a1a1aa] text-sm">Transação recorrente (mensal)</Label>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || !form.descricao || !form.valor || !form.categoriaId}
                className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              >
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Limpeza Geral */}
      <Dialog open={modalLimpeza} onOpenChange={setModalLimpeza}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5] flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ef4444]/10 flex items-center justify-center">
                <Eraser size={16} className="text-[#ef4444]" />
              </div>
              Limpeza Geral
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 space-y-4">
            <div className="flex items-start gap-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-4">
              <AlertTriangle size={18} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#a1a1aa] leading-relaxed">
                Esta ação é <span className="text-[#f5f5f5] font-medium">permanente</span> e
                não pode ser desfeita. Todas as transações excluídas serão perdidas.
              </p>
            </div>

            {/* Escopo */}
            <div>
              <p className="text-xs text-[#a1a1aa] mb-2">O que deseja apagar?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEscopoLimpeza("mes")}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-200 ${
                    escopoLimpeza === "mes"
                      ? "border-[#f97316] bg-[#f97316]/8 text-[#f5f5f5]"
                      : "border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
                  }`}
                >
                  <span className="text-sm font-medium capitalize">{mesLabel}</span>
                  <span className="text-xs text-[#52525b]">
                    {transacoes.length} transaç{transacoes.length === 1 ? "ão" : "ões"}
                  </span>
                </button>
                <button
                  onClick={() => setEscopoLimpeza("tudo")}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-200 ${
                    escopoLimpeza === "tudo"
                      ? "border-[#ef4444] bg-[#ef4444]/8 text-[#f5f5f5]"
                      : "border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]"
                  }`}
                >
                  <span className="text-sm font-medium">Todas as transações</span>
                  <span className="text-xs text-[#52525b]">Todo o histórico</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalLimpeza(false)}
                className="flex-1 py-2.5 border border-[#27272a] rounded-xl text-sm text-[#a1a1aa] hover:bg-[#1a1a1f] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={limpar}
                disabled={limpando}
                className="flex-1 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              >
                {limpando
                  ? "Apagando..."
                  : escopoLimpeza === "mes"
                  ? `Apagar ${mesLabel}`
                  : "Apagar tudo"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
