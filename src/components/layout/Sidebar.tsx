"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Wallet,
  Target,
  Calendar,
  CheckSquare,
  Settings,
  Zap,
  Users,
  Menu,
  X,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/",           label: "Dashboard",       icon: LayoutDashboard },
  { href: "/financeiro", label: "Financeiro",      icon: Wallet },
  { href: "/habitos",    label: "Hábitos & Metas", icon: Target },
  { href: "/agenda",     label: "Agenda",          icon: Calendar },
  { href: "/tarefas",    label: "Tarefas",         icon: CheckSquare },
  { href: "/amigos",     label: "Amigos",          icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fecha ao navegar
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloqueia scroll do body quando aberta no mobile
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Botão hambúrguer — só mobile */}
      <button
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3.5 left-4 z-60 p-2 rounded-lg bg-[#111113] border border-[#27272a] text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Overlay — só mobile */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-55 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed left-0 top-0 h-screen w-64 flex flex-col",
          "border-r border-[#27272a] bg-[#111113] z-60",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        ].join(" ")}
      >
        {/* Logo + fechar (mobile) */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#27272a]">
          <div className="w-8 h-8 rounded-lg bg-[#f97316] flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-heading font-semibold text-[#f5f5f5] text-lg tracking-tight flex-1">
            LifeHub
          </span>
          <button
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="md:hidden p-1 text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  "transition-all duration-200 ease-out group relative",
                  isActive
                    ? "bg-[#f97316]/10 text-[#f97316]"
                    : "text-[#a1a1aa] hover:bg-[#1a1a1f] hover:text-[#f5f5f5]",
                ].join(" ")}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#f97316] rounded-r-full" />
                )}
                <Icon
                  size={20}
                  className={`shrink-0 transition-colors ${
                    isActive ? "text-[#f97316]" : "text-[#52525b] group-hover:text-[#f5f5f5]"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div className="border-t border-[#27272a] p-3 space-y-1">
          <Link
            href="/configuracoes"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#a1a1aa] hover:bg-[#1a1a1f] hover:text-[#f5f5f5] transition-all duration-200"
          >
            <Settings size={20} className="text-[#52525b]" />
            Configurações
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#a1a1aa] hover:bg-[#ef4444]/10 hover:text-[#ef4444] transition-all duration-200"
          >
            <LogOut size={20} className="text-[#52525b]" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
