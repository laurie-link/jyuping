import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { promisify } from "node:util"
import Database from "better-sqlite3"

const scrypt = promisify(scryptCallback)
const databasePath = resolve(process.env.DATA_PATH || ".data/jyutping.sqlite")
mkdirSync(dirname(databasePath), { recursive: true })
const db = new Database(databasePath)
db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL UNIQUE,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS progress (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  );
`)

const SESSION_MS = 30 * 24 * 60 * 60 * 1000
const MAX_BODY = 4 * 1024 * 1024
const LOGIN_DELAY_MS = 500
const loginFailures = new Map()

function json(response, status, value, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  }).end(JSON.stringify(value))
}

function error(response, status, message) {
  json(response, status, { error: message })
}

function cookieToken(request) {
  const match = /(?:^|;\s*)jm_session=([^;]+)/.exec(request.headers.cookie || "")
  return match?.[1] || null
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex")
}

function currentUser(request) {
  const token = cookieToken(request)
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  return db.prepare(`
    SELECT users.id, users.username FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(tokenHash(token), Date.now()) || null
}

function sessionCookie(token, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return `jm_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${secure}`
}

function createSession(response, user) {
  const token = randomBytes(32).toString("hex")
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now())
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(tokenHash(token), user.id, Date.now() + SESSION_MS)
  json(response, 200, { user }, { "Set-Cookie": sessionCookie(token, SESSION_MS / 1000) })
}

function sameOrigin(request) {
  const origin = request.headers.origin
  if (!origin || !request.headers.host) return false
  try {
    return new URL(origin).host === request.headers.host
  } catch {
    return false
  }
}

async function body(request) {
  if (!request.headers["content-type"]?.startsWith("application/json")) throw new Error("请发送 JSON 数据")
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY) throw new Error("数据太大")
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } catch {
    throw new Error("JSON 格式错误")
  }
}

function credentials(value, registering) {
  const username = typeof value?.username === "string" ? value.username.trim().normalize("NFKC") : ""
  const password = value?.password
  if (!username || username.length > 32 || [...username].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
    return { error: "账号需要是 1–32 个字，不能含控制符" }
  }
  if (typeof password !== "string" || !password || password.length > 64) return { error: "请输入密码（最长 64 个字）" }
  if (registering && password.length < 8) return { error: "新密码至少 8 个字" }
  return { username, usernameKey: username.toLowerCase(), password }
}

async function passwordHash(password, salt) {
  return (await scrypt(password, Buffer.from(salt, "hex"), 64, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 })).toString("hex")
}

function validProgress(value) {
  return value && typeof value === "object" && !Array.isArray(value) && value.version === 1 &&
    value.cards && typeof value.cards === "object" && !Array.isArray(value.cards) &&
    value.lessons && typeof value.lessons === "object" && !Array.isArray(value.lessons) &&
    value.progress && typeof value.progress === "object" && !Array.isArray(value.progress) &&
    value.settings && typeof value.settings === "object" && !Array.isArray(value.settings) &&
    value.streak && typeof value.streak === "object" && !Array.isArray(value.streak)
}

function progressFor(userId) {
  const row = db.prepare("SELECT data, revision FROM progress WHERE user_id = ?").get(userId)
  return row ? { data: JSON.parse(row.data), revision: row.revision } : { data: null, revision: 0 }
}

export async function handleAccountApi(request, response) {
  const path = request.url?.split("?")[0]
  if (!path?.startsWith("/api/account/")) return false
  try {
    if (request.method === "GET" && path === "/api/account/session") {
      json(response, 200, { user: currentUser(request) })
      return true
    }
    if (request.method === "GET" && path === "/api/account/progress") {
      const user = currentUser(request)
      if (!user) error(response, 401, "请先登录")
      else json(response, 200, progressFor(user.id))
      return true
    }
    if (!sameOrigin(request)) {
      error(response, 403, "请求来源不正确")
      return true
    }
    if (request.method === "POST" && path === "/api/account/register") {
      const input = credentials(await body(request), true)
      if (input.error) return void error(response, 400, input.error)
      if (db.prepare("SELECT 1 FROM users WHERE username_key = ?").get(input.usernameKey)) {
        return void error(response, 409, "这个账号已经注册过了，直接登录就行")
      }
      const user = { id: randomBytes(16).toString("hex"), username: input.username }
      const salt = randomBytes(16).toString("hex")
      const hash = await passwordHash(input.password, salt)
      try {
        db.prepare("INSERT INTO users (id, username, username_key, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)")
          .run(user.id, user.username, input.usernameKey, salt, hash, Date.now())
      } catch (caught) {
        if (caught.code === "SQLITE_CONSTRAINT_UNIQUE") return void error(response, 409, "这个账号已经注册过了，直接登录就行")
        throw caught
      }
      createSession(response, user)
      return true
    }
    if (request.method === "POST" && path === "/api/account/login") {
      const input = credentials(await body(request), false)
      if (input.error) return void error(response, 400, input.error)
      const rateKey = `${request.socket.remoteAddress}:${input.usernameKey}`
      const failures = loginFailures.get(rateKey) || { count: 0, until: 0 }
      if (failures.until > Date.now()) return void error(response, 429, "尝试太多，请稍后再试")
      const user = db.prepare("SELECT * FROM users WHERE username_key = ?").get(input.usernameKey)
      const salt = user?.salt || "00000000000000000000000000000000"
      const expected = Buffer.from(user?.password_hash || "00".repeat(64), "hex")
      const actual = Buffer.from(await passwordHash(input.password, salt), "hex")
      if (!user || !timingSafeEqual(expected, actual)) {
        if (loginFailures.size > 2000) loginFailures.delete(loginFailures.keys().next().value)
        failures.count += 1
        failures.until = Date.now() + Math.min(60_000, LOGIN_DELAY_MS * 2 ** Math.min(failures.count, 7))
        loginFailures.set(rateKey, failures)
        return void error(response, 401, "账号或密码不对")
      }
      loginFailures.delete(rateKey)
      createSession(response, { id: user.id, username: user.username })
      return true
    }
    if (request.method === "POST" && path === "/api/account/logout") {
      const token = cookieToken(request)
      if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token))
      json(response, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) })
      return true
    }
    if (request.method === "PUT" && path === "/api/account/progress") {
      const user = currentUser(request)
      if (!user) return void error(response, 401, "请先登录")
      const input = await body(request)
      if (!validProgress(input?.data) || !Number.isInteger(input?.revision) || input.revision < 0) {
        return void error(response, 400, "练习数据格式错误")
      }
      const serialized = JSON.stringify(input.data)
      if (Buffer.byteLength(serialized) > MAX_BODY) return void error(response, 413, "练习数据太大")
      const result = db.transaction(() => {
        const current = db.prepare("SELECT revision FROM progress WHERE user_id = ?").get(user.id)?.revision || 0
        if (current !== input.revision) return null
        const revision = current + 1
        db.prepare(`INSERT INTO progress (user_id, data, revision, updated_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, revision = excluded.revision, updated_at = excluded.updated_at`)
          .run(user.id, serialized, revision, Date.now())
        return revision
      })()
      if (result === null) return void error(response, 409, "另一台设备更新了进度，请刷新页面")
      json(response, 200, { revision: result })
      return true
    }
    error(response, 404, "接口不存在")
  } catch (caught) {
    if (caught instanceof Error && /^(请发送 JSON 数据|数据太大|JSON 格式错误)$/.test(caught.message)) {
      error(response, 400, caught.message)
    } else {
      console.error("Account API failed:", caught)
      error(response, 500, "服务器暂时无法处理请求")
    }
  }
  return true
}
