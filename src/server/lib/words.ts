import { redis } from '@devvit/web/server'

import words from '../data/words.json'

// ─── Redis Keys ──────────────────────────────────────────────────────────────

const DICT_KEY_PREFIX = 'dict'
const DICT_LOADED_KEY = 'dict:loaded'

/** Redis key for the word dictionary sorted set of a given length */
const dictKey = (length: number): string => `${DICT_KEY_PREFIX}:${length}`

// ─── Loading ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500

/**
 * Lazily loads the word list into Redis sorted sets (one per word length).
 * Uses a flag key to avoid reloading on every request.
 */
export const ensureWordsLoaded = async (): Promise<void> => {
  const loaded = await redis.get(DICT_LOADED_KEY)
  if (loaded === 'true') return

  // Group words by length
  const byLength = new Map<number, string[]>()
  for (const word of words) {
    const len = word.length
    const existing = byLength.get(len)
    if (existing) {
      existing.push(word)
    } else {
      byLength.set(len, [word])
    }
  }

  // Load each length group into its own sorted set
  for (const [len, wordList] of byLength) {
    // Batch to stay under payload limits
    for (let i = 0; i < wordList.length; i += BATCH_SIZE) {
      const batch = wordList.slice(i, i + BATCH_SIZE)
      const members = batch.map((w) => ({ member: w, score: 0 }))
      await redis.zAdd(dictKey(len), ...members)
    }
  }

  await redis.set(DICT_LOADED_KEY, 'true')
}

// ─── Validation ──────────────────────────────────────────────────────────────

/** Check if a word exists in the dictionary */
export const isValidWord = async (word: string): Promise<boolean> => {
  const lower = word.toLowerCase()
  const score = await redis.zScore(dictKey(lower.length), lower)
  return score !== undefined && score !== null
}

// ─── Random Word Selection ───────────────────────────────────────────────────

/**
 * Pick a random word of the specified length from Redis.
 * Falls back to in-memory filter if Redis is empty.
 */
export const getRandomWord = async (length: number): Promise<string> => {
  await ensureWordsLoaded()

  const count = await redis.zCard(dictKey(length))
  if (count === 0) {
    throw new Error(`No words of length ${length} in dictionary`)
  }

  const randomIndex = Math.floor(Math.random() * count)
  const result = await redis.zRange(dictKey(length), randomIndex, randomIndex, { by: 'rank' })

  const entry = result[0]
  if (!entry) {
    throw new Error(`Failed to pick random word of length ${length}`)
  }

  return entry.member
}

/** Get total word count for a given length */
export const getWordCount = async (length: number): Promise<number> => {
  return await redis.zCard(dictKey(length))
}
