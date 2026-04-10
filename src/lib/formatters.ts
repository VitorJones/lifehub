import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export function formatarDataRelativa(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function formatarDataHora(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatarMesAno(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return format(d, "MMMM 'de' yyyy", { locale: ptBR });
}
