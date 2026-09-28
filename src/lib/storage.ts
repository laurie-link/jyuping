import { createEmptyCard, fsrs, type Card } from "ts-fsrs"
import { betterRating, toRating } from "./score"
import type { CardSeed, Difficulty, GradeName, LessonRecord, SavedCard, Store } from "./types"

const KEY = "jyutping-memo:v1"
const scheduler = fsrs()

function emptyStore(): Store {
  return {
    version: 1,
    cards: {},
    lessons: {},
    streak: { lastDay: "", count: 0 },
    settings: { difficulty: "beginner", sound: true, autoPlay: false, speakOnAnswer: true },
    seenIntro: false,
  }
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Store
    if (parsed.version !== 1) return emptyStore()
    return {
      ...emptyStore(),
      ...parsed,
      settings: { ...emptyStore().settings, ...parsed.settings },
      streak: { ...emptyStore().streak, ...parsed.streak },
    }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store))
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
