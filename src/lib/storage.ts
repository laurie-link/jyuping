import { createEmptyCard, fsrs, type Card } from "ts-fsrs"
import { betterRating, toRating } from "./score"
import type { CardSeed, Difficulty, GradeName, LessonProgress, LessonRecord, SavedCard, Store } from "./types"

const scheduler = fsrs()
const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"]

let activeUserId: string | null = null
let storeCache: Store | null = null
let revision = 0
let pending: Store | null = null
let writing = false
let syncStatus: "saved" | "saving" | "error" | "conflict" = "saved"
const syncListeners = new Set<() => void>()
const PENDING_PREFIX = "jyutping-memo:pending:"

function emitSync() {
  for (const listener of syncListeners) listener()
}

function setSyncStatus(next: typeof syncStatus) {
  if (syncStatus === next) return
  syncStatus = next
  emitSync()
}

export function getSyncStatus() { return syncStatus }
export function subscribeSync(listener: () => void) {
  syncListeners.add(listener)
  return () => syncListeners.delete(listener)
}

function emptyProgress(): LessonProgress {
  return { attempts: 0, cursor: {} }
}

export function emptyStore(): Store {
  return {
    version: 1,
    cards: {},
    lessons: {},
    progress: {},
    streak: { lastDay: "", count: 0 },
    settings: { difficulty: "beginner", sound: true, autoPlay: false, speakOnAnswer: true },
    seenIntro: false,
  }
}

function sanitizeProgress(value: unknown, lessons: Store["lessons"]): Store["progress"] {
  const progress: Store["progress"] = {}
  if (value && typeof value === "object") {
    for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!entry || typeof entry !== "object") continue
      const record = entry as { attempts?: unknown; cursor?: unknown }
      const attempts = typeof record.attempts === "number" && record.attempts > 0 ? Math.floor(record.attempts) : 0
      const cursor: LessonProgress["cursor"] = {}
      if (record.cursor && typeof record.cursor === "object") {
        for (const difficulty of DIFFICULTIES) {
          const index = (record.cursor as Record<string, unknown>)[difficulty]
          if (typeof index === "number" && Number.isInteger(index) && index > 0) cursor[difficulty] = index
        }
      }
      if (attempts > 0 || Object.keys(cursor).length > 0) progress[id] = { attempts, cursor }
    }
  }
  for (const [id, record] of Object.entries(lessons)) {
    if (!record || record.completions <= 0) continue
    const current = progress[id] ?? emptyProgress()
    if (current.attempts >= record.completions && progress[id]) continue
    progress[id] = { ...current, attempts: Math.max(current.attempts, record.completions) }
  }
  return progress
}

export function sanitizeStore(value: unknown): Store {
  if (!value || typeof value !== "object") return emptyStore()
  const parsed = value as Partial<Store>
  if (parsed.version !== 1) return emptyStore()
  const lessons = parsed.lessons && typeof parsed.lessons === "object" ? parsed.lessons : {}
  return {
    ...emptyStore(), ...parsed,
    cards: parsed.cards && typeof parsed.cards === "object" ? parsed.cards : {},
    lessons,
    settings: { ...emptyStore().settings, ...parsed.settings },
    streak: { ...emptyStore().streak, ...parsed.streak },
    progress: sanitizeProgress(parsed.progress, lessons),
  }
}

function pendingKey(userId: string) { return `${PENDING_PREFIX}${userId}` }

function rememberPending() {
  if (!activeUserId || !pending) return
  try { localStorage.setItem(pendingKey(activeUserId), JSON.stringify({ revision, data: pending })) } catch { /* Server sync still proceeds. */ }
}

async function flush() {
  if (writing || !activeUserId || !pending || syncStatus === "conflict") return
  writing = true
  setSyncStatus("saving")
  while (pending && activeUserId) {
    const userId: string = activeUserId
    const snapshot = pending
    pending = null
    try {
      const response = await fetch("/api/account/progress", {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, data: snapshot }),
      })
      if (response.status === 409) {
        pending = pending ?? snapshot
        setSyncStatus("conflict")
        break
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json() as { revision: number }
      if (activeUserId !== userId) break
      revision = result.revision
      if (!pending) {
        try { localStorage.removeItem(pendingKey(userId)) } catch { /* optional cache */ }
      } else rememberPending()
    } catch {
      pending = pending ?? snapshot
      rememberPending()
      setSyncStatus("error")
      break
    }
  }
  writing = false
  if (!pending) setSyncStatus("saved")
}

