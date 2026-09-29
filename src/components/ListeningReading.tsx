import { useEffect, useMemo, useRef, useState } from "react"
import { Practice } from "./Practice"
import { Summary } from "./Summary"
import { annotateLyric, getSong, lyricLines, searchSongs, songLesson } from "../lib/lyrics"
import type { Song } from "../lib/lyrics"
import { back, clearSummary, go, isEscape, loadSummary, replaceRoute, saveSummary } from "../lib/route"
import type { Route } from "../lib/route"
import { speakCantonese } from "../lib/speech"
import { toneNumber } from "../lib/tones"

type Props = { route: Extract<Route, { name: "lyrics" }> }

function duration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return ""
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

function songRoute(songId: number, drill: null | "copy" | "practice" = null, done = false): Route {
  return { name: "lyrics", query: "", songId, drill, done }
}

export function ListeningReading({ route }: Props) {
  const [query, setQuery] = useState(route.query)
  const [searched, setSearched] = useState(Boolean(route.query))
  const [results, setResults] = useState<Song[]>([])
  const [selected, setSelected] = useState<Song | null>(null)
  const [loading, setLoading] = useState(Boolean(route.query) || route.songId !== null)
  const [error, setError] = useState("")
  const selectedIdRef = useRef<number | null>(null)
  const lines = useMemo(() => selected ? lyricLines(selected).map(annotateLyric) : [], [selected])
  const lesson = useMemo(() => selected ? songLesson(selected, lines) : null, [selected, lines])
  const summary = route.done ? loadSummary() : null
  const showingSummary = Boolean(route.drill && lesson && route.songId !== null && summary?.lessonId === `lyric-${route.songId}`)
  const showingPractice = Boolean(route.drill && lesson && route.songId !== null && !showingSummary)

  useEffect(() => {
    setQuery(route.query)
  }, [route.query])

  useEffect(() => {
    if (route.songId !== null) return
    if (!route.query) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setSearched(true)
    setLoading(true)
    setError("")
    setResults([])
    searchSongs(route.query, controller.signal).then((songs) => {
      if (!controller.signal.aborted) setResults(songs)
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "搜索失败，请稍后再试。")
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [route.query, route.songId])

  useEffect(() => {
    if (route.songId === null) {
      selectedIdRef.current = null
      setSelected(null)
      return
    }
    if (selectedIdRef.current === route.songId) return
    const controller = new AbortController()
    const songId = route.songId
    setLoading(true)
    setError("")
    getSong(songId, controller.signal).then((song) => {
      if (controller.signal.aborted) return
      selectedIdRef.current = song.id
      setSelected(song)
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "歌词读取失败，请稍后再试。")
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [route.songId])

  useEffect(() => {
    if (!route.done || route.songId === null) return
    const saved = loadSummary()
    if (saved?.lessonId === `lyric-${route.songId}`) return
    replaceRoute(songRoute(route.songId, route.drill, false))
  }, [route.done, route.songId, route.drill])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!isEscape(event) || event.defaultPrevented || showingPractice) return
      event.preventDefault()
      if (showingSummary && route.songId !== null) {
        clearSummary()
        back(songRoute(route.songId))
        return
      }
      back(route.songId === null ? { name: "home" } : { name: "lyrics", query: "", songId: null, drill: null, done: false })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showingPractice, showingSummary, route.songId])

  function search(value: string) {
    const term = value.trim()
    if (!term) return
    setQuery(term)
    go({ name: "lyrics", query: term, songId: null, drill: null, done: false })
  }

  function openSong(song: Song) {
    selectedIdRef.current = song.id
    setSelected(song)
    setError("")
    setLoading(false)
    go(songRoute(song.id))
  }

  function leaveSong() {
    back(route.songId === null
      ? { name: "home" }
      : { name: "lyrics", query: "", songId: null, drill: null, done: false })
  }

  if (route.drill && lesson && route.songId !== null && summary?.lessonId === `lyric-${route.songId}`) {
    return (
      <div className="lyric-drill">
        <Summary
          data={summary}
          onAgain={() => replaceRoute(songRoute(route.songId!, route.drill, false))}
          onHome={() => {
            clearSummary()
            back(songRoute(route.songId!))
          }}
          onReview={() => {
            clearSummary()
            go({ name: "review" })
          }}
          homeLabel="返回歌词"
        />
      </div>
    )
  }

  if (route.drill && lesson && route.songId !== null) {
    return (
      <div className="lyric-drill">
        <Practice
          key={`${route.drill}:${lesson.id}`}
          mode="lesson"
          lesson={lesson}
          showReading={route.drill === "copy"}
          validateEachSlot={route.drill === "copy"}
          lineByLine
          exitLabel="返回歌词"
          subtitle={route.drill === "copy" ? "抄写" : "练习"}
          onExit={() => back(songRoute(route.songId!))}
          onDone={(data) => {
            saveSummary(data)
            replaceRoute(songRoute(route.songId!, route.drill, true))
          }}
        />
      </div>
    )
  }

  if (route.songId !== null && !selected) {
    return (
      <>
        <button type="button" className="back" onClick={leaveSong}>返回</button>
        <p className="lookup-note" role={error ? "alert" : "status"}>{error || "正在读取…"}</p>
      </>
    )
  }

  return (
    <>
      <button type="button" className="back" onClick={leaveSong}>
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
        <form className="lookup-bar" onSubmit={(event) => { event.preventDefault(); search(query) }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜歌名或歌手，例如：富士山下"
            aria-label="搜索歌曲"
          />
          <button type="submit" className="solid" disabled={!query.trim() || loading}>搜歌词</button>
        </form>
      )}

      {!selected && !searched && (
        <div className="song-discovery">
          <div>
            <span className="plate-label">从一首熟悉的歌开始</span>
            <strong>听过的旋律，<br />现在也能读出来。</strong>
            <p>选一首歌，看歌词和粤拼；想记住时，切到抄写或练习。</p>
          </div>
          <div className="song-suggestions">
            <span>试着搜索</span>
            {["富士山下", "海阔天空", "喜帖街"].map((term) => (
              <button type="button" key={term} onClick={() => search(term)}>{term}<span aria-hidden="true">↗</span></button>
            ))}
          </div>
        </div>
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
                <button type="button" onClick={() => openSong(song)}>
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
            <button type="button" className="solid" disabled={!lesson?.sentences.length} onClick={() => go(songRoute(selected.id, "copy"))}>抄写</button>
            <button type="button" className="ghost" disabled={!lesson?.sentences.length} onClick={() => go(songRoute(selected.id, "practice"))}>练习</button>
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
