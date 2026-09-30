import { useEffect, useRef, useState } from "react"
import { getLesson, nextLessonId } from "../data/lessons"
import { slotsStatus } from "../lib/judge"
import { pointsFor, sessionRating, worseGrade } from "../lib/score"
import { playSfx, primeAudio } from "../lib/sfx"
import { speakCantonese } from "../lib/speech"
import { buildSteps, stepExpected, stepsFromCards } from "../lib/steps"
import {
  applyGrades,
  dueCards,
  formatDue,
  lessonAttempts,
  lessonCursor,
  loadStore,
  markLesson,
  nextDue,
  noteAttempt,
  saveCursor,
  saveStore,
  touchStreak,
} from "../lib/storage"
import { isEscape } from "../lib/route"
import { toneLabel, toneNumber } from "../lib/tones"
import type { CardSeed, GradeName, Lesson, Step, SummaryData } from "../lib/types"

type Props = {
  mode: "lesson" | "review"
  lessonId?: string
  lesson?: Lesson
  showReading?: boolean
  validateEachSlot?: boolean
  lineByLine?: boolean
  exitLabel?: string
  subtitle?: string
  onExit: () => void
  onDone: (data: SummaryData) => void
}

const DIFFICULTY_LABEL = {
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级",
} as const

/** keyCode 229 / Process means a Chinese IME ate the key. A visible a–z / 1–6 key did not. */
function swallowedByIme(event: { key: string; keyCode: number; nativeEvent: { keyCode: number } }): boolean {
  if (/^[a-z1-6]$/i.test(event.key)) return false
  const code = event.nativeEvent.keyCode || event.keyCode
  return code === 229 || event.key === "Process" || event.key === "Unidentified"
}

function nonJyutping(value: string): boolean {
  return /[^a-z1-6\s]/i.test(value)
}

function isSpaceText(value: string | null | undefined): boolean {
  return !!value && /^[\s\u00a0\u3000]+$/.test(value)
}