export async function initializeStore(userId: string, legacyStore?: Store | null) {
  const response = await fetch("/api/account/progress", { credentials: "same-origin" })
  if (!response.ok) throw new Error("读取服务器进度失败")
  const result = await response.json() as { data: Store | null; revision: number }
  activeUserId = userId
  revision = result.revision
  pending = null
  storeCache = sanitizeStore(result.data)
  let recovered: { data: Store; revision: number } | null = null
  try {
    const raw = localStorage.getItem(pendingKey(userId))
    if (raw) recovered = JSON.parse(raw) as { data: Store; revision: number }
  } catch { /* Invalid cache is ignored. */ }
  if (recovered && recovered.revision === revision) {
    storeCache = sanitizeStore(recovered.data)
    pending = storeCache
  } else if (recovered && JSON.stringify(recovered.data) !== JSON.stringify(result.data)) {
    storeCache = sanitizeStore(recovered.data)
    pending = storeCache
    setSyncStatus("conflict")
  } else if (recovered) {
    try { localStorage.removeItem(pendingKey(userId)) } catch { /* optional cache */ }
  }
  if (!result.data && !pending && legacyStore) {
    storeCache = sanitizeStore(legacyStore)
    pending = storeCache
    rememberPending()
  }
  if (syncStatus !== "conflict") setSyncStatus(pending ? "saving" : "saved")
  if (pending && syncStatus !== "conflict") await flush()
}

export function clearStore() {
  activeUserId = null
  storeCache = null
  pending = null
  revision = 0
  setSyncStatus("saved")
}

export function loadStore(): Store {
  return storeCache ?? emptyStore()
}

export function saveStore(store: Store) {
  if (!activeUserId) throw new Error("请先登录")
  storeCache = sanitizeStore(store)
  pending = storeCache
  rememberPending()
  void flush()
}

export async function flushStore() {
  if (pending && syncStatus !== "conflict") await flush()
  while (writing) await new Promise((resolve) => setTimeout(resolve, 50))
  return syncStatus === "saved"
}

export function retrySync() {
  if (syncStatus === "conflict") return
  void flush()
}

export async function resolveConflict(preferLocal: boolean) {
  if (!activeUserId || syncStatus !== "conflict") return
  try {
    const response = await fetch("/api/account/progress", { credentials: "same-origin" })
    if (!response.ok) throw new Error("Could not reload progress")
    const latest = await response.json() as { data: Store | null; revision: number }
    revision = latest.revision
    if (preferLocal) {
      pending = storeCache
      rememberPending()
      setSyncStatus("saving")
      await flush()
    } else {
      pending = null
      storeCache = sanitizeStore(latest.data)
      try { localStorage.removeItem(pendingKey(activeUserId)) } catch { /* optional cache */ }
      setSyncStatus("saved")
      window.location.reload()
    }
  } catch {
    setSyncStatus("conflict")
  }
}

export function resetCurrentStore(): Store {
  const next = emptyStore()
  saveStore(next)
  return next
}

window.addEventListener("online", retrySync)
window.addEventListener("beforeunload", (event) => {
  if (syncStatus === "saved") return
  event.preventDefault()
  event.returnValue = ""
})
window.setInterval(() => {
  if (syncStatus === "error" && navigator.onLine) retrySync()
}, 10_000)

function progressOf(store: Store, lessonId: string): LessonProgress {
  return store.progress[lessonId] ?? emptyProgress()
}

export function lessonAttempts(store: Store, lessonId: string): number {
  const attempts = progressOf(store, lessonId).attempts
  return Number.isInteger(attempts) && attempts > 0 ? attempts : 0
}

export function lessonCursor(store: Store, lessonId: string, difficulty: Difficulty): number {
  const index = progressOf(store, lessonId).cursor[difficulty] ?? 0
  return Number.isInteger(index) && index > 0 ? index : 0
}

export function hasSavedCursor(store: Store, lessonId: string): boolean {
  return DIFFICULTIES.some((difficulty) => lessonCursor(store, lessonId, difficulty) > 0)
}

