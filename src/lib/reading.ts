import { getJyutpingList } from "to-jyutping"
import type { Part, Token } from "./types"

const syllable = /^[a-z]+[1-6]$/

/** One teaching word. Jyutping comes from the dictionary for this whole string, not from a hand-typed spelling. */
export function word(text: string, gloss: string): Token {
  if (!text) throw new Error("词不能是空的")

  const rows = getJyutpingList(text)
  const parts: Part[] = []
  for (const [char, reading] of rows) {
    if (!reading) throw new Error(`词典没有「${char}」的粤拼，出现在「${text}」`)
    const syllables = reading.split(/\s+/).filter(Boolean)
    if (syllables.length !== 1 || !syllable.test(syllables[0])) {
      throw new Error(`「${text}」里的「${char}」不是一字一音：${reading}`)
    }
    parts.push({ char, jyutping: syllables[0] })
  }

  const chars = Array.from(text)
  if (parts.length !== chars.length || parts.some((part, index) => part.char !== chars[index])) {
    throw new Error(`「${text}」和词典的切分对不上`)
  }

  return { gloss, parts }
}
