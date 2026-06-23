import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDeadline } from '../utils'

// Normaliza espaços (Intl pt-BR pode usar NBSP/narrow-NBSP entre R$ e número
// dependendo da versão do ICU).
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

describe('formatCurrency', () => {
  it('formata em reais com 2 casas', () => {
    expect(norm(formatCurrency(1234.5))).toBe('R$ 1.234,50')
    expect(norm(formatCurrency(0.3))).toBe('R$ 0,30')
    expect(norm(formatCurrency(0))).toBe('R$ 0,00')
  })
})

describe('formatDeadline', () => {
  it('retorna null quando não há prazo', () => {
    expect(formatDeadline(null)).toBeNull()
    expect(formatDeadline(undefined)).toBeNull()
    expect(formatDeadline(0)).toBeNull()
  })
  it('mostra horas abaixo de 1 dia', () => {
    expect(formatDeadline(5)).toBe('5h de prazo')
    expect(formatDeadline(23)).toBe('23h de prazo')
  })
  it('mostra dias inteiros', () => {
    expect(formatDeadline(24)).toBe('1d de prazo')
    expect(formatDeadline(48)).toBe('2d de prazo')
  })
  it('mostra dias + horas quando não é múltiplo de 24', () => {
    expect(formatDeadline(36)).toBe('1d 12h de prazo')
    expect(formatDeadline(50)).toBe('2d 2h de prazo')
  })
})
