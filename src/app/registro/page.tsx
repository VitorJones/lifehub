"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter ao menos 6 caracteres.");
      return;
    }

    setCarregando(true);

    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim(), email: email.toLowerCase().trim(), senha }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Erro ao criar conta.");
      setCarregando(false);
      return;
    }

    // Login automático após registro
    const login = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      senha,
      redirect: false,
    });

    setCarregando(false);

    if (login?.error) {
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="font-heading font-semibold text-[#f5f5f5] text-2xl tracking-tight">
            LifeHub
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#111113] border border-[#27272a] rounded-2xl p-6">
          <h1 className="text-xl font-heading font-semibold text-[#f5f5f5] mb-1">
            Criar conta
          </h1>
          <p className="text-sm text-[#a1a1aa] mb-6">
            Preencha os dados para começar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                required
                autoComplete="name"
                className="w-full bg-[#1a1a1f] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-sm text-[#f5f5f5] placeholder:text-[#52525b] focus:outline-none focus:border-[#f97316]/60 focus:ring-1 focus:ring-[#f97316]/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full bg-[#1a1a1f] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-sm text-[#f5f5f5] placeholder:text-[#52525b] focus:outline-none focus:border-[#f97316]/60 focus:ring-1 focus:ring-[#f97316]/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">
                Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                  className="w-full bg-[#1a1a1f] border border-[#27272a] rounded-xl px-3.5 py-2.5 pr-10 text-sm text-[#f5f5f5] placeholder:text-[#52525b] focus:outline-none focus:border-[#f97316]/60 focus:ring-1 focus:ring-[#f97316]/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#a1a1aa] mb-1.5 font-medium">
                Confirmar senha
              </label>
              <input
                type={mostrarSenha ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a senha"
                required
                autoComplete="new-password"
                className="w-full bg-[#1a1a1f] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-sm text-[#f5f5f5] placeholder:text-[#52525b] focus:outline-none focus:border-[#f97316]/60 focus:ring-1 focus:ring-[#f97316]/30 transition-colors"
              />
            </div>

            {erro && (
              <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {carregando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar conta"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#52525b] mt-5">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="text-[#f97316] hover:text-[#ea6c0a] font-medium transition-colors"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
