import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatCurrency(amount: number, symbol = '₹'): string {
  const abs = Math.abs(amount)
  const formatted = abs >= 100000
    ? `${symbol}${(abs / 100000).toFixed(2)}L`
    : abs >= 1000
    ? `${symbol}${(abs / 1000).toFixed(1)}K`
    : `${symbol}${abs.toFixed(0)}`
  return amount < 0 ? `-${formatted}` : formatted
}

export function formatCurrencyFull(amount: number, symbol = '₹'): string {
  return `${symbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${amount < 0 ? '' : ''}`
    .replace(/^/, amount < 0 ? '-' : '')
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'dd MMM yyyy')
}

export function formatDateShort(date: string): string {
  return format(parseISO(date), 'dd MMM')
}

export function formatDateTime(date: string): string {
  return format(parseISO(date), 'dd MMM yyyy HH:mm')
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function startOfMonthStr(date: string): string {
  return toISODate(startOfMonth(parseISO(date)))
}

export function endOfMonthStr(date: string): string {
  return toISODate(endOfMonth(parseISO(date)))
}

export function isInRange(date: string, from?: string, to?: string): boolean {
  if (!from && !to) return true
  const d = parseISO(date).getTime()
  if (from && d < parseISO(from).getTime()) return false
  if (to && d > endOfDay(parseISO(to)).getTime()) return false
  return true
}

export function getNetColor(net: number): string {
  if (net > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (net < 0) return 'text-red-500 dark:text-red-400'
  return 'text-slate-500 dark:text-slate-400'
}

export function getNetBg(net: number): string {
  if (net > 0) return 'bg-emerald-50 dark:bg-emerald-900/20'
  if (net < 0) return 'bg-red-50 dark:bg-red-900/20'
  return 'bg-slate-50 dark:bg-slate-800/40'
}

export function paginateArray<T>(arr: T[], page: number, perPage: number): T[] {
  return arr.slice((page - 1) * perPage, page * perPage)
}

export function dateRange(from: string, to: string): string[] {
  const dates: string[] = []
  const start = parseISO(from)
  const end = parseISO(to)
  const cur = new Date(start)
  while (cur <= end) {
    dates.push(toISODate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function sumBy<T>(arr: T[], key: (item: T) => number): number {
  return arr.reduce((sum, item) => sum + key(item), 0)
}

export const GAME_COLORS = [
  '#F97316', '#6366F1', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
  '#84CC16', '#F97316', '#0EA5E9', '#D946EF',
]
