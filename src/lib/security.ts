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