export function Practice({
  mode,
  lessonId,
  lesson: lessonOverride,
  showReading = false,
  validateEachSlot = false,
  lineByLine = false,
  exitLabel = "返回主菜单",
  subtitle,
  onExit,
  onDone,
}: Props) {
  const lesson = lessonOverride ?? (lessonId ? getLesson(lessonId) : undefined)
  const tracksProgress = mode === "lesson" && !lessonOverride && Boolean(lesson)

  function openingIndex(total: number) {
    if (!tracksProgress || !lesson || total <= 0) return 0
    const saved = lessonCursor(loadStore(), lesson.id, lineByLine ? "advanced" : loadStore().settings.difficulty)
    return saved < total ? saved : 0
  }

  const [steps] = useState<Step[]>(() => {
    const store = loadStore()
    if (mode === "review") return stepsFromCards(dueCards(store))
    if (!lesson) return []
    return buildSteps(lesson, lineByLine ? "advanced" : store.settings.difficulty)
  })
  const [difficulty] = useState(() => loadStore().settings.difficulty)
  const [index, setIndex] = useState(() => openingIndex(steps.length))
  const [phase, setPhase] = useState<"typing" | "retype" | "feedback">("typing")
  const [slots, setSlots] = useState<string[]>(() => (steps[openingIndex(steps.length)]?.promptParts ?? []).map(() => ""))
  const [attemptCount, setAttemptCount] = useState(() =>
    tracksProgress && lesson ? lessonAttempts(loadStore(), lesson.id) : 0,
  )
  const [active, setActive] = useState(0)
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
  const slotsRef = useRef(slots)
  const activeRef = useRef(0)
  const compositionBaseRef = useRef("")
  const composingRef = useRef(false)
  const handledKeyRef = useRef(false)
  const ignoreCompositionRef = useRef(false)
  const spaceGuardRef = useRef(false)
  const carryRef = useRef("")
  const releaseTimerRef = useRef(0)
  const lastReleaseAtRef = useRef(0)
  const step = steps[index]

  phaseRef.current = phase

  useEffect(() => {
    if (phase === "typing" || phase === "retype") inputRef.current?.focus()
  }, [index, phase])

  useEffect(() => {
    return () => window.clearTimeout(releaseTimerRef.current)
  }, [])

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

  useEffect(() => {
    if (!tracksProgress || !lesson) return
    const store = loadStore()
    if (lessonCursor(store, lesson.id, difficulty) === index) return
    saveStore(saveCursor(store, lesson.id, difficulty, index))
  }, [tracksProgress, lesson, difficulty, index])

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
      if (tracksProgress) store = saveCursor(store, lesson.id, difficulty, 0)
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
    composingRef.current = false
    cancelRelease()
    setIme(false)
    clearSlots(step)
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

  function slotText(): string {
    return slotsRef.current[activeRef.current] ?? ""
  }

  function writeSlots(next: string[], activeIndex = activeRef.current) {
    const i = next.length === 0 ? 0 : Math.max(0, Math.min(activeIndex, next.length - 1))
    const switching = i !== activeRef.current
    if (switching) carryRef.current = (slotsRef.current[activeRef.current] ?? "").toLowerCase().replace(/[^a-z1-6]/g, "")
    slotsRef.current = next
    activeRef.current = i
    setSlots(next)
    setActive(i)
    const field = inputRef.current
    const value = next[i] ?? ""
    if (!field) return
    if (switching) {
      // End any phone composition before the old text is written into the new slot.
      cancelRelease()
      ignoreCompositionRef.current = true
      composingRef.current = false
      field.blur()
      field.value = value
      field.focus()
      field.setSelectionRange(value.length, value.length)
      window.setTimeout(() => {
        ignoreCompositionRef.current = false
      }, 80)
      return
    }
    if (!composingRef.current && field.value !== value) {
      field.value = value
      field.setSelectionRange(value.length, value.length)
    }
  }

  function clearSlots(current: Step | undefined) {
    writeSlots((current?.promptParts ?? []).map(() => ""), 0)
  }

  function cancelRelease() {
    window.clearTimeout(releaseTimerRef.current)
    releaseTimerRef.current = 0
  }

  // Windows often skips compositionend when the user switches from a Chinese
  // IME to English, then swallows every later letter. If a swallowed key left
  // the field unchanged, drop that composition so the next real key lands.
  function scheduleRelease(field: HTMLInputElement) {
    if (Date.now() - lastReleaseAtRef.current < 250) return
    cancelRelease()
    const snapshot = field.value
    releaseTimerRef.current = window.setTimeout(() => {
      releaseTimerRef.current = 0
      if (!composingRef.current || document.activeElement !== field) return
      if (field.value !== snapshot) return
      lastReleaseAtRef.current = Date.now()
      ignoreCompositionRef.current = true
      field.blur()
      field.focus()
      composingRef.current = false
      if (field.value !== slotText()) field.value = slotText()
      window.setTimeout(() => {
        ignoreCompositionRef.current = false
      }, 0)
    }, 120)
  }

  function onSlotValue(value: string) {
    if ((phaseRef.current !== "typing" && phaseRef.current !== "retype") || !step) return
    const incoming = value.toLowerCase().replace(/[^a-z1-6]/g, "")
    const carry = carryRef.current
    const current = (slotsRef.current[activeRef.current] ?? "").toLowerCase().replace(/[^a-z1-6]/g, "")
    if (carry) {
      const singleEdit =
        (incoming.length === current.length + 1 && incoming.startsWith(current)) ||
        (current.length === incoming.length + 1 && current.startsWith(incoming))
      if (singleEdit) carryRef.current = ""
      else if (incoming === carry && incoming !== current) {
        const field = inputRef.current
        if (field && field.value !== current) field.value = current
        return
      } else if (incoming !== carry) carryRef.current = ""
    }
    const list = slotsRef.current.slice()
    const indexInSlots = activeRef.current
    const previous = list[indexInSlots] ?? ""
    if (incoming !== previous) {
      if (incoming.length > previous.length && loadStore().settings.sound) playSfx("key")
      list[indexInSlots] = incoming
      slotsRef.current = list
      setSlots(list)
      setShake(false)
      if (slotsStatus(list, stepExpected(step)) === "incomplete") {
        setMessage(phaseRef.current === "retype" ? "照着再打一遍，对了才能往下" : "")
      } else setMessage("按空格确认")
    }
    const field = inputRef.current
    if (field && !composingRef.current && field.value !== incoming) field.value = incoming
  }

  function rejectSlot(message: string, wrong = false) {
    if (wrong && phaseRef.current === "typing") {
      editedRef.current = true
      mistakesRef.current = true
    }
    setMessage(message)
    setShake(true)
    if (loadStore().settings.sound) playSfx("wrong")
  }

  function moveToSlot(target: number) {
    const list = slotsRef.current
    const next = Math.max(0, Math.min(list.length - 1, target))
    if (validateEachSlot && next > activeRef.current && step) {
      const expected = stepExpected(step)
      const blocked = list.findIndex((value, index) => index < next && value !== expected[index])
      if (blocked >= 0) {
        writeSlots(list, blocked)
        rejectSlot(list[blocked] ? "这一格不对，改对后才能继续" : "先填对这一格，再继续", Boolean(list[blocked]))
        return
      }
    }
    writeSlots(list, next)
  }

  function confirmAnswer() {
    if (phaseRef.current !== "typing" || !step) return
    const status = slotsStatus(slotsRef.current, stepExpected(step))
    if (status === "incomplete") {
      rejectSlot("先打完，再按空格确认")
      return
    }
    if (status !== "match") {
      if (validateEachSlot) {
        const firstWrong = slotsRef.current.findIndex((value, index) => value !== stepExpected(step)[index])
        if (firstWrong >= 0) writeSlots(slotsRef.current, firstWrong)
      }
      rejectSlot("不对，改完再按空格确认", true)
      return
    }
    finish("success")
  }

  function confirmRetype() {
    if (phaseRef.current !== "retype" || !step) return
    const status = slotsStatus(slotsRef.current, stepExpected(step))
    if (status === "incomplete") {
      rejectSlot("先打完，对了才能往下")
      return
    }
    if (status !== "match") {
      if (validateEachSlot) {
        const firstWrong = slotsRef.current.findIndex((value, index) => value !== stepExpected(step)[index])
        if (firstWrong >= 0) writeSlots(slotsRef.current, firstWrong)
      }
      rejectSlot("不对，照着答案再打一遍", true)
      return
    }
    if (loadStore().settings.sound) playSfx("great")
    goNext()
  }

  // Phone keyboards often omit key " " and only insert a space, or report keyCode 229.
  function acceptSpace() {
    if (spaceGuardRef.current) return
    if (phaseRef.current !== "typing" && phaseRef.current !== "retype") return
    spaceGuardRef.current = true
    cancelRelease()
    composingRef.current = false
    setIme(false)
    onSpace()
    window.setTimeout(() => {
      spaceGuardRef.current = false
    }, 40)
  }

  function onSpace() {
    if ((phaseRef.current !== "typing" && phaseRef.current !== "retype") || !step) return
    inputRef.current?.focus()
    const list = slotsRef.current
    const here = activeRef.current
    if (validateEachSlot) {
      const expected = stepExpected(step)
      if (list[here] !== expected[here]) {
        rejectSlot(list[here] ? "这一格不对，改对后才能继续" : "先填对这一格，再继续", Boolean(list[here]))
        return
      }
      if (here < list.length - 1) {
        moveToSlot(here + 1)
        return
      }
    }
    if (slotsStatus(list, stepExpected(step)) !== "incomplete") {
      if (phaseRef.current === "retype") confirmRetype()
      else confirmAnswer()
      return
    }
    if (here < list.length - 1) {
      moveToSlot(here + 1)
      return
    }
    const empty = list.findIndex((part) => part.length === 0)
    if (empty >= 0 && empty !== here) {
      moveToSlot(empty)
      return
    }
    rejectSlot(phaseRef.current === "retype" ? "先打完，对了才能往下" : "先打完，再按空格确认")
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
    composingRef.current = false
    cancelRelease()
    setIme(false)
    setIndex((value) => value + 1)
    setPhase("typing")
    clearSlots(steps[index + 1])
    setMessage("")
    setGrade(null)
    setShake(false)
  }

  function leave() {
    persist(false)
    onExit()
  }

  function restartLesson() {
    if (!tracksProgress || !lesson || steps.length === 0) return
    const answered =
      countsRef.current.perfect + countsRef.current.great + countsRef.current.hard + countsRef.current.miss
    let next = loadStore()
    if (index > 0 || lessonCursor(next, lesson.id, difficulty) > 0 || answered > 0) next = noteAttempt(next, lesson.id)
    next = saveCursor(next, lesson.id, difficulty, 0)
    saveStore(next)
    setAttemptCount(lessonAttempts(next, lesson.id))
    pendingRef.current = new Map()
    persistedRef.current = false
    editedRef.current = false
    mistakesRef.current = false
    comboRef.current = 0
    scoreRef.current = 0
    bestRef.current = 0
    countsRef.current = { perfect: 0, great: 0, hard: 0, miss: 0 }
    phaseRef.current = "typing"
    composingRef.current = false
    cancelRelease()
    setIme(false)
    setCombo(0)
    setScore(0)
    setCounts(countsRef.current)
    setBurst(null)
    setShake(false)
    setMessage("")
    setGrade(null)
    setPhase("typing")
    setIndex(0)
    clearSlots(steps[0])
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === ";" && (event.ctrlKey || event.metaKey)) {
        if (lineByLine) return
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
      } else if (isEscape(event) && !event.defaultPrevented && !composingRef.current) {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (step) leave()
        else onExit()
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
          {exitLabel}
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

  return (
    <div className="stage">
      <header className="stage-bar">
        <div className="stage-actions">
          <button type="button" className="back" onClick={leave}>
            {exitLabel}
          </button>
          {tracksProgress && (
            <button type="button" className="back" onClick={restartLesson}>
              从头练习
            </button>
          )}
        </div>
        <div className="stage-title">
          <strong>{mode === "review" ? "今日复习" : lesson?.title}</strong>
          <span>
            {subtitle ?? (mode === "review" ? "到期的卡片" : DIFFICULTY_LABEL[difficulty])}
            {tracksProgress && attemptCount > 0 ? ` · 第 ${attemptCount} 次` : ""}
          </span>
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

        {phase === "feedback" || phase === "retype" || (showReading && phase === "typing") ? (
          <div className={lineByLine ? "ruby-row compact" : "ruby-row"}>
            {step.promptParts.map((part, partIndex) => (
              <span className="ruby" key={`${part.jyutping}-${partIndex}`}>
                <code data-tone={toneNumber(part.jyutping)}>{part.jyutping}</code>
                <b>{part.char}</b>
                {phase !== "typing" && <small>{toneLabel(part.jyutping)}</small>}
              </span>
            ))}
          </div>
        ) : (
          <h1 className={lineByLine ? "prompt prompt-long" : "prompt"}>{prompt}</h1>
        )}

        {step.gloss && <p className="gloss">{step.gloss}</p>}
        {(phase === "feedback" || phase === "retype") && step.note && <p className="note">{step.note}</p>}
        <p className={message === "按空格确认" ? "message hint" : "message"} role="status">
          {ime ? "请切换到英文输入法" : message}
          {phase === "feedback" && grade === "perfect" ? " Perfect" : ""}
          {phase === "feedback" && grade === "great" ? " Great" : ""}
          {phase === "feedback" && grade === "hard" ? " 声调或拼写改对了" : ""}
        </p>

        {(phase === "typing" || phase === "retype") && (
          <div
            className={shake ? "slots shake" : "slots"}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return
              const nodes = event.currentTarget.querySelectorAll(".slot")
              let picked = activeRef.current
              nodes.forEach((node, slotIndex) => {
                const rect = node.getBoundingClientRect()
                if (event.clientX >= rect.left && event.clientX <= rect.right) picked = slotIndex
              })
              if (picked === activeRef.current) {
                inputRef.current?.focus()
                return
              }
              event.preventDefault()
              moveToSlot(picked)
            }}
          >
            {step.promptParts.map((part, slotIndex) => {
              const value = slots[slotIndex] ?? ""
              const current = slotIndex === active
              return (
                <span className={current ? "slot on" : "slot"} key={`${part.char}-${slotIndex}`}>
                  <b>
                    {value}
                    {current ? <i className="caret" /> : null}
                  </b>
                  <i className="rule" />
                </span>
              )
            })}
            <input
              ref={inputRef}
              defaultValue=""
              aria-label="粤拼输入"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              lang="en"
              onPointerDown={primeAudio}
              onCompositionStart={(event) => {
                if (ignoreCompositionRef.current) return
                if (!composingRef.current) compositionBaseRef.current = slotText()
                composingRef.current = true
                setIme(true)
                scheduleRelease(event.currentTarget)
              }}
              onCompositionUpdate={(event) => {
                if (ignoreCompositionRef.current) return
                const field = event.currentTarget
                const data = event.data ?? ""
                if (nonJyutping(field.value) || nonJyutping(data)) {
                  setIme(true)
                  return
                }
                const typed = field.value || compositionBaseRef.current + data
                const incoming = typed.toLowerCase().replace(/[^a-z1-6]/g, "")
                if (!incoming) return
                if (incoming.length < slotText().length && slotText().startsWith(incoming)) return
                cancelRelease()
                setIme(false)
                onSlotValue(typed)
              }}
              onCompositionEnd={(event) => {
                if (ignoreCompositionRef.current) return
                composingRef.current = false
                cancelRelease()
                const field = event.currentTarget
                const data = event.data ?? ""
                if (nonJyutping(field.value) || nonJyutping(data)) {
                  field.value = compositionBaseRef.current
                  onSlotValue(compositionBaseRef.current)
                  setIme(true)
                  return
                }
                const typed = field.value || compositionBaseRef.current + data
                const incoming = typed.toLowerCase().replace(/[^a-z1-6]/g, "")
                if (!incoming) return
                if (incoming.length < slotText().length && slotText().startsWith(incoming)) return
                setIme(false)
                onSlotValue(typed)
              }}
              onBeforeInput={(event) => {
                const native = event.nativeEvent
                if (native.inputType !== "insertText" && native.inputType !== "insertReplacementText" && native.inputType !== "insertCompositionText") return
                if (!isSpaceText(native.data)) return
                event.preventDefault()
                acceptSpace()
              }}
              onChange={(event) => {
                if (handledKeyRef.current) return
                const value = event.target.value
                if (/[\s\u00a0\u3000]/.test(value)) {
                  const stripped = value.replace(/[\s\u00a0\u3000]+/g, "")
                  if (!nonJyutping(stripped)) {
                    event.target.value = stripped
                    if (stripped !== slotText()) onSlotValue(stripped)
                    acceptSpace()
                    return
                  }
                }
                if (nonJyutping(value)) {
                  cancelRelease()
                  event.target.value = compositionBaseRef.current
                  onSlotValue(compositionBaseRef.current)
                  setIme(true)
                  return
                }
                if (value) cancelRelease()
                const composing = (event.nativeEvent as InputEvent).isComposing
                if (!composing) composingRef.current = false
                if (value || !composing) setIme(false)
                onSlotValue(value)
              }}
              onKeyDown={(event) => {
                primeAudio()
                if (!event.ctrlKey && !event.metaKey && !event.altKey && (event.key === " " || event.key === "Spacebar" || event.code === "Space")) {
                  event.preventDefault()
                  event.stopPropagation()
                  acceptSpace()
                  return
                }
                if (swallowedByIme(event)) {
                  if (!composingRef.current) compositionBaseRef.current = slotText()
                  composingRef.current = true
                  setIme(true)
                  scheduleRelease(event.currentTarget)
                  return
                }
                cancelRelease()
                const latin =
                  !event.ctrlKey && !event.metaKey && !event.altKey && /^[a-z1-6]$/i.test(event.key)
                    ? event.key.toLowerCase()
                    : ""
                if (latin && (composingRef.current || event.nativeEvent.isComposing)) {
                  event.preventDefault()
                  handledKeyRef.current = true
                  composingRef.current = false
                  setIme(false)
                  onSlotValue(slotText() + latin)
                  window.queueMicrotask(() => {
                    handledKeyRef.current = false
                  })
                  return
                }
                if (latin) setIme(false)
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault()
                  composingRef.current = false
                  const list = slotsRef.current
                  const delta = event.key === "ArrowLeft" ? -1 : 1
                  const next = Math.max(0, Math.min(list.length - 1, activeRef.current + delta))
                  moveToSlot(next)
                } else if (event.key === "Backspace" && slotText().length === 0) {
                  event.preventDefault()
                  if (activeRef.current > 0) moveToSlot(activeRef.current - 1)
                } else if (event.key === "Backspace") {
                  editedRef.current = true
                  composingRef.current = false
                  setIme(false)
                  if (loadStore().settings.sound) playSfx("key")
                } else if (event.key === "Enter" && event.keyCode !== 229) {
                  event.preventDefault()
                  event.stopPropagation()
                  if (validateEachSlot) onSpace()
                  else if (phaseRef.current === "retype") confirmRetype()
                  else confirmAnswer()
                }
              }}
            />
          </div>
        )}
      </div>

      <footer className="keys">
        {phase === "typing" && !lineByLine ? (
          <button type="button" onClick={() => finish("miss")}>
            <kbd>Ctrl</kbd>
            <kbd>;</kbd>
            显示答案
          </button>
        ) : (
          <button type="button" onClick={() => speakCantonese(prompt)}>
            <kbd>Ctrl</kbd>
            <kbd>'</kbd>
            读出来
          </button>
        )}
        {phase === "typing" || phase === "retype" ? (
          <>
            <button type="button" className="solid" onClick={onSpace}>
              <kbd>Space</kbd>
              {phase === "retype" ? "确认" : "下一格"}
            </button>
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd>
              换格
            </span>
            {phase === "typing" && !lineByLine && (
              <button type="button" onClick={() => speakCantonese(prompt)}>
                <kbd>Ctrl</kbd>
                <kbd>'</kbd>
                读出来
              </button>
            )}
          </>
        ) : (
          <button type="button" className="solid" onClick={goNext}>
            <kbd>Enter</kbd>
            {index + 1 >= steps.length ? "看结果" : "下一题"}
          </button>
        )}
        <span>
          <kbd>Esc</kbd>
          返回
        </span>
      </footer>
    </div>
  )
}
