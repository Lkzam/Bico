import { describe, it, expect } from 'vitest'
import {
  calcCompanyTotal,
  calcFreelancerReceives,
  PLATFORM_FEE_COMPANY,
  PLATFORM_FEE_FREELANCER,
} from '../fees'

// round(x, 2) — espelha o round(...,2) usado nos RPCs de dinheiro (Postgres).
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

describe('calcCompanyTotal — empresa paga valor + 10%', () => {
  it('aplica 10% em valores redondos', () => {
    expect(calcCompanyTotal(100)).toBe(110)
    expect(calcCompanyTotal(1000)).toBe(1100)
  })

  it('arredonda corretamente em centavos', () => {
    // 0.30 * 1.10 = 0.33
    expect(calcCompanyTotal(0.3)).toBe(0.33)
    // 33.33 * 1.10 = 36.663 -> 36.66
    expect(calcCompanyTotal(33.33)).toBe(36.66)
  })

  it('nunca retorna menos que o valor do job', () => {
    for (const v of [0.3, 1, 9.99, 250.5, 9999.99]) {
      expect(calcCompanyTotal(v)).toBeGreaterThanOrEqual(v)
    }
  })
})

describe('calcFreelancerReceives — freelancer recebe 93%', () => {
  it('desconta 7% em valores redondos', () => {
    expect(calcFreelancerReceives(100)).toBe(93)
    expect(calcFreelancerReceives(1000)).toBe(930)
  })

  it('arredonda corretamente em centavos', () => {
    // 0.30 * 0.93 = 0.279 -> 0.28
    expect(calcFreelancerReceives(0.3)).toBe(0.28)
  })

  it('nunca paga mais que o valor do job', () => {
    for (const v of [0.3, 1, 9.99, 250.5, 9999.99]) {
      expect(calcFreelancerReceives(v)).toBeLessThanOrEqual(v)
    }
  })
})

describe('conservação de dinheiro (escrow)', () => {
  it('a plataforma fica com a soma das duas taxas, sem furo', () => {
    const jobValue = 1000
    const companyPays = calcCompanyTotal(jobValue)        // 1100
    const freelancerGets = calcFreelancerReceives(jobValue) // 930
    const platformKeeps = round2(companyPays - freelancerGets)
    // 10% da empresa + 7% do freelancer = 17% do valor
    expect(platformKeeps).toBe(round2(jobValue * (PLATFORM_FEE_COMPANY + PLATFORM_FEE_FREELANCER)))
    expect(platformKeeps).toBe(170)
  })

  it('empresa sempre paga mais do que o freelancer recebe (margem positiva)', () => {
    for (const v of [0.3, 5, 99.9, 1234.56]) {
      expect(calcCompanyTotal(v)).toBeGreaterThan(calcFreelancerReceives(v))
    }
  })
})

describe('contrato — crédito por etapa (espelha approve_milestone)', () => {
  // O RPC credita round(milestone.value * 0.93, 2) por etapa aprovada.
  const milestoneCredit = (v: number) => round2(v * 0.93)

  it('a soma dos créditos das etapas bate com 93% do total (tolerância de centavos)', () => {
    const milestones = [200, 300.5, 99.99]
    const total = milestones.reduce((s, v) => s + v, 0)
    const sumCredits = round2(milestones.reduce((s, v) => s + milestoneCredit(v), 0))
    const totalCredit = calcFreelancerReceives(total)
    // diferença só pode vir de arredondamento por etapa — no máximo 1 centavo por etapa
    expect(Math.abs(sumCredits - totalCredit)).toBeLessThanOrEqual(milestones.length * 0.01)
  })

  it('o crédito de uma etapa nunca excede o valor da etapa', () => {
    for (const v of [10, 0.3, 333.33, 5000]) {
      expect(milestoneCredit(v)).toBeLessThanOrEqual(v)
    }
  })
})
