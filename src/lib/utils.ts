import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function calculateFee(value: number, feePercent = 0.15): number {
  return parseFloat((value * feePercent).toFixed(2))
}

export function calculateFreelancerAmount(value: number, feePercent = 0.15): number {
  return parseFloat((value - calculateFee(value, feePercent)).toFixed(2))
}

export function formatDeadline(hours: number | null | undefined): string | null {
  if (!hours) return null
  if (hours < 24) return `${hours}h de prazo`
  const days = Math.floor(hours / 24)
  const rem = hours % 24
  if (rem === 0) return `${days}d de prazo`
  return `${days}d ${rem}h de prazo`
}
