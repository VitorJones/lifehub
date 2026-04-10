"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Target,
  Calendar,
  CheckSquare,
  Settings,
  Zap,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/",        label: "Dashboard",    icon: LayoutDashboard },
  { href: "/financeiro", label: "Financeiro",icon: Wallet },
  { href: "/habitos", label: "Hábitos & Metas", icon: Target },
  { href: "/agenda",  label: "Agenda",       icon: Calendar },
  { href: "/tarefas", label: "Tarefas",      icon: CheckSquare },
  { href: "/amigos",  label: "Amigos",       icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col border-r border-[#27272a] bg-[#111113] z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#27272a]">
        <div className="w-8 h-8 rounded-lg bg-[#f97316] flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-heading font-semibold text-[#f5f5f5] text-lg tracking-tight">
          LifeHub
        </span>
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
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 ease-out group relative
                ${
                  isActive
                    ? "bg-[#f97316]/10 text-[#f97316]"
                    : "text-[#a1a1aa] hover:bg-[#1a1a1f] hover:text-[#f5f5f5]"
                }
              `}
            >
              {/* Borda esquerda ativa */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#f97316] rounded-r-full" />
              )}
              <Icon
                size={20}
                className={`flex-shrink-0 transition-colors ${
                  isActive
                    ? "text-[#f97316]"
                    : "text-[#52525b] group-hover:text-[#f5f5f5]"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé */}
      <div className="border-t border-[#27272a] p-3">
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#a1a1aa] hover:bg-[#1a1a1f] hover:text-[#f5f5f5] transition-all duration-200"
        >
          <Settings size={20} className="text-[#52525b]" />
          Configurações
        </Link>
      </div>
    </aside>
  );
}
