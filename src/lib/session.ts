export const LEGACY_STORE_KEY = "jyutping-memo:v1"
export const SESSION_KEY = "jyutping-memo:session"
export const ACCOUNTS_KEY = "jyutping-memo:accounts"

export function currentUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function userStoreKey(id: string) {
  return `${LEGACY_STORE_KEY}:user:${id}`
}
