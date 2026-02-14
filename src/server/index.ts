import {
  context,
  createServer,
  getServerPort,
  redis
} from '@devvit/web/server'
import type { TaskResponse } from '@devvit/web/server'
import { serve } from '@hono/node-server'
import type { Context } from 'hono'
import { Hono } from 'hono'

import type {
  ApiError,
  ApiSuccess,
  ClientPuzzleData,
  CreatePuzzleRequest,
  CreatePuzzleResponse,
  GameSession,
  GuessResult,
  LeaderboardEntry,
  PuzzleConfig,
  UserStats
} from '../shared/types'
import {
  getGlobalLeaderboard,
  getPostLeaderboard,
  getPostSolverCount,
  incrementGlobalSolves,
  recordPostSolve
} from './lib/leaderboard'
import { evaluateGuess, getDifficulty, toClientPuzzleData } from './lib/puzzle'
import { getUserStats, recordFail, recordSolve } from './lib/scoring'
import { ensureWordsLoaded, isValidWord } from './lib/words'

import { createCustomPuzzle, createDailyPuzzle, createPost } from './post'

// ─── Constants ───────────────────────────────────────────────────────────────

const HTTP_STATUS_BAD_REQUEST = 400
const HTTP_STATUS_NOT_FOUND = 404
const HTTP_STATUS_INTERNAL_ERROR = 500

// ─── Redis Keys ──────────────────────────────────────────────────────────────

const puzzleConfigKey = (postId: string): string => `puzzle:${postId}:config`
const gameSessionKey = (userId: string, postId: string): string => `session:${userId}:${postId}`
const puzzleCreatorKey = (postId: string): string => `puzzle:${postId}:creator`

// ─── App ─────────────────────────────────────────────────────────────────────

const app = new Hono()

// ─── GET /api/puzzle ─────────────────────────────────────────────────────────
// Load puzzle data for the current post. Returns client-safe ring data.

