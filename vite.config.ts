import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { cantoneseTtsPlugin } from "./server/tts.ts"
import { handleTranslate } from "./server/translate.ts"

export default defineConfig(({ mode }) => ({
  plugins: [react(), cantoneseTtsPlugin(), {
    name: "translate-api",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/api/translate") return next()
        void handleTranslate(request, response, loadEnv(mode, process.cwd(), "").DEEPSEEK_API_KEY)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/api/translate") return next()
        void handleTranslate(request, response, loadEnv(mode, process.cwd(), "").DEEPSEEK_API_KEY)
      })
    },
  }],
}))
