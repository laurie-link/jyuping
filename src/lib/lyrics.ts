import OpenCC from "opencc-js/cn2t"
import OpenCCTraditional from "opencc-js/t2cn"
import { getJyutpingList } from "to-jyutping"
import type { Lesson } from "./types"

const toTraditional = OpenCC.Converter({ from: "cn", to: "hk" })
const toSimplified = OpenCCTraditional.Converter({ from: "hk", to: "cn" })
const API = "https://lrclib.net/api"
const syllable = /^[a-z]+[1-6]$/

export type Song = {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

export type LyricPart = { char: string; jyutping: string | null }

function isSong(value: unknown): value is Song {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<Song>
  return typeof item.id === "number" && typeof item.trackName === "string" &&
    typeof item.artistName === "string"
}

async function request(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(response.status === 429 ? "搜索太频繁，请稍后再试。" : "歌词服务暂时不可用，请稍后再试。")
  return response.json()
}

export async function searchSongs(query: string, signal?: AbortSignal): Promise<Song[]> {
  const data = await request(`${API}/search?q=${encodeURIComponent(query.trim())}`, signal)
  if (!Array.isArray(data)) throw new Error("歌词服务返回了无法识别的结果。")
  return data.filter(isSong).filter((song) => !song.instrumental && Boolean(song.plainLyrics || song.syncedLyrics))
}

export async function getSong(id: number, signal?: AbortSignal): Promise<Song> {
  const data = await request(`${API}/get/${id}`, signal)
  if (!isSong(data)) throw new Error("这首歌的资料暂时无法读取。")
  return data
}

export function lyricLines(song: Song): string[] {
  const raw = song.plainLyrics || song.syncedLyrics || ""
  return raw.replace(/\r\n?/g, "\n").split("\n").map((line) =>
    line.replace(/^(?:\[\d{1,2}:\d{2}(?:\.\d+)?\])+\s*/, "").trim(),
  ).filter((line) => line && !/^\[[a-z]+:/i.test(line))
}

export function annotateLyric(line: string): LyricPart[] {
  const traditional = toTraditional(line)
  return getJyutpingList(traditional).map(([char, reading]) => {
    const syllables = (reading ?? "").split(/\s+/).filter((part) => syllable.test(part))
    return {
      char: toSimplified(char),
      jyutping: syllables[0] ?? null,
    }
  })
}

/** One lyric line is one sentence. Readings stay on the traditional form; the characters shown are simplified. */
export function songLesson(song: Song, lines: LyricPart[][]): Lesson {
  return {
    id: `lyric-${song.id}`,
    title: song.trackName,
    blurb: song.artistName,
    sentences: lines.flatMap((parts, index) => {
      const spoken = parts.flatMap((part) => (part.jyutping ? [{ char: part.char, jyutping: part.jyutping }] : []))
      if (spoken.length === 0) return []
      return [{
        id: `line-${index + 1}`,
        gloss: "",
        tokens: [{ gloss: "", parts: spoken }],
      }]
    }),
  }
}
