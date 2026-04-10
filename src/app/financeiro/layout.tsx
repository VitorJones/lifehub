"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2, List, CalendarDays, RefreshCw, Tag, Landmark,
  CreditCard, FileText, PiggyBank, TrendingUp, SplitSquareHorizontal,
} from "lucide-react";

const tabs = [
  { href: "/financeiro",                label: "Visão Geral",   icon: BarChart2,              exact: true },
  { href: "/financeiro/transacoes",     label: "Transações",    icon: List },
  { href: "/financeiro/mensal",         label: "Mensal",        icon: CalendarDays },
  { href: "/financeiro/recorrentes",    label: "Recorrentes",   icon: RefreshCw },
  { href: "/financeiro/parcelamentos",  label: "Parcelamentos", icon: SplitSquareHorizontal },
  { href: "/financeiro/categorias",     label: "Categorias",    icon: Tag },
  { href: "/financeiro/contas",         label: "Contas",        icon: Landmark },
  { href: "/financeiro/cartoes",        label: "Cartões",       icon: CreditCard },
  { href: "/financeiro/faturas",        label: "Faturas",       icon: FileText },
  { href: "/financeiro/alocacao",       label: "Alocação",      icon: PiggyBank },
  { href: "/financeiro/investimentos",  label: "Investimentos", icon: TrendingUp },
];

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo com título e tab bar */}
      <div className="border-b border-[#27272a] bg-[#0a0a0b] sticky top-0 z-10">
        <div className="px-8 pt-8 pb-0">
          <h1 className="text-2xl font-heading font-semibold text-[#f5f5f5] mb-5">
            Financeiro
          </h1>
          {/* Tab bar */}
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium
                    transition-all duration-200 border-b-2 -mb-px
                    ${
                      isActive
                        ? "text-[#f97316] border-[#f97316] bg-[#f97316]/5"
                        : "text-[#a1a1aa] border-transparent hover:text-[#f5f5f5] hover:bg-[#1a1a1f]"
                    }
                  `}
                >
                  <Icon size={15} />
                  <span className="leading-none">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
