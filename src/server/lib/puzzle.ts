import type {
  ClientPuzzleData,
  ClientRingData,
  Difficulty,
  GuessResult,
  LetterFeedback,
  PuzzleConfig,
  RingConfig
} from '../../shared/types'
import {
  DIFFICULTY_THRESHOLDS,
  FIXED_LETTERS_COUNT,
  LETTERS_PER_RING,
  MAX_ATTEMPTS
} from '../../shared/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const VOWELS = ['a', 'e', 'i', 'o', 'u'] as const
const CONSONANTS = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
  'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'
] as const

// ─── Difficulty ──────────────────────────────────────────────────────────────

export const getDifficulty = (streak: number): Difficulty => {
  if (streak <= DIFFICULTY_THRESHOLDS.EASY_MAX_STREAK) return 'easy'
  if (streak <= DIFFICULTY_THRESHOLDS.MEDIUM_MAX_STREAK) return 'medium'
  return 'hard'
}

// ─── Ring Generation ─────────────────────────────────────────────────────────

/** Fisher-Yates shuffle (in-place) */
const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = temp
  }
  return arr
}

/**
 * Generate letters for a ring:
 * - Includes the correct letter
 * - Fills remaining slots with balanced vowels/consonants
 * - No duplicate letters per ring
 */
const generateRingLetters = (correctLetter: string, totalLetters: number): string[] => {
  const isVowel = (VOWELS as readonly string[]).includes(correctLetter)
  const letters = new Set<string>([correctLetter])

  // Determine how many vowels vs consonants we want (roughly 30-40% vowels)
  const targetVowels = Math.max(1, Math.floor(totalLetters * 0.35))
  const currentVowels = isVowel ? 1 : 0
  const currentConsonants = isVowel ? 0 : 1

  let vowelsToAdd = targetVowels - currentVowels
  let consonantsToAdd = totalLetters - targetVowels - currentConsonants

  // If the correct letter is a vowel, we need fewer additional vowels
  if (isVowel) {
    consonantsToAdd = totalLetters - targetVowels
    vowelsToAdd = targetVowels - 1
  }

  const availableVowels = shuffle([...(VOWELS as readonly string[])].filter((v) => v !== correctLetter))
  const availableConsonants = shuffle([...(CONSONANTS as readonly string[])].filter((c) => c !== correctLetter))

  // Add vowels
  for (let i = 0; i < vowelsToAdd && i < availableVowels.length && letters.size < totalLetters; i++) {
    const v = availableVowels[i]
    if (v) letters.add(v)
  }

  // Add consonants
  for (let i = 0; i < consonantsToAdd && i < availableConsonants.length && letters.size < totalLetters; i++) {
    const c = availableConsonants[i]
    if (c) letters.add(c)
  }

  // Fill any remaining slots (if we somehow ran short)
  const allLetters = shuffle([...'abcdefghijklmnopqrstuvwxyz'].filter((l) => !letters.has(l)))
  let idx = 0
  while (letters.size < totalLetters && idx < allLetters.length) {
    const l = allLetters[idx]
    if (l) letters.add(l)
    idx++
  }

  return shuffle([...letters])
}

// ─── Puzzle Generation ───────────────────────────────────────────────────────

/**
 * Generate a full puzzle config for a given answer word and difficulty.
 */
export const generatePuzzle = (answer: string, difficulty: Difficulty): PuzzleConfig => {
  const wordLength = answer.length
  const lettersPerRing = LETTERS_PER_RING[difficulty]
  const fixedCount = FIXED_LETTERS_COUNT[difficulty]

  // Choose which indices are fixed (random positions)
  const allIndices = Array.from({ length: wordLength }, (_, i) => i)
  const fixedIndices = shuffle([...allIndices]).slice(0, fixedCount).sort((a, b) => a - b)

  const rings: RingConfig[] = Array.from({ length: wordLength }, (_, i) => {
    const correctLetter = answer[i]!
    const isFixed = fixedIndices.includes(i)

    if (isFixed) {
      // Fixed ring: only the correct letter
      return {
        letters: [correctLetter],
        correctIndex: 0,
        isFixed: true
      }
    }

    const letters = generateRingLetters(correctLetter, lettersPerRing)
    const correctIndex = letters.indexOf(correctLetter)

    return {
      letters,
      correctIndex,
      isFixed: false
    }
  })

  return {
    answer,
    wordLength,
    rings,
    difficulty,
    fixedIndices
  }
}

// ─── Client-Safe Data ────────────────────────────────────────────────────────

/**
 * Strip secrets from puzzle config for client consumption.
 * The correct letter position is randomized in ring letters,
 * so the client can't deduce it from the index.
 */
export const toClientPuzzleData = (
  puzzle: PuzzleConfig,
  creatorName: string,
  isDaily: boolean
): ClientPuzzleData => {
  const rings: ClientRingData[] = puzzle.rings.map((ring) => {
    if (ring.isFixed) {
      return {
        letters: ring.letters,
        isFixed: true,
        fixedLetter: ring.letters[0]
      }
    }
    return {
      letters: ring.letters,
      isFixed: false,
      fixedLetter: undefined
    }
  })

  return {
    wordLength: puzzle.wordLength,
    rings,
    fixedIndices: puzzle.fixedIndices,
    difficulty: puzzle.difficulty,
    creatorName,
    isDaily
  }
}

// ─── Guess Evaluation ────────────────────────────────────────────────────────

/**
 * Evaluate a guess against the answer.
 * Uses Wordle-style feedback: correct (green), present (yellow), absent (grey).
 */
export const evaluateGuess = (
  guess: string,
  answer: string,
  attemptsUsed: number
): GuessResult => {
  const feedback: LetterFeedback[] = Array.from({ length: answer.length }, () => 'absent')
  const answerChars = [...answer]
  const guessChars = [...guess.toLowerCase()]

  // Track which answer positions have been matched
  const matched = new Set<number>()

  // First pass: mark correct positions (green)
  for (let i = 0; i < answerChars.length; i++) {
    if (guessChars[i] === answerChars[i]) {
      feedback[i] = 'correct'
      matched.add(i)
    }
  }

  // Second pass: mark present letters (yellow)
  for (let i = 0; i < guessChars.length; i++) {
    if (feedback[i] === 'correct') continue

    // Find an unmatched position in the answer with this letter
    for (let j = 0; j < answerChars.length; j++) {
      if (!matched.has(j) && guessChars[i] === answerChars[j]) {
        feedback[i] = 'present'
        matched.add(j)
        break
      }
    }
  }

  const newAttemptsUsed = attemptsUsed + 1
  const isCorrect = guess.toLowerCase() === answer.toLowerCase()
  const attemptsRemaining = MAX_ATTEMPTS - newAttemptsUsed
  const gameStatus = isCorrect ? 'solved' : attemptsRemaining <= 0 ? 'failed' : 'playing'

  return {
    feedback,
    isCorrect,
    attemptsUsed: newAttemptsUsed,
    attemptsRemaining,
    gameStatus,
    answer: gameStatus === 'solved' ? answer : undefined
  }
}
