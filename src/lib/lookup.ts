import OpenCC from "opencc-js/cn2t"
import { getJyutpingCandidates, getJyutpingList } from "to-jyutping"

const toTraditional = OpenCC.Converter({ from: "cn", to: "hk" })

export const LOOKUP_LIMIT = 40
const OTHER_LIMIT = 6
const syllable = /^[a-z]+[1-6]$/

export type LookupItem = {
  char: string
  readings: string[]
  others: string[]
  more: number
  missing: boolean
}

export type LookupResult = {
  traditional: string
  converted: boolean
  truncated: boolean
  items: LookupItem[]
  line: string
}

/** Look up the reading used by the rest of the app: Hong Kong traditional, whole word, first pronunciation. */
export function lookupReading(raw: string): LookupResult {
  const trimmed = raw.trim()
  const chars = Array.from(trimmed)
  const sliced = chars.slice(0, LOOKUP_LIMIT).join("")
  const traditional = sliced ? toTraditional(sliced) : ""
  const listed = traditional ? getJyutpingList(traditional) : []
  const candidates = traditional ? getJyutpingCandidates(traditional) : []
  const items: LookupItem[] = []

  for (let index = 0; index < listed.length; index += 1) {
    const [char, reading] = listed[index]
    if (!/\p{Script=Han}/u.test(char)) continue
    const primary = (reading ?? "").split(/\s+/).filter((part) => syllable.test(part))
    const primaryText = primary.join(" ")
    const pool = (candidates[index]?.[1] ?? []).filter(
      (item) => item !== primaryText && !primary.includes(item) && syllable.test(item),
    )
    items.push({
      char,
      readings: primary,
      others: pool.slice(0, OTHER_LIMIT),
      more: Math.max(0, pool.length - OTHER_LIMIT),
      missing: primary.length === 0,
    })
  }

  return {
    traditional,
    converted: Boolean(sliced) && traditional !== sliced,
    truncated: chars.length > LOOKUP_LIMIT,
    items,
    line: items.flatMap((item) => item.readings).join(" "),
  }
}
