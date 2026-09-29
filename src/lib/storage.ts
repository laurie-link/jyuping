import { createEmptyCard, fsrs, type Card } from "ts-fsrs"
import { betterRating, toRating } from "./score"
import { currentUserId, userStoreKey, LEGACY_STORE_KEY } from "./session"
import type { CardSeed, Difficulty, GradeName, LessonProgress, LessonRecord, SavedCard, Store } from "./types"

const scheduler = fsrs()
const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"]

function storeKey() {
  const id = currentUserId()
  return id ? userStoreKey(id) : LEGACY_STORE_KEY
}

function emptyProgress(): LessonProgress {
  return { attempts: 0, cursor: {} }
}

function emptyStore(): Store {
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

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(storeKey())
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Store
    if (parsed.version !== 1) return emptyStore()
    const lessons = parsed.lessons ?? {}
    return {
      ...emptyStore(),
      ...parsed,
      cards: parsed.cards ?? {},
      lessons,
      settings: { ...emptyStore().settings, ...parsed.settings },
      streak: { ...emptyStore().streak, ...parsed.streak },
      progress: sanitizeProgress(parsed.progress, lessons),
    }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: Store) {
  localStorage.setItem(storeKey(), JSON.stringify(store))
}

export function resetCurrentStore(): Store {
  localStorage.removeItem(storeKey())
  const next = emptyStore()
  saveStore(next)
  return next
}

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
