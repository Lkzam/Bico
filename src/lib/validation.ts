import { z } from 'zod'
import { NextResponse } from 'next/server'

// Lê e valida o corpo de uma requisição com um schema zod.
// Retorna { data } em sucesso ou { error: NextResponse 400 } com a 1ª mensagem.
// Nunca lança — body malformado vira {} e o schema decide.
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown
  try { raw = await req.json() } catch { raw = {} }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Dados inválidos.'
    return { data: null, error: NextResponse.json({ error: msg }, { status: 400 }) }
  }
  return { data: result.data, error: null }
}

// ── Tipos reutilizáveis ──────────────────────────────────────────────────────

// Dinheiro em reais: positivo, máx 2 casas, teto sanitário p/ evitar overflow/abuso.
export const moneyAmount = z
  .number({ message: 'Valor inválido.' })
  .finite('Valor inválido.')
  .positive('O valor deve ser maior que zero.')
  .max(1_000_000, 'Valor acima do limite permitido.')
  .refine(v => Math.round(v * 100) === v * 100, 'Use no máximo 2 casas decimais.')

// Aceita number ou string numérica ("100.50") e normaliza para number.
export const moneyAmountCoerced = z.coerce
  .number({ message: 'Valor inválido.' })
  .pipe(moneyAmount)

export const uuid = z.string().uuid('Identificador inválido.')

// Nota de avaliação (reviews): inteiro de 1 a 5, sem decimais nem strings.
export const rating = z
  .number({ message: 'Rating deve ser um número inteiro entre 1 e 5.' })
  .int('Rating deve ser um número inteiro entre 1 e 5.')
  .min(1, 'Rating deve ser entre 1 e 5.')
  .max(5, 'Rating deve ser entre 1 e 5.')

export const deadlineHours = z
  .union([z.coerce.number().int().positive().max(8760), z.null()])
  .optional()
  .transform(v => (v == null ? null : v))
