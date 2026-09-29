import { createServer } from "node:http"
import { sweepCache, synthesize } from "./tts.ts"
import { handleTranslate } from "./translate.ts"
import { handleAccountApi } from "./account-api.mjs"

const port = Number(process.env.PORT ?? 8787)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535")
}

let pending = 0
const maxPending = 12

const server = createServer((request, response) => {
  if (request.url?.startsWith("/api/account/")) {
    void handleAccountApi(request, response)
    return
  }
  let url
  try {
    url = new URL(request.url ?? "/", "http://127.0.0.1")
  } catch {
    response.writeHead(400).end()
    return
  }

  if (url.pathname === "/api/translate") {
    void handleTranslate(request, response, process.env.DEEPSEEK_API_KEY)
    return
  }
  if (url.pathname !== "/api/tts") {
    response.writeHead(404).end()
    return
  }
  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET" }).end()
    return
  }

  const text = url.searchParams.get("text")?.trim() ?? ""
  if (!text || text.length > 80) {
    response.writeHead(400).end()
    return
  }
  if (pending >= maxPending) {
    response.writeHead(429, { "Retry-After": "3" }).end()
    return
  }

  pending += 1
  void synthesize(text)
    .then((audio) => {
      response.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=180",
      })
      response.end(audio)
    })
    .catch((error) => {
      console.error("TTS request failed:", error)
      response.writeHead(502).end("tts failed")
    })
    .finally(() => {
      pending -= 1
    })
})

void sweepCache()
server.listen(port, "127.0.0.1", () => {
  console.log(`TTS API listening on 127.0.0.1:${port}`)
})
