// Helper de autorização de admin.
// ADMIN_USER_IDS na env é uma lista CSV de auth.users.id (UUIDs).
//
// Exemplo:
//   ADMIN_USER_IDS=3429a0b6-3fe2-4d4e-9acf-948e3b9f049b,outro-uuid-aqui

/** Conjunto memoizado para lookup O(1). */
let cachedAdminIds: Set<string> | null = null

function getAdminIds(): Set<string> {
  if (cachedAdminIds) return cachedAdminIds
  const raw = process.env.ADMIN_USER_IDS ?? ''
  cachedAdminIds = new Set(
    raw.split(',').map(s => s.trim()).filter(Boolean)
  )
  return cachedAdminIds
}

/** Verifica se um user.id pertence à lista de admins. */
export function isAdminUserId(userId: string | null | undefined): boolean {
  if (!userId) return false
  return getAdminIds().has(userId)
}
