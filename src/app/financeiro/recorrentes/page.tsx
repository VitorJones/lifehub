"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Pencil, Trash2, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { formatarMoeda } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
}

interface Conta {
  id: string;
  nome: string;
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
  recorrente: true,
  observacao: "",
};

export default function RecorrentesPage() {
  const [recorrentes, setRecorrentes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Transacao | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      // Busca sem filtro de mês para pegar todas recorrentes
      const [resT, resC, resCon] = await Promise.all([
        fetch("/api/transacoes"),
        fetch("/api/categorias"),
        fetch("/api/contas"),
      ]);
      const [ts, cats, cons]: [Transacao[], Categoria[], Conta[]] = await Promise.all([
        resT.json(),
        resC.json(),
        resCon.json(),
      ]);
      // Dedup: mantém apenas 1 entrada por (descricao + categoriaId) dentre as recorrentes
      const recMap: Record<string, Transacao> = {};
      ts.filter((t) => t.recorrente).forEach((t) => {
        const key = `${t.descricao}__${t.categoriaId}`;
        if (!recMap[key] || new Date(t.data) > new Date(recMap[key].data)) {
          recMap[key] = t;
        }
      });
      setRecorrentes(Object.values(recMap).sort((a, b) => a.descricao.localeCompare(b.descricao)));
      setCategorias(cats);
      setContas(cons);
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

  const abrirEditar = (t: Transacao) => {
    setEditando(t);
    setForm({
      descricao: t.descricao,
      valor: String(t.valor),
      tipo: t.tipo,
      data: format(new Date(t.data), "yyyy-MM-dd"),
      categoriaId: t.categoriaId,
      contaId: t.contaId ?? "",
      recorrente: true,
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
        contaId: form.contaId || null,
        recorrente: true,
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

  const totalRecorrentes = recorrentes.reduce((a, t) => {
    return t.tipo === "receita" ? a + t.valor : a - t.valor;
  }, 0);
  const totalDespesas = recorrentes
    .filter((t) => t.tipo === "despesa")
    .reduce((a, t) => a + t.valor, 0);
  const totalReceitas = recorrentes
    .filter((t) => t.tipo === "receita")
    .reduce((a, t) => a + t.valor, 0);

  const categoriasFiltradas = form.tipo
    ? categorias.filter((c) => c.tipo === form.tipo)
    : categorias;

  const despesas = recorrentes.filter((t) => t.tipo === "despesa");
  const receitas = recorrentes.filter((t) => t.tipo === "receita");

  return (
    <div className="p-4 md:p-8">
      {/* Header com totais */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="bg-[#111113] border border-[#27272a] rounded-xl px-5 py-3">
            <p className="text-xs text-[#a1a1aa] mb-0.5">Compromisso mensal</p>
            <p className={`text-xl font-mono font-semibold ${totalRecorrentes >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {formatarMoeda(totalRecorrentes)}
            </p>
          </div>
          <div className="bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-xl px-5 py-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingUp size={12} className="text-[#22c55e]" />
              <p className="text-xs text-[#a1a1aa]">Entradas fixas</p>
            </div>
            <p className="text-lg font-mono font-semibold text-[#22c55e]">{formatarMoeda(totalReceitas)}</p>
          </div>
          <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl px-5 py-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingDown size={12} className="text-[#ef4444]" />
              <p className="text-xs text-[#a1a1aa]">Saídas fixas</p>
            </div>
            <p className="text-lg font-mono font-semibold text-[#ef4444]">{formatarMoeda(totalDespesas)}</p>
          </div>
        </div>

        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nova Recorrente
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : recorrentes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-[#111113] border border-[#27272a] rounded-xl">
          <RefreshCw size={36} className="text-[#27272a] mb-3" />
          <p className="text-[#a1a1aa] font-medium mb-1">Nenhuma transação recorrente</p>
          <p className="text-[#52525b] text-sm mb-4 max-w-xs">
            Marque transações como recorrentes para acompanhar seus compromissos mensais fixos
          </p>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea6c0a] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Adicionar recorrente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Despesas fixas */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider">Saídas Fixas</h2>
              <span className="text-xs text-[#52525b] bg-[#1a1a1f] px-2 py-0.5 rounded-full">{despesas.length}</span>
              <div className="flex-1 h-px bg-[#27272a]" />
            </div>

            <div className="space-y-2">
              {despesas.length === 0 ? (
                <p className="text-[#52525b] text-sm text-center py-6">Nenhuma</p>
              ) : (
                despesas.map((t) => (
                  <RecorrenteCard
                    key={t.id}
                    t={t}
                    onEditar={() => abrirEditar(t)}
                    onExcluir={() => excluir(t.id)}
                    excluindo={deletando === t.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Receitas fixas */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider">Entradas Fixas</h2>
              <span className="text-xs text-[#52525b] bg-[#1a1a1f] px-2 py-0.5 rounded-full">{receitas.length}</span>
              <div className="flex-1 h-px bg-[#27272a]" />
            </div>

            <div className="space-y-2">
              {receitas.length === 0 ? (
                <p className="text-[#52525b] text-sm text-center py-6">Nenhuma</p>
              ) : (
                receitas.map((t) => (
                  <RecorrenteCard
                    key={t.id}
                    t={t}
                    onEditar={() => abrirEditar(t)}
                    onExcluir={() => excluir(t.id)}
                    excluindo={deletando === t.id}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#f5f5f5] flex items-center gap-2">
              <RefreshCw size={16} className="text-[#f97316]" />
              {editando ? "Editar Recorrente" : "Nova Transação Recorrente"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="flex rounded-xl border border-[#27272a] overflow-hidden">
              {(["despesa", "receita"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, tipo: t, categoriaId: "" }))}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    form.tipo === t
                      ? t === "receita"
                        ? "bg-[#22c55e] text-white"
                        : "bg-[#ef4444] text-white"
                      : "text-[#a1a1aa] hover:bg-[#1a1a1f]"
                  }`}
                >
                  {t === "receita" ? "Entrada Fixa" : "Saída Fixa"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Aluguel, Netflix, Salário..."
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50"
                />
              </div>

              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50 font-mono"
                />
              </div>

              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Dia do vencimento</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] focus-visible:ring-[#f97316]/50"
                />
              </div>

              <div>
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Categoria</Label>
                <Select
                  value={form.categoriaId}
                  onValueChange={(v) => setForm((f) => ({ ...f, categoriaId: v ?? "" }))}
                >
                  <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] focus:ring-[#f97316]/50">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1f] border-[#27272a]">
                    {categoriasFiltradas.map((c) => (
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
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Conta (opcional)</Label>
                <Select
                  value={form.contaId}
                  onValueChange={(v) => setForm((f) => ({ ...f, contaId: v ?? "" }))}
                >
                  <SelectTrigger className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] focus:ring-[#f97316]/50">
                    <SelectValue placeholder="Nenhuma" />
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

              <div className="col-span-2">
                <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Observação (opcional)</Label>
                <Textarea
                  value={form.observacao}
                  onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  placeholder="Anotações..."
                  rows={2}
                  className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] focus-visible:ring-[#f97316]/50 resize-none"
                />
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
                disabled={salvando || !form.descricao || !form.valor || !form.categoriaId}
                className="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              >
                {salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecorrenteCard({
  t,
  onEditar,
  onExcluir,
  excluindo,
}: {
  t: Transacao;
  onEditar: () => void;
  onExcluir: () => void;
  excluindo: boolean;
}) {
  const dia = new Date(t.data).getDate();

  return (
    <div className="bg-[#111113] border border-[#27272a] rounded-xl px-4 py-3.5 hover:border-[#3f3f46] transition-all duration-200 group flex items-center gap-3">
      {/* Indicador de cor */}
      <div
        className="w-1 h-10 rounded-full shrink-0"
        style={{ background: t.categoria.cor }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#f5f5f5] truncate">{t.descricao}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[#52525b]">{t.categoria.nome}</span>
          <span className="text-[#3f3f46]">·</span>
          <span className="text-xs text-[#52525b]">todo dia {dia}</span>
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
        className={`font-mono font-semibold text-sm shrink-0 ${
          t.tipo === "receita" ? "text-[#22c55e]" : "text-[#f5f5f5]"
        }`}
      >
        {t.tipo === "receita" ? "+" : "-"} {formatarMoeda(t.valor)}
      </span>

      {/* Ações */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEditar}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#222228] text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onExcluir}
          disabled={excluindo}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#ef4444]/10 text-[#a1a1aa] hover:text-[#ef4444] transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
