import { timingSafeEqual } from 'crypto'

/**
 * Comparação de strings resistente a timing attacks.
 * Nunca use === para comparar tokens/secrets — use esta função.
 */
export function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8')
    const bufB = Buffer.from(b, 'utf8')
    // Preenche o buffer menor para igualar tamanhos sem vazar o tamanho real
    if (bufA.length !== bufB.length) {
      timingSafeEqual(bufA, Buffer.alloc(bufA.length)) // executa para gastar tempo constante
      return false
    }
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

/**
 * Valida se uma string é uma chave PIX válida.
 * Aceita: CPF, CNPJ, telefone (+55...), email ou UUID (chave aleatória).
 */
export function isValidPixKey(key: string): boolean {
  const k = key.trim()
  if (!k || k.length > 77) return false
  if (/^\d{11}$/.test(k)) return true                                          // CPF
  if (/^\d{14}$/.test(k)) return true                                          // CNPJ
  if (/^\+55\d{10,11}$/.test(k)) return true                                   // Telefone
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k) && k.length <= 77) return true  // Email
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return true // UUID
  return false
}

/** Valida CPF (com dígito verificador). Aceita com ou sem máscara. */
export function isValidCPF(cpf: string): boolean {
  const c = (cpf ?? '').replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
  let d1 = 11 - (sum % 11); if (d1 >= 10) d1 = 0
  if (d1 !== parseInt(c[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
  let d2 = 11 - (sum % 11); if (d2 >= 10) d2 = 0
  return d2 === parseInt(c[10])
}

/** Valida CNPJ (com dígito verificador). Aceita com ou sem máscara. */
export function isValidCNPJ(cnpj: string): boolean {
  const c = (cnpj ?? '').replace(/\D/g, '')
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false
  const digit = (len: number) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(c[i]) * weights[i]
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return digit(12) === parseInt(c[12]) && digit(13) === parseInt(c[13])
}
