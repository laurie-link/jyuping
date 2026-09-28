import { useEffect, useMemo, useRef, useState } from "react"
import { Practice } from "./Practice"
import { Summary } from "./Summary"
import { annotateLyric, getSong, lyricLines, searchSongs, songLesson } from "../lib/lyrics"
import type { Song } from "../lib/lyrics"
import { speakCantonese } from "../lib/speech"
import { toneNumber } from "../lib/tones"
import type { SummaryData } from "../lib/types"

type Props = { onBack: () => void; onReview: () => void }
type Drill = "copy" | "practice"

function duration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return ""
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

export function ListeningReading({ onBack, onReview }: Props) {
  const [query, setQuery] = useState("")
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<Song[]>([])
  const [selected, setSelected] = useState<Song | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [drill, setDrill] = useState<Drill | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const lines = useMemo(() => selected ? lyricLines(selected).map(annotateLyric) : [], [selected])
  const lesson = useMemo(() => selected ? songLesson(selected, lines) : null, [selected, lines])

  useEffect(() => () => requestRef.current?.abort(), [])

  async function search(value: string) {
    const term = value.trim()
    if (!term) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setSelected(null)
    setResults([])
    setSearched(true)
    setLoading(true)
    setError("")
    try {
      setResults(await searchSongs(term, controller.signal))
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "搜索失败，请稍后再试。")
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  async function openSong(song: Song) {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setSelected(null)
    setLoading(true)
    setError("")
    try {
      setSelected(await getSong(song.id, controller.signal))
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "歌词读取失败，请稍后再试。")
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  if (drill && lesson && summary) {
    return (
      <div className="lyric-drill">
        <Summary
          data={summary}
          onAgain={() => setSummary(null)}
          onHome={() => { setSummary(null); setDrill(null) }}
          onReview={onReview}
          homeLabel="返回歌词"
        />
      </div>
    )
  }

  if (drill && lesson) {
    return (
      <div className="lyric-drill">
        <Practice
          key={`${drill}:${lesson.id}`}
          mode="lesson"
          lesson={lesson}
          showReading={drill === "copy"}
          validateEachSlot={drill === "copy"}
          lineByLine
          exitLabel="返回歌词"
          subtitle={drill === "copy" ? "抄写" : "练习"}
          onExit={() => setDrill(null)}
          onDone={setSummary}
        />
      </div>
    )
  }

  return (
    <>
      <button type="button" className="back" onClick={selected ? () => setSelected(null) : onBack}>
        {selected ? "返回搜索结果" : "返回"}
      </button>
      <div className="panel-head section-open">
        <div>
          <p className="eyebrow">听读 / 粤语歌词</p>
          <h2>{selected ? selected.trackName : "粤语歌词"}</h2>
        </div>
        <p>{selected ? selected.artistName : "搜歌名或歌手，跟着粤拼读歌词。"}</p>
      </div>

      {!selected && (
        <form className="lookup-bar" onSubmit={(event) => { event.preventDefault(); void search(query) }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜歌名或歌手，例如：富士山下"
            aria-label="搜索歌曲"
          />
          <button type="submit" className="solid" disabled={!query.trim() || loading}>搜歌词</button>
        </form>
      )}

      {loading && <p className="lookup-note" role="status">正在读取…</p>}
      {error && <p className="lookup-note" role="alert">{error}</p>}
      {!selected && searched && !loading && !error && results.length === 0 && (
        <p className="lookup-note">没有找到带歌词的歌曲。试试繁体歌名、简体歌名或歌手名。</p>
      )}
      {!selected && results.length > 0 && (
        <div className="song-results">
          <p className="lookup-note">找到 {results.length} 首带歌词的歌曲</p>
          <ol>
            {results.map((song) => (
              <li key={song.id}>
                <button type="button" onClick={() => void openSong(song)}>
                  <span>
                    <strong>{song.trackName}</strong>
                    <em>{song.artistName}{song.albumName ? ` · ${song.albumName}` : ""}</em>
                  </span>
                  <span className="song-duration">{duration(song.duration)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {selected && (
        <>
          <div className="lyric-modes">
            <button type="button" className="solid" disabled={!lesson?.sentences.length} onClick={() => setDrill("copy")}>抄写</button>
            <button type="button" className="ghost" disabled={!lesson?.sentences.length} onClick={() => setDrill("practice")}>练习</button>
          </div>
          <p className="lookup-note">抄写看着粤拼打，每格写对才能继续；练习不看粤拼，仍按整句判断。</p>
          {lines.length === 0 ? (
            <p className="lookup-note">这首歌暂时没有可显示的歌词。</p>
          ) : (
            <div className="lyric-sheet" aria-label={`${selected.trackName} 歌词和粤拼`}>
              {lines.map((parts, lineIndex) => (
                <div className="lyric-row" key={lineIndex}>
                  <p className="lyric-line">
                    {parts.map((part, partIndex) => (
                      /\p{Script=Han}/u.test(part.char) ? (
                        <ruby key={partIndex}>
                          {part.char}<rt data-tone={toneNumber(part.jyutping ?? "")}>{part.jyutping ?? "·"}</rt>
                        </ruby>
                      ) : <span key={partIndex} className="lyric-punctuation">{part.char}</span>
                    ))}
                  </p>
                  <button type="button" className="lyric-speak" aria-label={`朗读第 ${lineIndex + 1} 行`} onClick={() => void speakCantonese(parts.map((part) => part.char).join(""))}>朗读</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
