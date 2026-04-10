"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Flag } from "lucide-react";

const tabs = [
  { href: "/habitos",       label: "Hábitos", icon: Target, exact: true },
  { href: "/habitos/metas", label: "Metas",   icon: Flag },
];

export default function HabitosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[#27272a] bg-[#0a0a0b] sticky top-0 z-10">
        <div className="px-8 pt-8 pb-0">
          <h1 className="text-2xl font-heading font-semibold text-[#f5f5f5] mb-5">
            Hábitos & Metas
          </h1>
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg
                    transition-all duration-200 border-b-2 -mb-px
                    ${isActive
                      ? "text-[#a855f7] border-[#a855f7] bg-[#a855f7]/5"
                      : "text-[#a1a1aa] border-transparent hover:text-[#f5f5f5] hover:bg-[#1a1a1f]"
                    }
                  `}
                >
                  <Icon size={16} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
