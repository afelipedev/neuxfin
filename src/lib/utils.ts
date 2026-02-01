import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converte uma string de data ISO para um objeto Date local.
 * Evita problemas de timezone que fazem a data aparecer um dia antes.
 * 
 * Exemplo: "2026-01-31T00:00:00.000Z" -> Date local representando 31/01/2026
 * 
 * @param dateString - String de data no formato ISO (ex: "2026-01-31T00:00:00.000Z" ou "2026-01-31")
 * @returns Date object local com a data correta
 */
export function parseLocalDate(dateString: string): Date {
  // Extrai apenas a parte da data (YYYY-MM-DD)
  const datePart = dateString.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  // Cria a data usando os componentes locais (mês é 0-indexed)
  return new Date(year, month - 1, day)
}

/**
 * Converte um objeto Date para string no formato ISO (YYYY-MM-DD) sem ajuste de timezone.
 * Use esta função ao salvar datas no banco de dados para garantir que a data
 * selecionada pelo usuário seja a mesma que será salva.
 * 
 * Exemplo: Date(2026, 0, 31) -> "2026-01-31"
 * 
 * @param date - Objeto Date a ser convertido
 * @returns String no formato "YYYY-MM-DD"
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
