export type Difficulty = "beginner" | "intermediate" | "advanced"

export type Part = {
  char: string
  jyutping: string
}

export type Token = {
  gloss: string
  parts: Part[]
}

export type Sentence = {
  id: string
  gloss: string
  note?: string
  tokens: Token[]
}

export type Lesson = {
  id: string
  title: string
  blurb: string
  sentences: Sentence[]
}

export type GradeName = "perfect" | "great" | "hard" | "miss"

export type CardSeed = {
  id: string
  kind: "syllable" | "sentence"
  lessonId: string
  sentenceId: string
  chars: string
  jyutping: string
  gloss: string
  parts: Part[]
}

export type Step = {
  id: string
  lessonId: string
  sentenceId: string
  promptParts: Part[]
  gloss: string
  note?: string
  contextChars: string
  contextStart: number
  contextEnd: number
  seeds: CardSeed[]
}

export type SavedCard = CardSeed & {
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: string
}

export type LessonRecord = {
  best: string
  completions: number
  lastAt: string
}

export type Store = {
  version: 1
  cards: Record<string, SavedCard>
  lessons: Record<string, LessonRecord>
  streak: { lastDay: string; count: number }
  settings: {
    difficulty: Difficulty
    sound: boolean
    autoPlay: boolean
    speakOnAnswer: boolean
  }
  seenIntro: boolean
}

export type SummaryData = {
  title: string
  rating: string
  score: number
  bestCombo: number
  perfect: number
  great: number
  hard: number
  miss: number
  total: number
  mode: "lesson" | "review"
  lessonId?: string
  nextLessonId?: string
}
