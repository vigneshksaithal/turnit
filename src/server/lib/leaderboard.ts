import { redis, reddit } from '@devvit/web/server'

import type { LeaderboardEntry } from '../../shared/types'

// ─── Redis Keys ──────────────────────────────────────────────────────────────

/** Post-level leaderboard: sorted by fewest attempts (lower = better) */
const postLeaderboardKey = (postId: string): string => `leaderboard:post:${postId}`

/** Global leaderboard: sorted by total solves (higher = better) */
const GLOBAL_LEADERBOARD_KEY = 'leaderboard:global:solves'

// ─── Post Leaderboard ────────────────────────────────────────────────────────

/**
 * Record a solve on the post leaderboard.
 * Score = attempts used (lower is better).
 */
export const recordPostSolve = async (
  postId: string,
  userId: string,
  attemptsUsed: number
): Promise<void> => {
  await redis.zAdd(postLeaderboardKey(postId), { member: userId, score: attemptsUsed })
}

/**
 * Get top solvers for a specific post, ranked by fewest attempts.
 */
export const getPostLeaderboard = async (
  postId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> => {
  const results = await redis.zRange(postLeaderboardKey(postId), 0, limit - 1, { by: 'rank' })

  const entries: LeaderboardEntry[] = []
  for (let i = 0; i < results.length; i++) {
    const entry = results[i]
    if (!entry) continue

    let username = 'Anonymous'
    try {
      const user = await reddit.getUserById(entry.member as `t2_${string}`)
      if (user?.username) {
        username = user.username
      }
    } catch {
      // User lookup failed, keep "Anonymous"
    }

    entries.push({
      username,
      score: entry.score,
      rank: i + 1
    })
  }

  return entries
}

/** Get total solvers for a post */
export const getPostSolverCount = async (postId: string): Promise<number> => {
  return await redis.zCard(postLeaderboardKey(postId))
}

// ─── Global Leaderboard ──────────────────────────────────────────────────────

/**
 * Increment a user's global solve count.
 */
export const incrementGlobalSolves = async (userId: string): Promise<void> => {
  await redis.zIncrBy(GLOBAL_LEADERBOARD_KEY, userId, 1)
}

/**
 * Get top solvers globally, ranked by most total solves.
 */
export const getGlobalLeaderboard = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  // Reverse: highest score first
  const results = await redis.zRange(GLOBAL_LEADERBOARD_KEY, '+', '-', {
    by: 'score',
    reverse: true,
    limit: { offset: 0, count: limit }
  })

  const entries: LeaderboardEntry[] = []
  for (let i = 0; i < results.length; i++) {
    const entry = results[i]
    if (!entry) continue

    let username = 'Anonymous'
    try {
      const user = await reddit.getUserById(entry.member as `t2_${string}`)
      if (user?.username) {
        username = user.username
      }
    } catch {
      // User lookup failed
    }

    entries.push({
      username,
      score: entry.score,
      rank: i + 1
    })
  }

  return entries
}
