import { useSyncExternalStore } from "react"
import { ACCOUNTS_KEY, LEGACY_STORE_KEY, userStoreKey } from "./session"
import { clearStore, flushStore, initializeStore, sanitizeStore } from "./storage"
import type { Store } from "./types"

export type Session = { id: string; username: string }
type AuthResult = { ok: true } | { ok: false; error: string }
type AuthState = { ready: boolean; session: Session | null }
type LegacyAccount = { id: string; username: string; salt: string; hash: string }

let state: AuthState = { ready: false, session: null }
const listeners = new Set<() => void>()

function update(next: AuthState) {
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function legacyData(username: string, password: string, registering: boolean): Promise<Store | null> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    const accounts = raw ? JSON.parse(raw) as LegacyAccount[] : []
    if (!Array.isArray(accounts)) return null
    const id = encodeURIComponent(username.trim().normalize("NFKC").toLowerCase())
    const account = accounts.find((item) => item.id === id)
    if (account && /^[a-f0-9]{32}$/.test(account.salt)) {
      const salt = Uint8Array.from(account.salt.match(/.{2}/g)!, (hex) => Number.parseInt(hex, 16))
      const passwordBytes = new TextEncoder().encode(password)
      const input = new Uint8Array(salt.length + passwordBytes.length)
      input.set(salt)
      input.set(passwordBytes, salt.length)
      const hash = toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", input)))
      if (hash !== account.hash) return null
      const data = localStorage.getItem(userStoreKey(id))
      return data ? sanitizeStore(JSON.parse(data)) : null
    }
    if (registering && accounts.length === 0) {
      const data = localStorage.getItem(LEGACY_STORE_KEY)
      return data ? sanitizeStore(JSON.parse(data)) : null
    }
  } catch { /* Legacy browser data is optional. */ }
  return null
}

async function postAuth(path: "login" | "register", username: string, password: string, oldPassword = ""): Promise<AuthResult> {
  const legacy = await legacyData(username, oldPassword || password, path === "register")
  try {
    const response = await fetch(`/api/account/${path}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    const result = await response.json() as { user?: Session; error?: string }
    if (!response.ok || !result.user) return { ok: false, error: result.error || "登录服务暂时不可用" }
    await initializeStore(result.user.id, legacy)
    update({ ready: true, session: result.user })
    return { ok: true }
  } catch {
    return { ok: false, error: "无法连接服务器，请稍后再试" }
  }
}

export function register(username: string, password: string, oldPassword?: string) { return postAuth("register", username, password, oldPassword) }
export function login(username: string, password: string, oldPassword?: string) { return postAuth("login", username, password, oldPassword) }

export async function logout(): Promise<AuthResult> {
  if (!await flushStore()) return { ok: false, error: "进度尚未同步到服务器，请重试同步后退出" }
  try {
    const response = await fetch("/api/account/logout", { method: "POST", credentials: "same-origin" })
    if (!response.ok) return { ok: false, error: "退出失败，请稍后再试" }
    clearStore()
    update({ ready: true, session: null })
    return { ok: true }
  } catch {
    return { ok: false, error: "无法连接服务器，请稍后再试" }
  }
}

export function useAuthState() { return useSyncExternalStore(subscribe, () => state, () => state) }
export function useSession() { return useAuthState().session }

void (async () => {
  try {
    const response = await fetch("/api/account/session", { credentials: "same-origin" })
    if (!response.ok) throw new Error("Session request failed")
    const result = await response.json() as { user: Session | null }
    if (result.user) await initializeStore(result.user.id)
    update({ ready: true, session: result.user })
  } catch {
    update({ ready: true, session: null })
  }
})()
