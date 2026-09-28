import type { CardSeed, Difficulty, Lesson, Part, SavedCard, Sentence, Step, Token } from "./types"

function charsOf(tokens: Token[]): string {
  return tokens.flatMap((token) => token.parts.map((part) => part.char)).join("")
}

function partsOf(tokens: Token[]): Part[] {
  return tokens.flatMap((token) => token.parts)
}

function glossOf(sentence: Sentence, start: number, end: number): string {
  if (start === 0 && end === sentence.tokens.length) return sentence.gloss
  return sentence.tokens.slice(start, end).map((token) => token.gloss).join("")
}

function charOffset(tokens: Token[], index: number): number {
  let count = 0
  for (let i = 0; i < index; i += 1) count += tokens[i].parts.length
  return count
}

function spansFor(count: number, difficulty: Difficulty): Array<[number, number]> {
  if (count <= 1 || difficulty === "advanced") return [[0, count]]

  if (difficulty === "intermediate") {
    const spans: Array<[number, number]> = []
    for (let i = 0; i < count; i += 2) spans.push([i, Math.min(count, i + 2)])
    if (count > 2) spans.push([0, count])
    return dedupe(spans)
  }

  const spans: Array<[number, number]> = []
  for (let i = 0; i < count; i += 1) {
    spans.push([i, i + 1])
    if (i > 0) spans.push([0, i + 1])
  }
  return dedupe(spans)
}

function dedupe(spans: Array<[number, number]>): Array<[number, number]> {
  const seen = new Set<string>()
  return spans.filter(([start, end]) => {
    const key = `${start}:${end}`
    if (seen.has(key)) return false
    seen.add(key)
    return end > start
  })
}

function seedsFor(
  lessonId: string,
  sentence: Sentence,
  start: number,
  end: number,
): CardSeed[] {
  const seeds: CardSeed[] = []
  sentence.tokens.slice(start, end).forEach((token, offset) => {
    const tokenIndex = start + offset
    token.parts.forEach((part, partIndex) => {
      seeds.push({
        id: `syl:${lessonId}:${sentence.id}:${tokenIndex}:${partIndex}`,
        kind: "syllable",
        lessonId,
        sentenceId: sentence.id,
        chars: part.char,
        jyutping: part.jyutping,
        gloss: token.gloss,
        parts: [part],
      })
    })
  })

  if (start === 0 && end === sentence.tokens.length) {
    const parts = partsOf(sentence.tokens)
    seeds.push({
      id: `sen:${lessonId}:${sentence.id}`,
      kind: "sentence",
      lessonId,
      sentenceId: sentence.id,
      chars: charsOf(sentence.tokens),
      jyutping: parts.map((part) => part.jyutping).join(" "),
      gloss: sentence.gloss,
      parts,
    })
  }

  return seeds
}

export function buildSteps(lesson: Lesson, difficulty: Difficulty): Step[] {
  const steps: Step[] = []

  for (const sentence of lesson.sentences) {
    const sentenceChars = charsOf(sentence.tokens)
    for (const [start, end] of spansFor(sentence.tokens.length, difficulty)) {
      const promptParts = partsOf(sentence.tokens.slice(start, end))
      steps.push({
        id: `${lesson.id}:${sentence.id}:${start}:${end}`,
        lessonId: lesson.id,
        sentenceId: sentence.id,
        promptParts,
        gloss: glossOf(sentence, start, end),
        note: start === 0 && end === sentence.tokens.length ? sentence.note : undefined,
        contextChars: sentenceChars,
        contextStart: charOffset(sentence.tokens, start),
        contextEnd: charOffset(sentence.tokens, end),
        seeds: seedsFor(lesson.id, sentence, start, end),
      })
    }
  }

  return steps
}

export function stepExpected(step: Step): string[] {
  return step.promptParts.map((part) => part.jyutping)
}

export function stepsFromCards(cards: SavedCard[]): Step[] {
  return cards.map((card) => ({
    id: `review:${card.id}`,
    lessonId: card.lessonId,
    sentenceId: card.sentenceId,
    promptParts: card.parts,
    gloss: card.gloss,
    contextChars: card.chars,
    contextStart: 0,
    contextEnd: Array.from(card.chars).length,
    seeds: [
      {
        id: card.id,
        kind: card.kind,
        lessonId: card.lessonId,
        sentenceId: card.sentenceId,
        chars: card.chars,
        jyutping: card.jyutping,
        gloss: card.gloss,
        parts: card.parts,
      },
    ],
  }))
}
