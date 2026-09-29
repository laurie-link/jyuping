import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdtemp, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

async function freePort() {
  const server = createServer()
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const port = server.address().port
  server.close()
  await once(server, "close")
  return port
}

test("accounts own durable progress and sessions are server-side", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jyutping-account-test-"))
  const port = await freePort()
  const origin = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, ["server/tts-api.mjs"], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, PORT: String(port), DATA_PATH: join(directory, "account.sqlite"), NODE_ENV: "test" },
    stdio: "ignore",
  })
  async function request(path, method = "GET", payload, cookie, requestOrigin = origin) {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: { ...(payload ? { "Content-Type": "application/json" } : {}), ...(method !== "GET" ? { Origin: requestOrigin } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
    })
    return { status: response.status, cookie: response.headers.get("set-cookie")?.split(";")[0], data: await response.json() }
  }
  try {
    let ready = false
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try { await request("/api/account/session"); ready = true; break } catch { await new Promise((resolve) => setTimeout(resolve, 100)) }
    }
    assert.equal(ready, true)
    const alice = await request("/api/account/register", "POST", { username: "Alice", password: "very-secret-123" })
    assert.equal(alice.status, 200)
    assert.match(alice.cookie, /^jm_session=/)
    assert.equal((await request("/api/account/progress", "GET", undefined, alice.cookie)).data.revision, 0)
    const progress = { version: 1, cards: {}, lessons: {}, progress: { first: { attempts: 3, cursor: {} } }, streak: { lastDay: "", count: 0 }, settings: { difficulty: "beginner", sound: true, autoPlay: false, speakOnAnswer: true }, seenIntro: true }
    const saved = await request("/api/account/progress", "PUT", { data: progress, revision: 0 }, alice.cookie)
    assert.equal(saved.data.revision, 1)
    const stale = await request("/api/account/progress", "PUT", { data: progress, revision: 0 }, alice.cookie)
    assert.equal(stale.status, 409)
    const bob = await request("/api/account/register", "POST", { username: "Bob", password: "another-secret-123" })
    assert.equal(bob.status, 200)
    assert.equal((await request("/api/account/progress", "GET", undefined, bob.cookie)).data.data, null)
    assert.equal((await request("/api/account/progress", "GET", undefined, alice.cookie)).data.data.progress.first.attempts, 3)
    assert.equal((await request("/api/account/logout", "POST", undefined, alice.cookie)).status, 200)
    assert.equal((await request("/api/account/progress", "GET", undefined, alice.cookie)).status, 401)
    const login = await request("/api/account/login", "POST", { username: "alice", password: "very-secret-123" })
    assert.equal(login.status, 200)
    assert.equal((await request("/api/account/progress", "GET", undefined, login.cookie)).data.data.progress.first.attempts, 3)
    assert.equal((await request("/api/account/logout", "POST", undefined, login.cookie, "https://evil.example")).status, 403)
  } finally {
    child.kill()
    await once(child, "exit")
    await rm(directory, { recursive: true, force: true })
  }
})
