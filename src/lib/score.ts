import { Rating, type Grade } from "ts-fsrs"
import type { GradeName } from "./types"

const GRADE_RANK: Record<GradeName, number> = {
  miss: 0,
  hard: 1,
  great: 2,
  perfect: 3,
}

export function worseGrade(a: GradeName, b: GradeName): GradeName {
  return GRADE_RANK[a] <= GRADE_RANK[b] ? a : b
}

export function toRating(grade: GradeName, seenBefore: boolean): Grade {
  if (grade === "miss") return Rating.Again
  if (grade === "hard") return Rating.Hard
  if (grade === "great" || !seenBefore) return Rating.Good
  return Rating.Easy
}

export function comboMultiplier(combo: number): number {
  if (combo >= 20) return 2
  if (combo >= 15) return 1.8
  if (combo >= 10) return 1.5
  if (combo >= 7) return 1.3
  if (combo >= 5) return 1.2
  if (combo >= 3) return 1.1
  return 1
}

export function pointsFor(grade: GradeName, combo: number): number {
  const base = grade === "perfect" ? 100 : grade === "great" ? 80 : grade === "hard" ? 60 : 0
  if (base === 0) return 0
  return Math.round(base * comboMultiplier(combo))
}

export function sessionRating(counts: {
  perfect: number
  great: number
  hard: number
  miss: number
}): string {
  const total = counts.perfect + counts.great + counts.hard + counts.miss
  if (total === 0) return "C"
  const weighted = counts.perfect + counts.great * 0.85 + counts.hard * 0.6
  const ratio = weighted / total
  const perfectRatio = counts.perfect / total
  if (counts.miss === 0 && counts.hard === 0 && perfectRatio >= 0.95) return "SSS"
  if (ratio >= 0.92) return "SS"
  if (ratio >= 0.8) return "S"
  if (ratio >= 0.68) return "A"
  if (ratio >= 0.5) return "B"
  return "C"
}

const RATING_RANK = ["C", "B", "A", "S", "SS", "SSS"]

export function betterRating(current: string | undefined, next: string): string {
  const a = RATING_RANK.indexOf(current ?? "C")
  const b = RATING_RANK.indexOf(next)
  if (a < 0) return next
  return b > a ? next : (current ?? next)
}