export function noteAttempt(store: Store, lessonId: string): Store {
  const current = progressOf(store, lessonId)
  return {
    ...store,
    progress: {
      ...store.progress,
      [lessonId]: { ...current, attempts: current.attempts + 1 },
    },
  }
}

export function beginLesson(store: Store, lessonId: string, difficulty: Difficulty, fresh: boolean): Store {
  const next = fresh ? saveCursor(store, lessonId, difficulty, 0) : store
  if (lessonCursor(next, lessonId, difficulty) > 0) return next
  return noteAttempt(next, lessonId)
}

export function saveCursor(store: Store, lessonId: string, difficulty: Difficulty, index: number): Store {
  const current = progressOf(store, lessonId)
  const cursor = { ...current.cursor }
  if (index > 0) cursor[difficulty] = index
  else delete cursor[difficulty]
  return {
    ...store,
    progress: {
      ...store.progress,
      [lessonId]: { ...current, cursor },
    },
  }
}

export function clearCursors(store: Store, lessonIds: string[]): Store {
  const progress = { ...store.progress }
  for (const id of lessonIds) {
    const current = progress[id]
    if (!current) continue
    progress[id] = { ...current, cursor: {} }
  }
  return { ...store, progress }
}

export function todayKey(date = new Date()): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 10)
}

function yesterdayKey(date = new Date()): string {
  return todayKey(new Date(date.getTime() - 86_400_000))
}

export function dueCards(store: Store, now = new Date()): SavedCard[] {
  return Object.values(store.cards)
    .filter((card) => new Date(card.due).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
}

export function nextDue(store: Store, now = new Date()): SavedCard | undefined {
  return Object.values(store.cards)
    .filter((card) => new Date(card.due).getTime() > now.getTime())
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())[0]
}

export function formatDue(iso: string, now = new Date()): string {
  const ms = new Date(iso).getTime() - now.getTime()
  if (ms <= 0) return "现在"
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)} 分钟后`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时后`
  const days = Math.round(hours / 24)
  return days === 1 ? "明天" : `${days} 天后`
}

function cardFromFsrs(seed: CardSeed, card: Card): SavedCard {
  return {
    ...seed,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
  }
}

function savedToCard(saved: SavedCard): Card {
  return {
    due: new Date(saved.due),
    stability: saved.stability,
    difficulty: saved.difficulty,
    elapsed_days: saved.elapsed_days,
    scheduled_days: saved.scheduled_days,
    learning_steps: saved.learning_steps,
    reps: saved.reps,
    lapses: saved.lapses,
    state: saved.state,
    last_review: saved.last_review ? new Date(saved.last_review) : undefined,
  }
}

export function applyGrades(
  store: Store,
  entries: Array<{ seed: CardSeed; grade: GradeName }>,
  now = new Date(),
): Store {
  const cards = { ...store.cards }
  for (const entry of entries) {
    const previous = cards[entry.seed.id]
    const base = previous ? savedToCard(previous) : createEmptyCard(now)
    const seenBefore = Boolean(previous && previous.reps > 0)
    const record = scheduler.next(base, now, toRating(entry.grade, seenBefore))
    cards[entry.seed.id] = cardFromFsrs(entry.seed, record.card)
  }
  return { ...store, cards }
}

export function markLesson(
  store: Store,
  lessonId: string,
  rating: string,
  now = new Date(),
): Store {
  const previous: LessonRecord | undefined = store.lessons[lessonId]
  return {
    ...store,
    lessons: {
      ...store.lessons,
      [lessonId]: {
        best: betterRating(previous?.best, rating),
        completions: (previous?.completions ?? 0) + 1,
        lastAt: now.toISOString(),
      },
    },
  }
}

export function touchStreak(store: Store, now = new Date()): Store {
  const today = todayKey(now)
  if (store.streak.lastDay === today) return store
  const count = store.streak.lastDay === yesterdayKey(now) ? store.streak.count + 1 : 1
  return { ...store, streak: { lastDay: today, count } }
}

export function setDifficulty(store: Store, difficulty: Difficulty): Store {
  return { ...store, settings: { ...store.settings, difficulty } }
}
