import { useEffect, useRef, useState } from "react"
import { getLesson, nextLessonId } from "../data/lessons"
import { draftStatus, splitSyllables } from "../lib/judge"
import { pointsFor, sessionRating, worseGrade } from "../lib/score"
import { playSfx, primeAudio } from "../lib/sfx"
import { speakCantonese } from "../lib/speech"
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
  const [phase, setPhase] = useState<"typing" | "retype" | "feedback">("typing")
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
    if (phase === "typing" || phase === "retype") inputRef.current?.focus()
  }, [index, phase])

  useEffect(() => {
    if (phase !== "typing" || !step) return
    if (!loadStore().settings.autoPlay) return
    const text = step.promptParts.map((part) => part.char).join("")
    const timer = window.setTimeout(() => {
      void speakCantonese(text)
    }, 40)
    return () => window.clearTimeout(timer)
  }, [index, phase, step])

  useEffect(() => {
    if ((phase !== "feedback" && phase !== "retype") || !step) return
    if (!loadStore().settings.speakOnAnswer) return
    const text = step.promptParts.map((part) => part.char).join("")
    const timer = window.setTimeout(() => {
      void speakCantonese(text)
    }, 220)
    return () => window.clearTimeout(timer)
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
    const nextPhase = kind === "miss" ? "retype" : "feedback"
    phaseRef.current = nextPhase
    setPhase(nextPhase)
    setGrade(gradeName)
    setDraft("")
    setMessage(kind === "miss" ? "照着再打一遍，对了才能往下" : "")

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
      if (gradeName === "miss") playSfx("wrong")
      else if (nextCombo >= 3) playSfx("combo", nextCombo)
      else playSfx(gradeName)
    }
  }

  function onValue(value: string) {
    if ((phaseRef.current !== "typing" && phaseRef.current !== "retype") || !step) return
    const previous = draft.replace(/[^a-z1-6]/gi, "")
    const incoming = value.toLowerCase().replace(/[^a-z1-6]/g, "")
    if (incoming.length > previous.length && loadStore().settings.sound) playSfx("key")
    setDraft(incoming)
    setShake(false)
    if (draftStatus(incoming, stepExpected(step)) === "incomplete") {
      setMessage(phaseRef.current === "retype" ? "照着再打一遍，对了才能往下" : "")
    } else setMessage("按 Enter 确认")
  }

  function confirmAnswer() {
    if (phaseRef.current !== "typing" || !step) return
    const status = draftStatus(draft, stepExpected(step))
    if (status === "incomplete") {
      setMessage("先打完，再按 Enter 确认")
      setShake(true)
      return
    }
    if (status !== "match") {
      editedRef.current = true
      mistakesRef.current = true
      setMessage("不对，改完再按 Enter")
      setShake(true)
      if (loadStore().settings.sound) playSfx("wrong")
      return
    }
    finish("success")
  }

  function confirmRetype() {
    if (phaseRef.current !== "retype" || !step) return
    const status = draftStatus(draft, stepExpected(step))
    if (status === "incomplete") {
      setMessage("先打完，对了才能往下")
      setShake(true)
      return
    }
    if (status !== "match") {
      setMessage("不对，照着答案再打一遍")
      setShake(true)
      if (loadStore().settings.sound) playSfx("wrong")
      return
    }
    if (loadStore().settings.sound) playSfx("great")
    goNext()
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
      } else if (event.key === "Enter" && phaseRef.current === "retype") {
        if (event.target instanceof HTMLInputElement) return
        event.preventDefault()
        confirmRetype()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (steps.length === 0 || !step) {
    const upcoming = nextDue(loadStore())
    return (
      <div className="stage empty-stage">
        <button type="button" className="back" onClick={onExit}>
          返回主菜单
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
  const typedSlots = splitSyllables(draft)
  const slotCount = Math.max(step.promptParts.length, typedSlots.length)
  const lastSlot = typedSlots[typedSlots.length - 1] ?? ""
  const activeSlot =
    typedSlots.length === 0
      ? 0
      : /[1-6]$/.test(lastSlot)
        ? Math.min(typedSlots.length, slotCount - 1)
        : typedSlots.length - 1

  return (
    <div className="stage">
      <header className="stage-bar">
        <button type="button" className="back" onClick={leave}>
          返回主菜单
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

      <div className={phase === "retype" ? "play retype" : "play"}>
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

        {phase === "feedback" || phase === "retype" ? (
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
        {(phase === "feedback" || phase === "retype") && step.note && <p className="note">{step.note}</p>}
        <p className={message === "按 Enter 确认" ? "message hint" : "message"} role="status">
          {ime ? "请切换到英文输入法" : message}
          {phase === "feedback" && grade === "perfect" ? " Perfect" : ""}
          {phase === "feedback" && grade === "great" ? " Great" : ""}
          {phase === "feedback" && grade === "hard" ? " 声调或拼写改对了" : ""}
        </p>

        {(phase === "typing" || phase === "retype") && (
          <div className={shake ? "slots shake" : "slots"} onClick={() => inputRef.current?.focus()}>
            {Array.from({ length: slotCount }, (_, slotIndex) => {
              const value = typedSlots[slotIndex] ?? ""
              const active = slotIndex === activeSlot
              return (
                <span className={active ? "slot on" : "slot"} key={slotIndex}>
                  <b>
                    {value}
                    {active ? <i className="caret" /> : null}
                  </b>
                  <i className="rule" />
                </span>
              )
            })}
            <input
              ref={inputRef}
              value={draft}
              aria-label="粤拼输入"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              lang="en"
              onPointerDown={primeAudio}
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
                primeAudio()
                if (event.key === "Backspace" && draft.length > 0) {
                  editedRef.current = true
                  if (loadStore().settings.sound) playSfx("key")
                } else if (event.key === "Enter") {
                  event.preventDefault()
                  event.stopPropagation()
                  if (phaseRef.current === "retype") confirmRetype()
                  else confirmAnswer()
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
        {phase === "typing" || phase === "retype" ? (
          <>
            <button
              type="button"
              className="solid"
              onClick={phase === "retype" ? confirmRetype : confirmAnswer}
            >
              <kbd>Enter</kbd>
              {phase === "retype" ? (index + 1 >= steps.length ? "看结果" : "下一题") : "确认"}
            </button>
            {phase === "typing" && (
              <button type="button" onClick={() => finish("miss")}>
                <kbd>Ctrl</kbd>
                <kbd>;</kbd>
                显示答案
              </button>
            )}
          </>
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
