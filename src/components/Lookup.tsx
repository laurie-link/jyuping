import { useEffect, useMemo, useRef, useState } from "react"
import { lookupReading } from "../lib/lookup"
import { speakCantonese } from "../lib/speech"
import { toneLabel, toneNumber } from "../lib/tones"

type Props = {
  onBack: () => void
}

export function Lookup({ onBack }: Props) {
  const [text, setText] = useState("")
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle")
  const inputRef = useRef<HTMLInputElement>(null)
  const result = useMemo(() => lookupReading(text), [text])
  const hasQuery = text.trim().length > 0

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (copyState === "idle") return
    const timer = window.setTimeout(() => setCopyState("idle"), 1500)
    return () => window.clearTimeout(timer)
  }, [copyState])

  function speak() {
    if (!result.line) return
    void speakCantonese(result.traditional)
  }

  async function copyLine() {
    if (!result.line) return
    try {
      await navigator.clipboard.writeText(result.line)
      setCopyState("done")
    } catch {
      setCopyState("failed")
    }
  }

  return (
    <>
      <button type="button" className="back" onClick={onBack}>
        返回
      </button>
      <div className="panel-head section-open">
        <h2>查字</h2>
        <p>一个字查这个字。几个字连着打，按词来读。</p>
      </div>
      <form
        className="lookup-bar"
        onSubmit={(event) => {
          event.preventDefault()
          speak()
        }}
      >
        <input
          ref={inputRef}
          value={text}
          placeholder="输入字或词，简体繁体都行"
          aria-label="要查的字"
          onChange={(event) => {
            setCopyState("idle")
            setText(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault()
          }}
        />
        <button type="submit" className="solid" disabled={!result.line}>
          读出来
        </button>
      </form>
      {result.converted && <p className="lookup-note">按繁体「{result.traditional}」来查。</p>}
      {result.truncated && <p className="lookup-note">只查前 40 个字。</p>}
      {hasQuery && result.items.length === 0 && <p className="lookup-note">这里没有能查的字。</p>}
      {result.line && (
        <p className="lookup-line">
          {result.items.map((item, index) =>
            item.readings.map((reading, readingIndex) => (
              <code key={`${index}-${readingIndex}`} data-tone={toneNumber(reading)}>
                {reading}
              </code>
            )),
          )}
          <button type="button" className="texty" onClick={() => void copyLine()}>
            {copyState === "done" ? "已复制" : copyState === "failed" ? "复制没成功" : "复制粤拼"}
          </button>
        </p>
      )}
      {result.items.length > 0 && (
        <ol className="lookup-list">
          {result.items.map((item, index) => (
            <li key={`${item.char}-${index}`}>
              <b>{item.char}</b>
              <div>
                <span className="lookup-read">
                  {item.missing ? (
                    <em>词典没有</em>
                  ) : (
                    item.readings.map((reading) => (
                      <span key={reading}>
                        <code data-tone={toneNumber(reading)}>{reading}</code>
                        <small>{toneLabel(reading)}</small>
                      </span>
                    ))
                  )}
                </span>
                {item.others.length > 0 && (
                  <span className="lookup-others">
                    <small>其他读法</small>
                    {item.others.map((reading) => (
                      <code key={reading} data-tone={toneNumber(reading)}>
                        {reading}
                      </code>
                    ))}
                    {item.more > 0 && <small>还有 {item.more} 个</small>}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
