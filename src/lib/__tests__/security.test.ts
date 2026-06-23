import { describe, it, expect } from 'vitest'
import { secureCompare, isValidPixKey, isValidCPF, isValidCNPJ } from '../security'

describe('secureCompare', () => {
  it('retorna true para strings iguais', () => {
    expect(secureCompare('token-secreto-123', 'token-secreto-123')).toBe(true)
  })
  it('retorna false para strings diferentes do mesmo tamanho', () => {
    expect(secureCompare('aaaaaaaa', 'aaaaaaab')).toBe(false)
  })
  it('retorna false para tamanhos diferentes (sem vazar tamanho)', () => {
    expect(secureCompare('curto', 'bem-mais-comprido')).toBe(false)
  })
  it('retorna false (sem lançar) para entradas vazias', () => {
    expect(secureCompare('', '')).toBe(true)
    expect(secureCompare('x', '')).toBe(false)
  })
})

describe('isValidCPF', () => {
  it('aceita CPFs válidos (com e sem máscara)', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true)
    expect(isValidCPF('52998224725')).toBe(true)
    expect(isValidCPF('111.444.777-35')).toBe(true)
  })
  it('rejeita dígito verificador errado', () => {
    expect(isValidCPF('529.982.247-24')).toBe(false)
    expect(isValidCPF('11144477736')).toBe(false)
  })
  it('rejeita sequências repetidas e tamanhos errados', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false)
    expect(isValidCPF('00000000000')).toBe(false)
    expect(isValidCPF('123')).toBe(false)
    expect(isValidCPF('')).toBe(false)
  })
})

describe('isValidCNPJ', () => {
  it('aceita CNPJs válidos (com e sem máscara)', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true)
    expect(isValidCNPJ('11222333000181')).toBe(true)
  })
  it('rejeita dígito verificador errado', () => {
    expect(isValidCNPJ('11.222.333/0001-80')).toBe(false)
  })
  it('rejeita sequências repetidas e tamanhos errados', () => {
    expect(isValidCNPJ('11.111.111/1111-11')).toBe(false)
    expect(isValidCNPJ('123')).toBe(false)
    expect(isValidCNPJ('')).toBe(false)
  })
})

describe('isValidPixKey', () => {
  it('aceita CPF, CNPJ, telefone, email e UUID', () => {
    expect(isValidPixKey('52998224725')).toBe(true)          // CPF (11 dígitos)
    expect(isValidPixKey('11222333000181')).toBe(true)        // CNPJ (14 dígitos)
    expect(isValidPixKey('+5511999998888')).toBe(true)        // telefone
    expect(isValidPixKey('contato@bico.com.br')).toBe(true)   // email
    expect(isValidPixKey('123e4567-e89b-12d3-a456-426614174000')).toBe(true) // UUID
  })
  it('rejeita lixo e strings muito longas', () => {
    expect(isValidPixKey('')).toBe(false)
    expect(isValidPixKey('chave invalida')).toBe(false)
    expect(isValidPixKey('a'.repeat(78))).toBe(false)
  })
})
