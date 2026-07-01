import { describe, it, expect } from 'vitest'
import { rating } from '../validation'

describe('rating — usado em reviews (1 a 5, inteiro)', () => {
  it('rejeita valores não numéricos', () => {
    expect(rating.safeParse('abc').success).toBe(false)
  })

  it('rejeita decimais', () => {
    expect(rating.safeParse(3.7).success).toBe(false)
  })

  it('rejeita fora do intervalo 1–5', () => {
    expect(rating.safeParse(0).success).toBe(false)
    expect(rating.safeParse(6).success).toBe(false)
  })

  it('aceita os limites 1 e 5', () => {
    expect(rating.safeParse(1).success).toBe(true)
    expect(rating.safeParse(5).success).toBe(true)
  })
})
