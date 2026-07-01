import { describe, it, expect } from 'vitest'
import { reviewSubmitSchema } from '@/app/api/reviews/submit/route'

const validId = '550e8400-e29b-41d4-a716-446655440000'

describe('reviewSubmitSchema — rating', () => {
  it('rejeita string "abc"', () => {
    const result = reviewSubmitSchema.safeParse({ jobArchiveId: validId, rating: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejeita decimal 3.7', () => {
    const result = reviewSubmitSchema.safeParse({ jobArchiveId: validId, rating: 3.7 })
    expect(result.success).toBe(false)
  })

  it('rejeita 0 (abaixo do mínimo)', () => {
    const result = reviewSubmitSchema.safeParse({ jobArchiveId: validId, rating: 0 })
    expect(result.success).toBe(false)
  })

  it('rejeita 6 (acima do máximo)', () => {
    const result = reviewSubmitSchema.safeParse({ jobArchiveId: validId, rating: 6 })
    expect(result.success).toBe(false)
  })

  it('aceita 1 (mínimo válido)', () => {
    const result = reviewSubmitSchema.safeParse({ jobArchiveId: validId, rating: 1 })
    expect(result.success).toBe(true)
  })

  it('aceita 5 (máximo válido)', () => {
    const result = reviewSubmitSchema.safeParse({ jobArchiveId: validId, rating: 5 })
    expect(result.success).toBe(true)
  })

  it('aceita comment opcional ausente', () => {
    const result = reviewSubmitSchema.safeParse({ jobArchiveId: validId, rating: 3 })
    expect(result.success).toBe(true)
  })

  it('rejeita comment com mais de 2000 caracteres', () => {
    const result = reviewSubmitSchema.safeParse({
      jobArchiveId: validId,
      rating: 3,
      comment: 'x'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('rejeita jobArchiveId inválido', () => {
    const result = reviewSubmitSchema.safeParse({ jobArchiveId: 'nao-e-uuid', rating: 3 })
    expect(result.success).toBe(false)
  })
})
