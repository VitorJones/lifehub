import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeHub",
  description: "Sistema pessoal de gestão de vida",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full bg-[#0a0a0b] text-[#f5f5f5]">
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 md:ml-64 min-h-screen overflow-y-auto pt-14 md:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
