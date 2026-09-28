export type DraftResult = {
  lockedDelta: number
  draft: string
  toneExpected?: string
  wrongGot?: string
}

export function cleanDraft(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z1-6]/g, "")
}

/** Split typed Jyutping into syllables. A tone digit closes a syllable. Nothing is checked. */
export function splitSyllables(raw: string): string[] {
  const clean = raw.toLowerCase().replace(/[^a-z1-6]/g, "")
  const parts: string[] = []
  let current = ""
  for (const char of clean) {
    current += char
    if (/[1-6]/.test(char)) {
      parts.push(current)
      current = ""
    }
  }
  if (current) parts.push(current)
  return parts
}

/** Incomplete until every expected syllable has letters and a tone. Match is only for the Enter check. */
export function draftStatus(raw: string, expected: string[]): "incomplete" | "filled" | "match" {
  const typed = splitSyllables(raw)
  const closed = typed.length > 0 && typed.every((part) => /^[a-z]+[1-6]$/.test(part))
  if (!closed || typed.length !== expected.length) return "incomplete"
  if (typed.every((part, index) => part === expected[index])) return "match"
  return "filled"
}

/** Empty slot means incomplete. Anything in every slot can be judged. Nothing here checks tones while typing. */
export function slotsStatus(slots: string[], expected: string[]): "incomplete" | "filled" | "match" {
  if (slots.length !== expected.length || slots.some((part) => part.length === 0)) return "incomplete"
  if (slots.every((part, index) => part === expected[index])) return "match"
  return "filled"
}

/** Consume a typed draft against the remaining expected syllables. */
export function takeDraft(raw: string, expected: string[]): DraftResult {
  let rest = cleanDraft(raw)
  let locked = 0

  while (locked < expected.length && rest.length > 0) {
    const exp = expected[locked]
    if (rest.startsWith(exp)) {
      rest = rest.slice(exp.length)
      locked += 1
      continue
    }
    if (exp.startsWith(rest)) break

    const body = exp.slice(0, -1)
    const tone = exp.slice(-1)
    const closedTone = rest[body.length]
    if (
      body.length > 0 &&
      rest.startsWith(body) &&
      closedTone !== undefined &&
      /[1-6]/.test(closedTone) &&
      closedTone !== tone
    ) {
      return { lockedDelta: locked, draft: "", toneExpected: exp }
    }
    if (/[1-6]$/.test(rest)) {
      return { lockedDelta: locked, draft: "", wrongGot: rest }
    }
    break
  }

  return { lockedDelta: locked, draft: rest }
}
