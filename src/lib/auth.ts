import { useSyncExternalStore } from "react"
import { ACCOUNTS_KEY, LEGACY_STORE_KEY, SESSION_KEY, userStoreKey } from "./session"

export type Session = {
  id: string
  username: string
}

type Account = {
  id: string
  username: string
  salt: string
  hash: string
}

type AuthResult = { ok: true } | { ok: false; error: string }

const listeners = new Set<() => void>()
let session = readStoredSession()

function emit() {
  for (const listener of listeners) listener()
}

export function normalizeUsername(username: string) {
  return username.trim().normalize("NFKC").toLowerCase()
}

function accountId(username: string) {
  return encodeURIComponent(normalizeUsername(username))
}

function isAccount(value: unknown): value is Account {
  if (!value || typeof value !== "object") return false
  const account = value as Partial<Account>
  return (
    typeof account.id === "string" &&
    typeof account.username === "string" &&
    typeof account.salt === "string" &&
    typeof account.hash === "string"
  )
}

function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isAccount)
  } catch {
    return []
  }
}

function saveAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function readStoredSession(): Session | null {
  try {
    const id = localStorage.getItem(SESSION_KEY)
    if (!id) return null
    const account = loadAccounts().find((item) => item.id === id)
    if (!account) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return { id: account.id, username: account.username }
  } catch {
    return null
  }
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function randomSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

async function hashPassword(password: string, saltHex: string) {
  const salt = fromHex(saltHex)
  const passwordBytes = new TextEncoder().encode(password)
  const data = new Uint8Array(salt.length + passwordBytes.length)
  data.set(salt)
  data.set(passwordBytes, salt.length)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return toHex(new Uint8Array(digest))
}

function checkName(username: string, password: string): { ok: false; error: string } | { ok: true; name: string } {
  const name = username.trim().normalize("NFKC")
  if (!name || !password) return { ok: false, error: "先写账号和密码" }
  if (name.length > 32) return { ok: false, error: "账号最长 32 个字" }
  if (password.length > 64) return { ok: false, error: "密码最长 64 个字" }
  if ([...name].some((char) => char.charCodeAt(0) <= 31 || char.charCodeAt(0) === 127)) {
    return { ok: false, error: "账号里不能有换行或控制符" }
  }
  return { ok: true, name }
}

function enter(account: Account) {
  localStorage.setItem(SESSION_KEY, account.id)
  session = { id: account.id, username: account.username }
  emit()
}

function adoptLegacyStore(id: string) {
  const key = userStoreKey(id)
  if (localStorage.getItem(key)) return
  const legacy = localStorage.getItem(LEGACY_STORE_KEY)
  if (!legacy) return
  localStorage.setItem(key, legacy)
  localStorage.removeItem(LEGACY_STORE_KEY)
}

export async function register(username: string, password: string): Promise<AuthResult> {
  const checked = checkName(username, password)
  if (!checked.ok) return checked
  if (!crypto.subtle) return { ok: false, error: "这个浏览器保存不了密码" }
  const accounts = loadAccounts()
  const id = accountId(checked.name)
  if (accounts.some((account) => account.id === id)) {
    return { ok: false, error: "这个账号已经注册过了，直接登录就行" }
  }
  const salt = randomSalt()
  const account: Account = {
    id,
    username: checked.name,
    salt,
    hash: await hashPassword(password, salt),
  }
  if (accounts.length === 0) adoptLegacyStore(id)
  saveAccounts([...accounts, account])
  enter(account)
  return { ok: true }
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const checked = checkName(username, password)
  if (!checked.ok) return checked
  if (!crypto.subtle) return { ok: false, error: "这个浏览器保存不了密码" }
  const account = loadAccounts().find((item) => item.id === accountId(checked.name))
  if (!account) return { ok: false, error: "账号或密码不对" }
  const hash = await hashPassword(password, account.salt)
  if (hash !== account.hash) return { ok: false, error: "账号或密码不对" }
  enter(account)
  return { ok: true }
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // The session in memory still ends.
  }
  session = null
  emit()
}

export function getSession() {
  return session
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession, getSession)
}
