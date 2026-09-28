import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { cantoneseTtsPlugin } from "./server/tts.ts"

export default defineConfig({
  plugins: [react(), cantoneseTtsPlugin()],
})
