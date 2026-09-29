import OpenCCToTraditional from "opencc-js/cn2t"
import OpenCCToSimplified from "opencc-js/t2cn"
import { commonLessons } from "../data/common-words"

export type Direction = "mandarin-to-cantonese" | "cantonese-to-mandarin"
export type Script = "simplified" | "traditional"
export type Translation = { text: string; source: "dictionary" | "model" }

const toTraditional = OpenCCToTraditional.Converter({ from: "cn", to: "hk" })
const openccToSimplified = OpenCCToSimplified.Converter({ from: "hk", to: "cn" })
// OpenCC maps the common Cantonese 嗰 to the rare 𠮶; keep the familiar glyph in the UI.
const toSimplified = (text: string) => openccToSimplified(text).replaceAll("𠮶", "嗰")
const mandarinToCantonese = new Map<string, string>()
const cantoneseToMandarin = new Map<string, string>()

for (const lesson of commonLessons) {
  for (const sentence of lesson.sentences) {
    const written = sentence.tokens.flatMap((token) => token.parts.map((part) => part.char)).join("")
    const gloss = sentence.gloss.trim()
    if (!written || !gloss || Array.from(written).length > 4 || Array.from(gloss).length > 6) continue
    const key = toSimplified(gloss)
    if (!mandarinToCantonese.has(key)) mandarinToCantonese.set(key, written)
    if (!cantoneseToMandarin.has(written)) cantoneseToMandarin.set(written, gloss)
  }
}

// Prefer common spoken equivalents where a frequency list has several possible senses.
const spokenPairs: Array<[string, string]> = [
  ["不是", "唔係"], ["没有", "冇"], ["什么", "乜嘢"], ["为什么", "點解"],
  ["哪里", "邊度"], ["现在", "而家"], ["喜欢", "鍾意"], ["知道", "知"],
  ["他们", "佢哋"], ["我们", "我哋"], ["你们", "你哋"], ["谢谢", "多謝"],
]
for (const [mandarin, cantonese] of spokenPairs) {
  mandarinToCantonese.set(mandarin, cantonese)
  cantoneseToMandarin.set(cantonese, mandarin)
}

export function isShortEntry(text: string) {
  const chars = Array.from(text.trim())
  return chars.length <= 6 && chars.every((char) => /\p{Script=Han}/u.test(char))
}

export function convertScript(text: string, script: Script) {
  return script === "traditional" ? toTraditional(text) : toSimplified(text)
}

export function dictionaryTranslation(raw: string, direction: Direction): Translation | null {
  const text = raw.trim()
  if (!isShortEntry(text)) return null
  const translated = direction === "mandarin-to-cantonese"
    ? mandarinToCantonese.get(toSimplified(text))
    : cantoneseToMandarin.get(toTraditional(text))
  if (!translated) return null
  return { text: translated, source: "dictionary" }
}
