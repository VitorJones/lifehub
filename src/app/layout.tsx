import type { Metadata } from "next";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Providers } from "@/components/layout/Providers";
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
      <body className="h-full bg-[#0a0a0b] text-[#f5f5f5] overflow-x-hidden">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
