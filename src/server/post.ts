import { context, reddit } from '@devvit/web/server'
import type { JsonObject } from '@devvit/web/shared'

import type { PostData } from '../shared/types'
import { generatePuzzle } from './lib/puzzle'
import { ensureWordsLoaded, getRandomWord, isValidWord } from './lib/words'

// ─── Redis Keys ──────────────────────────────────────────────────────────────

const puzzleConfigKey = (postId: string): string => `puzzle:${postId}:config`

// ─── Post Creation (user-created puzzle) ─────────────────────────────────────

export const createCustomPuzzle = async (word: string, creatorName: string): Promise<{ postUrl: string }> => {
  const { subredditName } = context
  if (!subredditName) {
    throw new Error('subredditName is required')
  }

  await ensureWordsLoaded()

  const lower = word.toLowerCase()
  const valid = await isValidWord(lower)
  if (!valid) {
    throw new Error(`"${word}" is not in the dictionary`)
  }

  // Generate puzzle with medium difficulty for user-created puzzles
  const puzzle = generatePuzzle(lower, 'medium')

  const postData: PostData = {
    wordLength: lower.length,
    creatorName,
    createdAt: new Date().toISOString(),
    isDaily: false
  }

  const post = await reddit.submitCustomPost({
    subredditName,
    title: `Crack the Lock: ${lower.length}-letter puzzle by u/${creatorName}`,
    entry: 'default',
    postData: postData as unknown as JsonObject
  })

  // Store puzzle config in Redis (secret, never sent to client directly)
  const { redis } = await import('@devvit/web/server')
  await redis.set(puzzleConfigKey(post.id), JSON.stringify(puzzle))

  return {
    postUrl: `https://reddit.com/r/${subredditName}/comments/${post.id}`
  }
}

// ─── Daily Puzzle Creation ───────────────────────────────────────────────────

export const createDailyPuzzle = async (): Promise<void> => {
  const { subredditName } = context
  if (!subredditName) {
    throw new Error('subredditName is required')
  }

  await ensureWordsLoaded()

  // Pick a random 5-letter word for daily puzzle
  const DAILY_WORD_LENGTH = 5
  const word = await getRandomWord(DAILY_WORD_LENGTH)
  const puzzle = generatePuzzle(word, 'medium')

  const postData: PostData = {
    wordLength: DAILY_WORD_LENGTH,
    creatorName: 'TurnIt Bot',
    createdAt: new Date().toISOString(),
    isDaily: true
  }

  const post = await reddit.submitCustomPost({
    subredditName,
    title: `Daily Lock: ${DAILY_WORD_LENGTH}-letter puzzle`,
    entry: 'default',
    postData: postData as unknown as JsonObject
  })

  const { redis } = await import('@devvit/web/server')
  await redis.set(puzzleConfigKey(post.id), JSON.stringify(puzzle))
}

// ─── Legacy createPost (for app install trigger) ─────────────────────────────

export const createPost = async (): Promise<{ id: string }> => {
  const { subredditName } = context
  if (!subredditName) {
    throw new Error('subredditName is required')
  }

  await ensureWordsLoaded()

  const WELCOME_WORD_LENGTH = 4
  const word = await getRandomWord(WELCOME_WORD_LENGTH)
  const puzzle = generatePuzzle(word, 'easy')

  const postData: PostData = {
    wordLength: WELCOME_WORD_LENGTH,
    creatorName: 'TurnIt Bot',
    createdAt: new Date().toISOString(),
    isDaily: false
  }

  const post = await reddit.submitCustomPost({
    subredditName,
    title: `Welcome to TurnIt! Try this ${WELCOME_WORD_LENGTH}-letter puzzle`,
    entry: 'default',
    postData: postData as unknown as JsonObject
  })

  const { redis } = await import('@devvit/web/server')
  await redis.set(puzzleConfigKey(post.id), JSON.stringify(puzzle))

  return { id: post.id }
}
