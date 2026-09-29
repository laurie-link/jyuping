export const LEGACY_STORE_KEY = "jyutping-memo:v1"
export const ACCOUNTS_KEY = "jyutping-memo:accounts"

export function userStoreKey(id: string) {
  return `${LEGACY_STORE_KEY}:user:${id}`
}
