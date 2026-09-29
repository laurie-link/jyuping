import { useEffect, useMemo, useRef, useState } from "react"
import { getJyutpingList } from "to-jyutping"
import { speakCantonese } from "../lib/speech"
import { convertScript, dictionaryTranslation } from "../lib/translation"
import type { Direction, Script, Translation } from "../lib/translation"

type Props = { onBack: () => void }
type ShownResult = Translation & { original: string }

function annotatedCantonese(text: string, readings: Array<[string, string | null]>) {
  return Array.from(text).map((char, index) => {
    const reading = readings[index]?.[1]
    return /\p{Script=Han}/u.test(char) && reading
      ? <ruby key={index}>{char}<rt>{reading}</rt></ruby>
      : <span key={index}>{char}</span>
  })
}

export function Translate({ onBack }: Props) {
  const [direction, setDirection] = useState<Direction>("mandarin-to-cantonese")
  const [script, setScript] = useState<Script>("traditional")
  const [input, setInput] = useState("")
  const [result, setResult] = useState<ShownResult | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const requestId = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const toCantonese = direction === "mandarin-to-cantonese"
  const output = useMemo(() => result ? convertScript(result.original, script) : "", [result, script])
  const cantonese = result ? (toCantonese ? result.original : input.trim()) : ""
  const readings = useMemo(() => {
    if (!cantonese) return []
    return getJyutpingList(convertScript(cantonese, "traditional"))
  }, [cantonese])

  useEffect(() => () => controller.current?.abort(), [])

  function clearResult() {
    requestId.current += 1
    controller.current?.abort()
    controller.current = null
    setBusy(false)
    setResult(null)
    setError("")
    setCopied(false)
  }

  async function run() {
    const text = input.trim()
    clearResult()
    if (!text) return
    if (Array.from(text).length > 500) {
      setError("一次最多翻译 500 个字。")
      return
    }
    const local = dictionaryTranslation(text, direction)
    if (local) {
      setResult({ ...local, original: local.text })
      return
    }
    const id = requestId.current
    const abort = new AbortController()
    controller.current = abort
    setBusy(true)
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, direction }),
        signal: abort.signal,
      })
      const data = await response.json() as { text?: string; error?: string }
      if (id !== requestId.current) return
      if (!response.ok || !data.text) throw new Error(data.error || "翻译失败，请重试。")
      setResult({ original: data.text, text: data.text, source: "model" })
    } catch (cause) {
      if (id !== requestId.current || abort.signal.aborted) return
      setError(cause instanceof Error ? cause.message : "翻译失败，请重试。")
    } finally {
      if (id === requestId.current) {
        setBusy(false)
        controller.current = null
      }
    }
  }

  function swap() {
    const oldOutput = output
    clearResult()
    setDirection(toCantonese ? "cantonese-to-mandarin" : "mandarin-to-cantonese")
    if (oldOutput) setInput(oldOutput)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1700)
    } catch {
      setError("复制失败，请手动选择译文。")
    }
  }

  return (
    <div className="translate-page">
      <button type="button" className="back" onClick={onBack}>返回</button>
      <div className="translate-heading">
        <span className="plate-label">TRANSLATE / 03</span>
        <h2>普通话 <span>↔</span> 粤语</h2>
        <p>优先查本地词库，未收录时自动翻译。</p>
      </div>
      <div className="translate-toolbar">
        <span>{toCantonese ? "普通话" : "粤语白话"}</span>
        <button type="button" className="translate-swap" onClick={swap} aria-label="交换翻译方向">⇄</button>
        <span>{toCantonese ? "粤语白话" : "普通话"}</span>
        <div className="translate-script" role="group" aria-label="译文文字形式">
          <button type="button" className={script === "traditional" ? "on" : ""} onClick={() => setScript("traditional")}>繁體</button>
          <button type="button" className={script === "simplified" ? "on" : ""} onClick={() => setScript("simplified")}>简体</button>
        </div>
      </div>
      <div className="translate-grid">
        <form className="translate-card" onSubmit={(event) => { event.preventDefault(); void run() }}>
          <label htmlFor="translate-input">{toCantonese ? "普通话原文" : "粤语白话原文"}</label>
          {result && !toCantonese ? (
            <div className="translate-annotated translate-annotated-source">{annotatedCantonese(input.trim(), readings)}</div>
          ) : (
            <textarea id="translate-input" value={input} maxLength={500}
              placeholder={toCantonese ? "例如：我今天没有去那里，明天再来吧。" : "例如：我今日冇去嗰度，聽日先再嚟啦。"}
              onChange={(event) => { clearResult(); setInput(event.target.value) }}
              onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void run() } }} />
          )}
          <div className="translate-card-foot">
            <small>{result && !toCantonese ? "原文粤拼" : `${Array.from(input).length} / 500 · Ctrl+Enter 翻译`}</small>
            {result && !toCantonese
              ? <button className="ghost" type="button" onClick={clearResult}>修改原文</button>
              : <button className="solid" type="submit" disabled={!input.trim() || busy}>{busy ? "翻译中…" : "翻译"}</button>}
          </div>
        </form>
        <section className="translate-card translate-output" aria-live="polite">
          <div className="translate-result-head"><span>{toCantonese ? "粤语译文" : "普通话译文"}</span>{result && <small>{result.source === "dictionary" ? "本地词库" : "DeepSeek"}</small>}</div>
          {error ? <p className="translate-error" role="alert">{error}</p> : output ? (
            toCantonese
              ? <p className="translate-result translate-annotated">{annotatedCantonese(output, readings)}</p>
              : <p className="translate-result">{output}</p>
          ) : <p className="translate-placeholder">{busy ? "正在翻译…" : "译文会显示在这里"}</p>}
          {result && <div className="translate-card-foot"><button type="button" className="texty" onClick={() => void copy()}>{copied ? "已复制" : "复制译文"}</button>{cantonese && <button type="button" className="texty" onClick={() => void speakCantonese(convertScript(cantonese, "traditional"))}>朗读粤语 ↗</button>}</div>}
        </section>
      </div>
      <p className="translate-disclaimer">整句译文由模型生成，请核对地名、专名及语气。粤语文字上方的粤拼和朗读使用本站现有的本地标音与粤语语音。</p>
    </div>
  )
}
