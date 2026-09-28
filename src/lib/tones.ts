export const TONE_NAME = ["", "阴平", "阴上", "阴去", "阳平", "阳上", "阳去"]

export function toneNumber(jyutping: string): number {
  const n = Number(jyutping.slice(-1))
  return n >= 1 && n <= 6 ? n : 0
}

export function toneLabel(jyutping: string): string {
  const tone = toneNumber(jyutping)
  const checked = /[ptk][1-6]$/.test(jyutping)
  const name = TONE_NAME[tone] ?? ""
  return checked ? `${name} · 入声` : name
}
