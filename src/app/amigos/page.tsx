"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Star, Phone, Mail, AtSign, Cake, MessageSquare,
  Pencil, Trash2, X, Search, Users, Heart,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Amigo {
  id:                string;
  nome:              string;
  apelido:           string | null;
  telefone:          string | null;
  email:             string | null;
  instagram:         string | null;
  aniversario:       string | null; // "MM-DD" ou "YYYY-MM-DD"
  grupos:            string | null; // JSON string[]
  notas:             string | null;
  cor:               string;
  favorito:          boolean;
  ultimoContato:     string | null;
  frequenciaContato: string | null;
  createdAt:         string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const CORES = [
  "#a855f7", "#3b82f6", "#22c55e", "#f97316",
  "#ef4444", "#eab308", "#ec4899", "#06b6d4",
];

const FREQUENCIAS = [
  { value: "",            label: "Sem meta de contato" },
  { value: "semanal",     label: "Toda semana"         },
  { value: "quinzenal",   label: "A cada 2 semanas"    },
  { value: "mensal",      label: "Todo mês"            },
  { value: "trimestral",  label: "A cada 3 meses"      },
];

const FREQ_DIAS: Record<string, number> = {
  semanal: 7, quinzenal: 14, mensal: 30, trimestral: 90,
};

const FORM_VAZIO = {
  nome:              "",
  apelido:           "",
  telefone:          "",
  email:             "",
  instagram:         "",
  aniversario:       "",
  notas:             "",
  cor:               "#a855f7",
  favorito:          false,
  frequenciaContato: "",
  grupoInput:        "",
  grupos:            [] as string[],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseGrupos(g: string | null): string[] {
  if (!g) return [];
  try { return JSON.parse(g) as string[]; } catch { return []; }
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** Saúde do relacionamento baseada em último contato vs. frequência desejada */
function saudeContato(amigo: Amigo): "verde" | "amarelo" | "vermelho" | null {
  if (!amigo.frequenciaContato) return null;
  const limite = FREQ_DIAS[amigo.frequenciaContato];
  if (!limite) return null;

  const diasDesde = amigo.ultimoContato
    ? differenceInDays(new Date(), new Date(amigo.ultimoContato))
    : 9999;

  if (diasDesde <= limite)       return "verde";
  if (diasDesde <= limite * 2)   return "amarelo";
  return "vermelho";
}

const COR_SAUDE = {
  verde:    { bg: "#22c55e20", text: "#22c55e", label: "Em dia"     },
  amarelo:  { bg: "#eab30820", text: "#eab308", label: "Há um tempo" },
  vermelho: { bg: "#ef444420", text: "#ef4444", label: "Sumido(a)"   },
};

/** Aniversário deste ano — retorna "MM-DD" para comparar */
function anivDest(aniversario: string): string {
  // suporta "MM-DD" ou "YYYY-MM-DD"
  return aniversario.length === 5 ? aniversario : aniversario.slice(5);
}

function proximoAniv(aniversario: string | null): { dias: number; label: string } | null {
  if (!aniversario) return null;
  const mmdd  = anivDest(aniversario);
  const hoje  = new Date();
  const anoAtual = hoje.getFullYear();

  let alvo = new Date(`${anoAtual}-${mmdd}T12:00:00`);
  if (alvo < hoje) alvo = new Date(`${anoAtual + 1}-${mmdd}T12:00:00`);

  const dias = differenceInDays(alvo, hoje);
  if (dias === 0) return { dias: 0, label: "Hoje!" };
  if (dias === 1) return { dias: 1, label: "Amanhã" };
  if (dias <= 7)  return { dias, label: `Em ${dias} dias` };
  return { dias, label: format(alvo, "d MMM", { locale: ptBR }) };
}

function idadeAniv(aniversario: string): string {
  if (aniversario.length === 5) return ""; // sem ano
  const nascimento = parseISO(aniversario);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mmdd = aniversario.slice(5);
  const anivEsteAno = new Date(`${hoje.getFullYear()}-${mmdd}T12:00:00`);
  if (anivEsteAno > hoje) idade--; // aniversário ainda não passou este ano
  return `${idade + 1} anos`; // idade que vai fazer
}

function labelUltimoContato(iso: string | null): string {
  if (!iso) return "Nunca";
  const dias = differenceInDays(new Date(), new Date(iso));
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7)  return `${dias} dias atrás`;
  if (dias < 30) return `${Math.floor(dias / 7)} sem. atrás`;
  if (dias < 365) return `${Math.floor(dias / 30)} meses atrás`;
  return `${Math.floor(dias / 365)} ano(s) atrás`;
}

function amigoParaForm(a: Amigo): typeof FORM_VAZIO {
  return {
    nome:              a.nome,
    apelido:           a.apelido           ?? "",
    telefone:          a.telefone          ?? "",
    email:             a.email             ?? "",
    instagram:         a.instagram         ?? "",
    aniversario:       a.aniversario       ?? "",
    notas:             a.notas             ?? "",
    cor:               a.cor,
    favorito:          a.favorito,
    frequenciaContato: a.frequenciaContato ?? "",
    grupoInput:        "",
    grupos:            parseGrupos(a.grupos),
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ModalAmigo({
  open, onClose, onSalvar, onExcluir, editando,
}: {
  open:      boolean;
  onClose:   () => void;
  onSalvar:  (f: typeof FORM_VAZIO) => Promise<void>;
  onExcluir?: () => Promise<void>;
  editando:  Amigo | null;
}) {
  const [form, setForm]         = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editando ? amigoParaForm(editando) : FORM_VAZIO);
  }, [open, editando]);

  const set = <K extends keyof typeof FORM_VAZIO>(k: K, v: (typeof FORM_VAZIO)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const adicionarGrupo = () => {
    const g = form.grupoInput.trim();
    if (!g || form.grupos.includes(g)) return;
    setForm((f) => ({ ...f, grupos: [...f.grupos, g], grupoInput: "" }));
  };

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    try { await onSalvar(form); onClose(); }
    finally { setSalvando(false); }
  };

  const excluir = async () => {
    if (!onExcluir) return;
    setSalvando(true);
    try { await onExcluir(); onClose(); }
    finally { setSalvando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111113] border-[#27272a] text-[#f5f5f5] max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-heading text-[#f5f5f5]">
            {editando ? "Editar Amigo" : "Novo Amigo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">

          {/* Nome + Apelido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Nome completo..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Apelido</Label>
              <Input
                value={form.apelido}
                onChange={(e) => set("apelido", e.target.value)}
                placeholder="Como você chama..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              />
            </div>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                placeholder="(11) 99999-9999"
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">E-mail</Label>
              <Input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              />
            </div>
          </div>

          {/* Instagram + Aniversário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Instagram</Label>
              <Input
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)}
                placeholder="@usuario"
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b]"
              />
            </div>
            <div>
              <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Aniversário</Label>
              <Input
                type="date"
                value={form.aniversario}
                onChange={(e) => set("aniversario", e.target.value)}
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Grupos */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Grupos</Label>
            <div className="flex gap-2">
              <Input
                value={form.grupoInput}
                onChange={(e) => set("grupoInput", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarGrupo(); }}}
                placeholder="família, trabalho, faculdade..."
                className="bg-[#1a1a1f] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] flex-1"
              />
              <button
                type="button"
                onClick={adicionarGrupo}
                className="px-3 bg-[#1a1a1f] border border-[#27272a] rounded-md text-[#a1a1aa] hover:text-[#f5f5f5] text-sm transition-colors"
              >
                +
              </button>
            </div>
            {form.grupos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.grupos.map((g) => (
                  <span
                    key={g}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[#1a1a1f] border border-[#27272a] rounded-full text-[11px] text-[#a1a1aa]"
                  >
                    {g}
                    <button
                      onClick={() => setForm((f) => ({ ...f, grupos: f.grupos.filter((x) => x !== g) }))}
                      className="hover:text-[#ef4444] transition-colors"
                    >
                      <X size={9} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Frequência de contato */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Meta de contato</Label>
            <select
              value={form.frequenciaContato}
              onChange={(e) => set("frequenciaContato", e.target.value)}
              className="w-full bg-[#1a1a1f] border border-[#27272a] text-[#f5f5f5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#a855f7]"
            >
              {FREQUENCIAS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-[#a1a1aa] text-xs mb-1.5 block">Notas</Label>
            <textarea
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
              placeholder="Gosta de café, mora em SP, conheceu no cursinho..."
              rows={3}
              className="w-full bg-[#1a1a1f] border border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#a855f7]"
            />
          </div>

          {/* Cor do avatar + Favorito */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-[#a1a1aa] text-xs">Cor</Label>
              <button
                type="button"
                onClick={() => set("favorito", !form.favorito)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  form.favorito
                    ? "bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30"
                    : "bg-[#1a1a1f] text-[#52525b] border border-[#27272a] hover:text-[#a1a1aa]"
                }`}
              >
                <Star size={11} fill={form.favorito ? "currentColor" : "none"} />
                Favorito
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {CORES.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => set("cor", cor)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.cor === cor ? "border-white scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: cor }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#27272a]">
          <div>
            {editando && onExcluir && (
              <button
                onClick={excluir}
                disabled={salvando}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
              >
                <Trash2 size={14} /> Excluir
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando || !form.nome.trim()}
              className="px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de Amigo ────────────────────────────────────────────────────────────

function AmigoCard({
  amigo,
  onEditar,
  onRegistrarContato,
}: {
  amigo:              Amigo;
  onEditar:           () => void;
  onRegistrarContato: () => void;
}) {
  const grupos  = parseGrupos(amigo.grupos);
  const saude   = saudeContato(amigo);
  const aniv    = proximoAniv(amigo.aniversario);
  const isAnivHoje = aniv?.dias === 0;

  return (
    <div className="bg-[#111113] border border-[#27272a] rounded-xl p-5 flex flex-col gap-4 hover:border-[#3f3f46] transition-all duration-200 group">

      {/* Topo: avatar + nome + ações */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-heading font-semibold text-base flex-shrink-0 relative"
          style={{ background: amigo.cor }}
        >
          {iniciais(amigo.nome)}
          {amigo.favorito && (
            <Star size={10} fill="#eab308" className="absolute -top-0.5 -right-0.5 text-[#eab308]" />
          )}
        </div>

        {/* Nome */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-[#f5f5f5] truncate">
              {amigo.apelido || amigo.nome}
            </h3>
            {isAnivHoje && <span className="text-sm">🎂</span>}
          </div>
          {amigo.apelido && (
            <p className="text-xs text-[#52525b] truncate">{amigo.nome}</p>
          )}
          {grupos.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {grupos.map((g) => (
                <span
                  key={g}
                  className="px-1.5 py-px bg-[#1a1a1f] border border-[#27272a] rounded text-[10px] text-[#a1a1aa]"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Botão editar */}
        <button
          onClick={(e) => { e.stopPropagation(); onEditar(); }}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center text-[#52525b] hover:text-[#a1a1aa] transition-all rounded-lg hover:bg-[#1a1a1f]"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Saúde do contato */}
      {saude && (
        <div
          className="flex items-center justify-between px-3 py-2 rounded-lg"
          style={{ background: COR_SAUDE[saude].bg }}
        >
          <span className="text-xs font-medium" style={{ color: COR_SAUDE[saude].text }}>
            {COR_SAUDE[saude].label}
          </span>
          <span className="text-[11px] text-[#52525b]">
            {labelUltimoContato(amigo.ultimoContato)}
          </span>
        </div>
      )}

      {/* Aniversário */}
      {aniv && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          isAnivHoje ? "bg-[#ec489920] border border-[#ec4899]/30" : "bg-[#1a1a1f]"
        }`}>
          <Cake size={13} className={isAnivHoje ? "text-[#ec4899]" : "text-[#52525b]"} />
          <span className={`text-xs flex-1 ${isAnivHoje ? "text-[#ec4899] font-medium" : "text-[#a1a1aa]"}`}>
            {isAnivHoje
              ? `Aniversário hoje! ${amigo.aniversario && amigo.aniversario.length > 5 ? idadeAniv(amigo.aniversario) : ""}`
              : `Aniversário — ${aniv.label}`}
          </span>
        </div>
      )}

      {/* Links de contato */}
      <div className="flex items-center gap-1.5">
        {amigo.telefone && (
          <a
            href={`https://wa.me/${amigo.telefone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1a1a1f] border border-[#27272a] rounded-lg text-[11px] text-[#a1a1aa] hover:text-[#22c55e] hover:border-[#22c55e]/30 transition-colors"
          >
            <Phone size={11} /> WhatsApp
          </a>
        )}
        {amigo.instagram && (
          <a
            href={`https://instagram.com/${amigo.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1a1a1f] border border-[#27272a] rounded-lg text-[11px] text-[#a1a1aa] hover:text-[#ec4899] hover:border-[#ec4899]/30 transition-colors"
          >
            <AtSign size={11} /> Instagram
          </a>
        )}
        {amigo.email && (
          <a
            href={`mailto:${amigo.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1a1a1f] border border-[#27272a] rounded-lg text-[11px] text-[#a1a1aa] hover:text-[#3b82f6] hover:border-[#3b82f6]/30 transition-colors"
          >
            <Mail size={11} /> Email
          </a>
        )}

        {/* Registrar contato */}
        <button
          onClick={(e) => { e.stopPropagation(); onRegistrarContato(); }}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 bg-[#a855f7]/10 border border-[#a855f7]/20 rounded-lg text-[11px] text-[#a855f7] hover:bg-[#a855f7]/20 transition-colors"
          title="Registrar contato agora"
        >
          <MessageSquare size={11} /> Falar
        </button>
      </div>

      {/* Notas */}
      {amigo.notas && (
        <p className="text-[11px] text-[#52525b] leading-relaxed line-clamp-2 border-t border-[#1a1a1f] pt-3">
          {amigo.notas}
        </p>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AmigosPage() {
  const [amigos, setAmigos]         = useState<Amigo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando]     = useState<Amigo | null>(null);
  const [busca, setBusca]           = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [filtroSaude, setFiltroSaude] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/amigos");
      setAmigos(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const todosGrupos = useMemo(() => {
    const s = new Set<string>();
    amigos.forEach((a) => parseGrupos(a.grupos).forEach((g) => s.add(g)));
    return Array.from(s).sort();
  }, [amigos]);

  const amigosFiltrados = useMemo(() => {
    return amigos.filter((a) => {
      if (busca && !a.nome.toLowerCase().includes(busca.toLowerCase()) &&
          !(a.apelido?.toLowerCase().includes(busca.toLowerCase()))) return false;
      if (filtroGrupo && !parseGrupos(a.grupos).includes(filtroGrupo)) return false;
      if (filtroSaude) {
        const s = saudeContato(a);
        if (filtroSaude === "sem_meta" && s !== null) return false;
        if (filtroSaude !== "sem_meta" && s !== filtroSaude) return false;
      }
      return true;
    });
  }, [amigos, busca, filtroGrupo, filtroSaude]);

  // Aniversariantes do mês
  const anivMes = useMemo(() => {
    const hoje = new Date();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");
    return amigos
      .filter((a) => a.aniversario && anivDest(a.aniversario).startsWith(mesAtual))
      .sort((a, b) => {
        const da = anivDest(a.aniversario!).slice(3);
        const db = anivDest(b.aniversario!).slice(3);
        return da.localeCompare(db);
      });
  }, [amigos]);

  // Precisam de atenção (saúde vermelha)
  const precisamAtencao = useMemo(
    () => amigos.filter((a) => saudeContato(a) === "vermelho"),
    [amigos]
  );

  const salvarAmigo = async (form: typeof FORM_VAZIO) => {
    const body = {
      nome:              form.nome.trim(),
      apelido:           form.apelido    || null,
      telefone:          form.telefone   || null,
      email:             form.email      || null,
      instagram:         form.instagram  || null,
      aniversario:       form.aniversario || null,
      grupos:            form.grupos.length > 0 ? form.grupos : null,
      notas:             form.notas      || null,
      cor:               form.cor,
      favorito:          form.favorito,
      frequenciaContato: form.frequenciaContato || null,
    };
    const url    = editando ? `/api/amigos/${editando.id}` : "/api/amigos";
    const method = editando ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    carregar();
  };

  const excluirAmigo = async () => {
    if (!editando) return;
    await fetch(`/api/amigos/${editando.id}`, { method: "DELETE" });
    carregar();
  };

  const registrarContato = async (id: string) => {
    await fetch(`/api/amigos/${id}`, { method: "PATCH" });
    carregar();
  };

  const abrirNovo = () => { setEditando(null); setModalAberto(true); };
  const abrirEditar = (a: Amigo) => { setEditando(a); setModalAberto(true); };

  const temFiltro = busca || filtroGrupo || filtroSaude;

  return (
    <div className="p-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-[#f5f5f5]">Amigos</h1>
          <p className="text-sm text-[#a1a1aa] mt-0.5">
            {amigos.length} pessoas
            {precisamAtencao.length > 0 && (
              <span className="text-[#ef4444] ml-2">
                · {precisamAtencao.length} precisando de atenção
              </span>
            )}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Novo Amigo
        </button>
      </div>

      {/* ── Resumo rápido ──────────────────────────────────────────────── */}
      {amigos.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
            <p className="text-xs text-[#52525b] mb-1">Total de amigos</p>
            <p className="text-2xl font-heading font-semibold text-[#a855f7]">{amigos.length}</p>
          </div>
          <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Cake size={12} className="text-[#ec4899]" />
              <p className="text-xs text-[#52525b]">Aniversários este mês</p>
            </div>
            <p className="text-2xl font-heading font-semibold text-[#ec4899]">{anivMes.length}</p>
            {anivMes.length > 0 && (
              <p className="text-[11px] text-[#52525b] mt-1 truncate">
                {anivMes.slice(0, 2).map((a) => a.apelido || a.nome.split(" ")[0]).join(", ")}
                {anivMes.length > 2 && ` +${anivMes.length - 2}`}
              </p>
            )}
          </div>
          <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart size={12} className="text-[#ef4444]" />
              <p className="text-xs text-[#52525b]">Precisam de atenção</p>
            </div>
            <p className="text-2xl font-heading font-semibold text-[#ef4444]">{precisamAtencao.length}</p>
          </div>
        </div>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Busca */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar amigo..."
            className="bg-[#111113] border-[#27272a] text-[#f5f5f5] placeholder:text-[#52525b] pl-9"
          />
        </div>

        {/* Grupo */}
        {todosGrupos.length > 0 && (
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="bg-[#111113] border border-[#27272a] text-[#a1a1aa] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#a855f7]"
          >
            <option value="">Todos os grupos</option>
            {todosGrupos.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        {/* Saúde */}
        <select
          value={filtroSaude}
          onChange={(e) => setFiltroSaude(e.target.value)}
          className="bg-[#111113] border border-[#27272a] text-[#a1a1aa] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#a855f7]"
        >
          <option value="">Todos</option>
          <option value="verde">Em dia</option>
          <option value="amarelo">Há um tempo</option>
          <option value="vermelho">Sumido(a)</option>
        </select>

        {temFiltro && (
          <button
            onClick={() => { setBusca(""); setFiltroGrupo(""); setFiltroSaude(""); }}
            className="flex items-center gap-1 px-3 py-2 text-xs text-[#a1a1aa] hover:text-[#f5f5f5] border border-[#27272a] rounded-lg transition-colors"
          >
            <X size={11} /> Limpar
          </button>
        )}
      </div>

      {/* ── Grid de amigos ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-52 bg-[#111113] border border-[#27272a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : amigosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#a855f7]/10 flex items-center justify-center mb-4">
            <Users size={24} className="text-[#a855f7]" />
          </div>
          <p className="text-[#a1a1aa] font-medium mb-1">
            {temFiltro ? "Nenhum amigo encontrado" : "Nenhum amigo adicionado ainda"}
          </p>
          <p className="text-[#52525b] text-sm mb-4">
            {temFiltro
              ? "Tente ajustar os filtros"
              : "Adicione seus amigos para acompanhar os contatos e aniversários"}
          </p>
          {!temFiltro && (
            <button
              onClick={abrirNovo}
              className="flex items-center gap-2 px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={14} /> Novo Amigo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {amigosFiltrados.map((a) => (
            <AmigoCard
              key={a.id}
              amigo={a}
              onEditar={() => abrirEditar(a)}
              onRegistrarContato={() => registrarContato(a.id)}
            />
          ))}
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <ModalAmigo
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSalvar={salvarAmigo}
        onExcluir={editando ? excluirAmigo : undefined}
        editando={editando}
      />
    </div>
  );
}
