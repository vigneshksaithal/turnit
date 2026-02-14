import { redis } from '@devvit/web/server'

import type { AchievementId, UserStats } from '../../shared/types'
import { DEFAULT_USER_STATS } from '../../shared/types'

// ─── Redis Keys ──────────────────────────────────────────────────────────────

const userStatsKey = (userId: string): string => `user:${userId}:stats`

// ─── Stats CRUD ──────────────────────────────────────────────────────────────

export const getUserStats = async (userId: string): Promise<UserStats> => {
  const raw = await redis.get(userStatsKey(userId))
  if (!raw) return { ...DEFAULT_USER_STATS, attemptDistribution: [...DEFAULT_USER_STATS.attemptDistribution], achievements: [] }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_USER_STATS, attemptDistribution: [...DEFAULT_USER_STATS.attemptDistribution], achievements: [] }
    }
    return parsed as UserStats
  } catch {
    return { ...DEFAULT_USER_STATS, attemptDistribution: [...DEFAULT_USER_STATS.attemptDistribution], achievements: [] }
  }
}

export const saveUserStats = async (userId: string, stats: UserStats): Promise<void> => {
  await redis.set(userStatsKey(userId), JSON.stringify(stats))
}

// ─── Streak Calculation ──────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000

/** Check if two ISO date strings are consecutive calendar days */
const isConsecutiveDay = (lastDate: string, currentDate: string): boolean => {
  if (!lastDate) return false
  const last = new Date(lastDate)
  const current = new Date(currentDate)
  const lastDay = Math.floor(last.getTime() / MS_PER_DAY)
  const currentDay = Math.floor(current.getTime() / MS_PER_DAY)
  return currentDay - lastDay === 1
}

/** Check if the date is the same calendar day */
const isSameDay = (dateA: string, dateB: string): boolean => {
  if (!dateA || !dateB) return false
  const a = Math.floor(new Date(dateA).getTime() / MS_PER_DAY)
  const b = Math.floor(new Date(dateB).getTime() / MS_PER_DAY)
  return a === b
}

// ─── Stats Update on Solve ───────────────────────────────────────────────────

/**
 * Update user stats after a successful solve.
 * Returns the updated stats and any newly earned achievements.
 */
export const recordSolve = async (
  userId: string,
  attemptsUsed: number
): Promise<{ stats: UserStats; newAchievements: AchievementId[] }> => {
  const stats = await getUserStats(userId)
  const now = new Date().toISOString()
  const newAchievements: AchievementId[] = []

  // Update basic counts
  stats.totalSolved += 1
  stats.totalPlayed += 1

  // Update attempt distribution (0-indexed: index 0 = solved in 1 attempt)
  const distIndex = attemptsUsed - 1
  if (distIndex >= 0 && distIndex < stats.attemptDistribution.length) {
    stats.attemptDistribution[distIndex] = (stats.attemptDistribution[distIndex] ?? 0) + 1
  }

  // Update streak
  if (isSameDay(stats.lastSolveDate, now)) {
    // Already solved today — streak stays the same
  } else if (isConsecutiveDay(stats.lastSolveDate, now)) {
    stats.currentStreak += 1
  } else {
    stats.currentStreak = 1
  }
  stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak)
  stats.lastSolveDate = now

  // Check achievements
  const earned = new Set(stats.achievements)

  if (!earned.has('first_crack') && stats.totalSolved >= 1) {
    newAchievements.push('first_crack')
    stats.achievements.push('first_crack')
  }
  if (!earned.has('locksmith') && stats.totalSolved >= 25) {
    newAchievements.push('locksmith')
    stats.achievements.push('locksmith')
  }
  if (!earned.has('lock_master') && stats.totalSolved >= 50) {
    newAchievements.push('lock_master')
    stats.achievements.push('lock_master')
  }
  if (!earned.has('hot_streak') && stats.currentStreak >= 5) {
    newAchievements.push('hot_streak')
    stats.achievements.push('hot_streak')
  }
  if (!earned.has('unbreakable') && stats.currentStreak >= 10) {
    newAchievements.push('unbreakable')
    stats.achievements.push('unbreakable')
  }
  if (!earned.has('speed_demon') && attemptsUsed === 1) {
    newAchievements.push('speed_demon')
    stats.achievements.push('speed_demon')
  }

  await saveUserStats(userId, stats)

  return { stats, newAchievements }
}

/**
 * Record a failed attempt (used all guesses without solving).
 */
export const recordFail = async (userId: string): Promise<UserStats> => {
  const stats = await getUserStats(userId)

  stats.totalPlayed += 1
  // Streak broken on fail — reset
  stats.currentStreak = 0

  await saveUserStats(userId, stats)
  return stats
}
