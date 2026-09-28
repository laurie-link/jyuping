export type DraftResult = {
  lockedDelta: number
  draft: string
  toneExpected?: string
  wrongGot?: string
}

export function cleanDraft(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z1-6]/g, "")
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
