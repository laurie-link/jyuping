import { createHash } from "node:crypto"
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"
import type { Connect, Plugin } from "vite"

const VOICE = "zh-HK-HiuGaaiNeural"
const CACHE_TTL_MS = 3 * 60 * 1000
const cacheDir = path.resolve(".cache/tts")
const expiryTimers = new Map<string, NodeJS.Timeout>()
let queue: Promise<unknown> = Promise.resolve()

function cacheFile(text: string): string {
  return path.join(cacheDir, `${createHash("sha1").update(`${VOICE}\n${text}`).digest("hex")}.mp3`)
}

async function deleteAtMtime(file: string, mtimeMs: number) {
  try {
    const info = await stat(file)
    if (Math.abs(info.mtimeMs - mtimeMs) > 5) return
    await unlink(file)
  } catch {
    // already gone
  }
}

function scheduleDeletion(file: string, delay: number, mtimeMs: number) {
  const existing = expiryTimers.get(file)
  if (existing) clearTimeout(existing)
  const run = () => {
    expiryTimers.delete(file)
    void deleteAtMtime(file, mtimeMs)
  }
  if (delay <= 0) {
    run()
    return
  }
  const timer = setTimeout(run, delay)
  timer.unref()
  expiryTimers.set(file, timer)
}

async function sweepCache() {
  let names: string[]
  try {
    names = await readdir(cacheDir)
  } catch {
    return
  }
  const now = Date.now()
  await Promise.all(
    names.map(async (name) => {
      if (!name.endsWith(".mp3")) return
      const file = path.join(cacheDir, name)
      try {
        const info = await stat(file)
        scheduleDeletion(file, CACHE_TTL_MS - (now - info.mtimeMs), info.mtimeMs)
      } catch {
        // already removed
      }
    }),
  )
}

async function readCache(text: string): Promise<Buffer | undefined> {
  const file = cacheFile(text)
  try {
    const info = await stat(file)
    if (Date.now() - info.mtimeMs >= CACHE_TTL_MS) {
      const pending = expiryTimers.get(file)
      if (pending) clearTimeout(pending)
      expiryTimers.delete(file)
      await unlink(file).catch(() => undefined)
      return undefined
    }
    return await readFile(file)
  } catch {
    return undefined
  }
}

async function writeCache(text: string, audio: Buffer) {
  const file = cacheFile(text)
  await mkdir(cacheDir, { recursive: true })
  await writeFile(file, audio)
  const info = await stat(file)
  scheduleDeletion(file, CACHE_TTL_MS, info.mtimeMs)
}

async function fetchAudio(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS()
  try {
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(text, { rate: "-8%" })
    const chunks: Buffer[] = []
    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const audio = Buffer.concat(chunks)
    if (audio.length < 200) throw new Error("empty audio")
    return audio
  } finally {
    tts.close()
  }
}

function synthesize(text: string): Promise<Buffer> {
  const run = async () => {
    const cached = await readCache(text)
    if (cached) return cached
    const audio = await fetchAudio(text)
    await writeCache(text, audio)
    return audio
  }
  const task = queue.then(run, run)
  queue = task.then(
    () => undefined,
    () => undefined,
  )
  return task
}

function attach(middlewares: Connect.Server) {
  middlewares.use((request, response, next) => {
    const url = request.url ?? ""
    if (!url.startsWith("/api/tts")) {
      next()
      return
    }
    const text = new URL(url, "http://127.0.0.1").searchParams.get("text")?.trim().slice(0, 80) ?? ""
    if (!text) {
      response.statusCode = 400
      response.end()
      return
    }
    void sweepCache()
      .then(() => synthesize(text))
      .then((audio) => {
        response.setHeader("Content-Type", "audio/mpeg")
        response.setHeader("Cache-Control", "private, max-age=180")
        response.end(audio)
      })
      .catch((error: unknown) => {
        response.statusCode = 502
        response.end(error instanceof Error ? error.message : "tts failed")
      })
  })
}

export function cantoneseTtsPlugin(): Plugin {
  return {
    name: "cantonese-tts",
    configureServer(server) {
      attach(server.middlewares)
      void sweepCache()
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
      void sweepCache()
    },
  }
}
