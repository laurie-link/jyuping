import { useEffect, useRef, useState } from "react"
import { getLesson, nextLessonId } from "../data/lessons"
import { takeDraft } from "../lib/judge"
import { pointsFor, sessionRating, worseGrade } from "../lib/score"
import { playCue, speakCantonese } from "../lib/speech"
import { buildSteps, stepExpected, stepsFromCards } from "../lib/steps"
import {
  applyGrades,
  dueCards,
  formatDue,
  loadStore,
  markLesson,
  nextDue,
  saveStore,
  touchStreak,
} from "../lib/storage"
import { toneLabel, toneNumber } from "../lib/tones"
import type { CardSeed, GradeName, Step, SummaryData } from "../lib/types"

type Props = {
  mode: "lesson" | "review"
  lessonId?: string
  onExit: () => void
  onDone: (data: SummaryData) => void
}

const DIFFICULTY_LABEL = {
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级",
} as const

export function Practice({ mode, lessonId, onExit, onDone }: Props) {
  const lesson = lessonId ? getLesson(lessonId) : undefined
  const [steps] = useState<Step[]>(() => {
    const store = loadStore()
    if (mode === "review") return stepsFromCards(dueCards(store))
    if (!lesson) return []
    return buildSteps(lesson, store.settings.difficulty)
  })
  const [difficulty] = useState(() => loadStore().settings.difficulty)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<"typing" | "feedback">("typing")
  const [doneCount, setDoneCount] = useState(0)
  const [draft, setDraft] = useState("")
  const [message, setMessage] = useState("")
  const [combo, setCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [counts, setCounts] = useState({ perfect: 0, great: 0, hard: 0, miss: 0 })
  const [burst, setBurst] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [ime, setIme] = useState(false)
  const [grade, setGrade] = useState<GradeName | null>(null)

  const phaseRef = useRef(phase)
  const editedRef = useRef(false)
  const mistakesRef = useRef(false)
  const comboRef = useRef(0)
  const scoreRef = useRef(0)
  const bestRef = useRef(0)
  const countsRef = useRef(counts)
  const pendingRef = useRef(new Map<string, { seed: CardSeed; grade: GradeName }>())
  const persistedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const composingRef = useRef(false)
  const step = steps[index]

  phaseRef.current = phase

  useEffect(() => {
    if (phase === "typing") inputRef.current?.focus()
  }, [index, phase, doneCount])

  useEffect(() => {
    if (phase !== "typing" || !step) return
    if (!loadStore().settings.autoPlay) return
    speakCantonese(step.promptParts.map((part) => part.char).join(""))
  }, [index, phase, step])

  useEffect(() => {
    if (!burst) return
    const timer = window.setTimeout(() => setBurst(null), 760)
    return () => window.clearTimeout(timer)
  }, [burst])

  useEffect(() => {
    if (!shake) return
    const timer = window.setTimeout(() => setShake(false), 380)
    return () => window.clearTimeout(timer)
  }, [shake])

  function remember(current: Step, gradeName: GradeName) {
    for (const seed of current.seeds) {
      const previous = pendingRef.current.get(seed.id)
      pendingRef.current.set(seed.id, {
        seed,
        grade: previous ? worseGrade(previous.grade, gradeName) : gradeName,
      })
    }
  }

  function persist(completed: boolean) {
    if (persistedRef.current) return
    persistedRef.current = true
    let store = loadStore()
    store = applyGrades(store, [...pendingRef.current.values()])
    const total = countsRef.current.perfect + countsRef.current.great + countsRef.current.hard + countsRef.current.miss
    if (total > 0) store = touchStreak(store)
    if (completed && mode === "lesson" && lesson) {
      store = markLesson(store, lesson.id, sessionRating(countsRef.current))
    }
    saveStore(store)
  }

  function finish(kind: "success" | "miss") {
    if (phaseRef.current !== "typing" || !step) return
    const gradeName: GradeName =
      kind === "miss" ? "miss" : mistakesRef.current ? "hard" : editedRef.current ? "great" : "perfect"
    phaseRef.current = "feedback"
    setPhase("feedback")
    setGrade(gradeName)
    setDraft("")

    const nextCounts = { ...countsRef.current, [gradeName]: countsRef.current[gradeName] + 1 }
    countsRef.current = nextCounts
    setCounts(nextCounts)

    const nextCombo = gradeName === "miss" ? 0 : comboRef.current + 1
    comboRef.current = nextCombo
    setCombo(nextCombo)
    if (nextCombo > bestRef.current) bestRef.current = nextCombo
    if (gradeName !== "miss") {
      scoreRef.current += pointsFor(gradeName, nextCombo)
      setScore(scoreRef.current)
    }
    if (nextCombo >= 3) {
      const label = gradeName === "perfect" ? "Perfect" : gradeName === "great" ? "Great" : "Good"
      setBurst(`${label} × ${nextCombo}`)
    }
    remember(step, gradeName)
    if (loadStore().settings.sound) {
      playCue(gradeName === "miss" ? "bad" : nextCombo >= 3 ? "combo" : "ok")
    }
  }

  function onValue(value: string) {
    if (phaseRef.current !== "typing" || !step) return
    const expected = stepExpected(step).slice(doneCount)
    const result = takeDraft(value, expected)
    const nextDone = doneCount + result.lockedDelta
    setDoneCount(nextDone)
    setDraft(result.draft)

    if (result.toneExpected) {
      editedRef.current = true
      mistakesRef.current = true
      setMessage(`声调不对，是 ${result.toneExpected}`)
      setShake(true)
      if (loadStore().settings.sound) playCue("bad")
      return
    }
    if (result.wrongGot) {
      editedRef.current = true
      mistakesRef.current = true
      setMessage("还不对，再打一次")
      setShake(true)
      if (loadStore().settings.sound) playCue("bad")
      return
    }
    if (result.lockedDelta > 0) setMessage("")
    if (
      nextDone === step.promptParts.length &&
      result.draft === "" &&
      !result.toneExpected &&
      !result.wrongGot
    ) {
      finish("success")
    }
  }

  function goNext() {
    if (index + 1 >= steps.length) {
      persist(true)
      const total =
        countsRef.current.perfect +
        countsRef.current.great +
        countsRef.current.hard +
        countsRef.current.miss
      const summary: SummaryData = {
        title: mode === "review" ? "今日复习" : (lesson?.title ?? "练习"),
        rating: sessionRating(countsRef.current),
        score: scoreRef.current,
        bestCombo: bestRef.current,
        perfect: countsRef.current.perfect,
        great: countsRef.current.great,
        hard: countsRef.current.hard,
        miss: countsRef.current.miss,
        total,
        mode,
        lessonId: lesson?.id,
        nextLessonId: lesson ? nextLessonId(lesson.id) : undefined,
      }
      onDone(summary)
      return
    }
    editedRef.current = false
    mistakesRef.current = false
    phaseRef.current = "typing"
    setIndex((value) => value + 1)
    setPhase("typing")
    setDoneCount(0)
    setDraft("")
    setMessage("")
    setGrade(null)
    setShake(false)
  }

  function leave() {
    persist(false)
    onExit()
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === ";" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        finish("miss")
      } else if ((event.key === "'" || event.key === "Quote") && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        if (step) speakCantonese(step.promptParts.map((part) => part.char).join(""))
      } else if (event.key === "Enter" && phaseRef.current === "feedback") {
        event.preventDefault()
        goNext()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (steps.length === 0 || !step) {
    const upcoming = nextDue(loadStore())
    return (
      <div className="stage empty-stage">
        <button type="button" className="texty" onClick={onExit}>
          回首页
        </button>
        <h1>{mode === "review" ? "这会儿没有到期的" : "这课还没准备好"}</h1>
        <p className="lede">
          {upcoming
            ? `下一张在${formatDue(upcoming.due)}。先去练一课新的也行。`
            : "答得稳的词会隔一阵再出现。先去练一课新的。"}
        </p>
      </div>
    )
  }

  const prompt = step.promptParts.map((part) => part.char).join("")
  const showContext = step.contextEnd - step.contextStart < Array.from(step.contextChars).length
  const locked = step.promptParts.slice(0, doneCount)

  return (
    <div className="stage">
      <header className="stage-bar">
        <button type="button" className="texty" onClick={leave}>
          粤拼记
        </button>
        <div className="stage-title">
          <strong>{mode === "review" ? "今日复习" : lesson?.title}</strong>
          <span>{mode === "review" ? "到期的卡片" : DIFFICULTY_LABEL[difficulty]}</span>
        </div>
        <div className="stage-score">
          <span>
            {index + 1}/{steps.length}
          </span>
          <b>{score}</b>
          {combo > 1 && <em>{combo} 连击</em>}
        </div>
      </header>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${((index + (phase === "feedback" ? 1 : 0)) / steps.length) * 100}%` }} />
      </div>

      <div className="play">
        {burst && <div className="burst">{burst}</div>}
        {showContext && (
          <p className="context" aria-hidden="true">
            {Array.from(step.contextChars).map((char, charIndex) => (
              <span
                key={`${char}-${charIndex}`}
                className={charIndex >= step.contextStart && charIndex < step.contextEnd ? "on" : ""}
              >
                {char}
              </span>
            ))}
          </p>
        )}

        {phase === "feedback" ? (
          <div className="ruby-row">
            {step.promptParts.map((part, partIndex) => (
              <span className="ruby" key={`${part.jyutping}-${partIndex}`}>
                <code data-tone={toneNumber(part.jyutping)}>{part.jyutping}</code>
                <b>{part.char}</b>
                <small>{toneLabel(part.jyutping)}</small>
              </span>
            ))}
          </div>
        ) : (
          <h1 className="prompt">{prompt}</h1>
        )}

        <p className="gloss">{step.gloss}</p>
        {phase === "feedback" && step.note && <p className="note">{step.note}</p>}
        <p className="message" role="status">
          {ime ? "请切换到英文输入法" : message}
          {phase === "feedback" && grade === "miss" ? " 先看清楚再往下。" : ""}
          {phase === "feedback" && grade === "perfect" ? " Perfect" : ""}
          {phase === "feedback" && grade === "great" ? " Great" : ""}
          {phase === "feedback" && grade === "hard" ? " 声调或拼写改对了" : ""}
        </p>

        {phase === "typing" && (
          <div className="entry" onClick={() => inputRef.current?.focus()}>
            {locked.map((part, partIndex) => (
              <span className="chip" data-tone={toneNumber(part.jyutping)} key={`${part.jyutping}-${partIndex}`}>
                {part.jyutping}
              </span>
            ))}
            <input
              ref={inputRef}
              className={shake ? "shake" : ""}
              value={draft}
              aria-label="粤拼输入"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              lang="en"
              placeholder={locked.length === 0 ? "打粤拼，声调打 1 到 6" : ""}
              onChange={(event) => {
                if (!composingRef.current) onValue(event.target.value)
              }}
              onCompositionStart={() => {
                composingRef.current = true
                setIme(true)
              }}
              onCompositionEnd={(event) => {
                composingRef.current = false
                setIme(false)
                onValue(event.currentTarget.value)
              }}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && draft === "" && doneCount > 0) {
                  event.preventDefault()
                  editedRef.current = true
                  setDoneCount((count) => count - 1)
                } else if (event.key === "Enter") {
                  event.preventDefault()
                  event.stopPropagation()
                  if (doneCount === step.promptParts.length && cleanEnough(draft)) finish("success")
                  else finish("miss")
                }
              }}
            />
          </div>
        )}
      </div>

      <footer className="keys">
        <button type="button" onClick={() => speakCantonese(prompt)}>
          <kbd>Ctrl</kbd>
          <kbd>'</kbd>
          读出来
        </button>
        {phase === "typing" ? (
          <button type="button" onClick={() => finish("miss")}>
            <kbd>Ctrl</kbd>
            <kbd>;</kbd>
            显示答案
          </button>
        ) : (
          <button type="button" className="solid" onClick={goNext}>
            <kbd>Enter</kbd>
            {index + 1 >= steps.length ? "看结果" : "下一题"}
          </button>
        )}
        <p>1 阴平 · 2 阴上 · 3 阴去 · 4 阳平 · 5 阳上 · 6 阳去</p>
      </footer>
    </div>
  )
}

function cleanEnough(draft: string): boolean {
  return draft.replace(/[^a-z1-6]/gi, "") === ""
}