app.get('/api/puzzle', async (c: Context) => {
  try {
    const { postId, userId } = context
    if (!postId) {
      return c.json<ApiError>({ status: 'error', message: 'postId is required' }, HTTP_STATUS_BAD_REQUEST)
    }

    const raw = await redis.get(puzzleConfigKey(postId))
    if (!raw) {
      return c.json<ApiError>({ status: 'error', message: 'Puzzle not found' }, HTTP_STATUS_NOT_FOUND)
    }

    const puzzle = JSON.parse(raw) as PuzzleConfig
    const postData = context.postData as Record<string, unknown> | undefined

    const creatorName = (postData?.['creatorName'] as string | undefined) ?? 'Unknown'
    const isDaily = (postData?.['isDaily'] as boolean | undefined) ?? false

    const clientData = toClientPuzzleData(puzzle, creatorName, isDaily)

    // Check if user already has a session (returning player)
    let session: GameSession | null = null
    if (userId) {
      const sessionRaw = await redis.get(gameSessionKey(userId, postId))
      if (sessionRaw) {
        session = JSON.parse(sessionRaw) as GameSession
      }
    }

    // Check if user is the creator
    const creatorId = await redis.get(puzzleCreatorKey(postId))
    const isCreator = userId !== undefined && userId === creatorId

    return c.json<ApiSuccess<{
      puzzle: ClientPuzzleData
      session: GameSession | null
      isCreator: boolean
    }>>({
      status: 'success',
      data: { puzzle: clientData, session, isCreator }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ApiError>({ status: 'error', message }, HTTP_STATUS_INTERNAL_ERROR)
  }
})

// ─── POST /api/guess ─────────────────────────────────────────────────────────
// Submit a guess for the current puzzle.

app.post('/api/guess', async (c: Context) => {
  try {
    const { postId, userId } = context
    if (!postId) {
      return c.json<ApiError>({ status: 'error', message: 'postId is required' }, HTTP_STATUS_BAD_REQUEST)
    }
    if (!userId) {
      return c.json<ApiError>({ status: 'error', message: 'Must be logged in to guess' }, HTTP_STATUS_BAD_REQUEST)
    }

    const body = await c.req.json<{ guess: string }>()
    const guess = body.guess?.toLowerCase()
    if (!guess) {
      return c.json<ApiError>({ status: 'error', message: 'guess is required' }, HTTP_STATUS_BAD_REQUEST)
    }

    // Load puzzle config
    const raw = await redis.get(puzzleConfigKey(postId))
    if (!raw) {
      return c.json<ApiError>({ status: 'error', message: 'Puzzle not found' }, HTTP_STATUS_NOT_FOUND)
    }
    const puzzle = JSON.parse(raw) as PuzzleConfig

    if (guess.length !== puzzle.wordLength) {
      return c.json<ApiError>({
        status: 'error',
        message: `Guess must be ${puzzle.wordLength} letters`
      }, HTTP_STATUS_BAD_REQUEST)
    }

    // Load or create session
    const sessionRaw = await redis.get(gameSessionKey(userId, postId))
    let session: GameSession

    if (sessionRaw) {
      session = JSON.parse(sessionRaw) as GameSession

      if (session.status !== 'playing') {
        return c.json<ApiError>({
          status: 'error',
          message: session.status === 'solved' ? 'Already solved' : 'No attempts remaining'
        }, HTTP_STATUS_BAD_REQUEST)
      }
    } else {
      // Check if user is the creator
      const creatorId = await redis.get(puzzleCreatorKey(postId))
      if (creatorId === userId) {
        return c.json<ApiError>({
          status: 'error',
          message: 'Cannot play your own puzzle'
        }, HTTP_STATUS_BAD_REQUEST)
      }

      session = {
        postId,
        userId,
        attemptsUsed: 0,
        status: 'playing',
        guesses: [],
        feedbacks: []
      }
    }

    // Evaluate guess
    const result = evaluateGuess(guess, puzzle.answer, session.attemptsUsed)

    // Update session
    session.attemptsUsed = result.attemptsUsed
    session.status = result.gameStatus
    session.guesses.push(guess)
    session.feedbacks.push(result.feedback)

    await redis.set(gameSessionKey(userId, postId), JSON.stringify(session))

    // If solved, update leaderboard + stats
    if (result.gameStatus === 'solved') {
      await recordPostSolve(postId, userId, result.attemptsUsed)
      await incrementGlobalSolves(userId)
      await recordSolve(userId, result.attemptsUsed)
    }

    // If failed, record failure
    if (result.gameStatus === 'failed') {
      await recordFail(userId)
    }

    return c.json<ApiSuccess<GuessResult>>({
      status: 'success',
      data: result
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ApiError>({ status: 'error', message }, HTTP_STATUS_INTERNAL_ERROR)
  }
})

// ─── GET /api/stats ──────────────────────────────────────────────────────────
// Get current user's stats.

app.get('/api/stats', async (c: Context) => {
  try {
    const { userId } = context
    if (!userId) {
      return c.json<ApiError>({ status: 'error', message: 'Not logged in' }, HTTP_STATUS_BAD_REQUEST)
    }

    const stats = await getUserStats(userId)
    const difficulty = getDifficulty(stats.currentStreak)

    return c.json<ApiSuccess<{ stats: UserStats; difficulty: string }>>({
      status: 'success',
      data: { stats, difficulty }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ApiError>({ status: 'error', message }, HTTP_STATUS_INTERNAL_ERROR)
  }
})

// ─── GET /api/leaderboard/post ───────────────────────────────────────────────
// Get leaderboard for current post.

app.get('/api/leaderboard/post', async (c: Context) => {
  try {
    const { postId } = context
    if (!postId) {
      return c.json<ApiError>({ status: 'error', message: 'postId is required' }, HTTP_STATUS_BAD_REQUEST)
    }

    const entries = await getPostLeaderboard(postId)
    const totalSolvers = await getPostSolverCount(postId)

    return c.json<ApiSuccess<{ entries: LeaderboardEntry[]; totalSolvers: number }>>({
      status: 'success',
      data: { entries, totalSolvers }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ApiError>({ status: 'error', message }, HTTP_STATUS_INTERNAL_ERROR)
  }
})

// ─── GET /api/leaderboard/global ─────────────────────────────────────────────

app.get('/api/leaderboard/global', async (c: Context) => {
  try {
    const entries = await getGlobalLeaderboard()

    return c.json<ApiSuccess<{ entries: LeaderboardEntry[] }>>({
      status: 'success',
      data: { entries }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ApiError>({ status: 'error', message }, HTTP_STATUS_INTERNAL_ERROR)
  }
})

// ─── POST /api/create ────────────────────────────────────────────────────────
// Create a new puzzle (user-created).

app.post('/api/create', async (c: Context) => {
  try {
    const { userId } = context
    if (!userId) {
      return c.json<ApiError>({ status: 'error', message: 'Must be logged in' }, HTTP_STATUS_BAD_REQUEST)
    }

    const body = await c.req.json<CreatePuzzleRequest>()
    const word = body.word?.toLowerCase()
    if (!word) {
      return c.json<ApiError>({ status: 'error', message: 'word is required' }, HTTP_STATUS_BAD_REQUEST)
    }

    if (word.length < 3 || word.length > 6) {
      return c.json<ApiError>({
        status: 'error',
        message: 'Word must be 3-6 letters'
      }, HTTP_STATUS_BAD_REQUEST)
    }

    // Get creator username
    let creatorName = 'Anonymous'
    try {
      const user = await (await import('@devvit/web/server')).reddit.getCurrentUser()
      if (user?.username) {
        creatorName = user.username
      }
    } catch {
      // Fallback to Anonymous
    }

    const result = await createCustomPuzzle(word, creatorName)

    return c.json<ApiSuccess<CreatePuzzleResponse>>({
      status: 'success',
      data: { navigateTo: result.postUrl }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ApiError>({ status: 'error', message }, HTTP_STATUS_BAD_REQUEST)
  }
})

// ─── POST /api/validate-word ─────────────────────────────────────────────────
// Check if a word is valid before creating a puzzle.

app.post('/api/validate-word', async (c: Context) => {
  try {
    await ensureWordsLoaded()
    const body = await c.req.json<{ word: string }>()
    const word = body.word?.toLowerCase()
    if (!word) {
      return c.json<ApiSuccess<{ valid: boolean }>>({ status: 'success', data: { valid: false } })
    }

    const valid = await isValidWord(word)
    return c.json<ApiSuccess<{ valid: boolean }>>({ status: 'success', data: { valid } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ApiError>({ status: 'error', message }, HTTP_STATUS_INTERNAL_ERROR)
  }
})

// ─── Internal: Menu item to create post ──────────────────────────────────────

const createPostHandler = async (c: Context) => {
  try {
    const post = await createPost()
    return c.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create post'
    return c.json<ApiError>({ status: 'error', message: errorMessage }, HTTP_STATUS_BAD_REQUEST)
  }
}

app.post('/internal/on-app-install', createPostHandler)
app.post('/internal/menu/post-create', createPostHandler)

// ─── Internal: Daily puzzle scheduler ────────────────────────────────────────

app.post('/internal/scheduler/daily-puzzle', async (c: Context) => {
  try {
    await createDailyPuzzle()
    return c.json<TaskResponse>({ status: 'ok' }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create daily puzzle'
    console.error('Daily puzzle creation failed:', message)
    return c.json<TaskResponse>({ status: 'ok' }, 200)
  }
})

// ─── Server Bootstrap ────────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: getServerPort(), createServer })
