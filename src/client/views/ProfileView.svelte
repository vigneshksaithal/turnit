<script lang="ts">
  import type { UserStats, AchievementId } from '../../shared/types'
  import { ACHIEVEMENTS } from '../../shared/types'
  import { loadStats } from '../lib/api'

  // ─── Icon Map ──────────────────────────────────────────────────────────────────

  const ICON_MAP: Record<string, string> = {
    unlock: '🔓',
    key: '🔑',
    crown: '👑',
    flame: '🔥',
    shield: '🛡️',
    zap: '⚡'
  }

  // ─── State ───────────────────────────────────────────────────────────────────

  let stats = $state<UserStats | null>(null)
  let difficulty = $state<string>('easy')
  let isLoading = $state(true)
  let error = $state<string | null>(null)

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const winRate = $derived(
    stats && stats.totalPlayed > 0
      ? Math.round((stats.totalSolved / stats.totalPlayed) * 100)
      : 0
  )

  const maxDistribution = $derived(
    stats
      ? Math.max(...stats.attemptDistribution, 1)
      : 1
  )

  const difficultyLabel = $derived(
    difficulty === 'easy' ? 'Easy'
    : difficulty === 'medium' ? 'Medium'
    : 'Hard'
  )

  const difficultyClasses = $derived(
    difficulty === 'easy' ? 'bg-green-600/20 text-green-400'
    : difficulty === 'medium' ? 'bg-yellow-600/20 text-yellow-400'
    : 'bg-red-600/20 text-red-400'
  )

  const hasPlayed = $derived(stats !== null && stats.totalPlayed > 0)

  // ─── Load Stats ──────────────────────────────────────────────────────────────

  $effect(() => {
    const load = async (): Promise<void> => {
      try {
        const result = await loadStats()
        stats = result.stats
        difficulty = result.difficulty
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load stats'
      } finally {
        isLoading = false
      }
    }

    load()
  })

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const isEarned = (id: AchievementId): boolean => {
    return stats?.achievements.includes(id) ?? false
  }

  const getBarWidth = (count: number): string => {
    const percentage = (count / maxDistribution) * 100
    return `${Math.max(percentage, 4)}%`
  }
</script>

<div class="h-full flex flex-col overflow-hidden">
  <!-- Loading -->
  {#if isLoading}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-sm text-[var(--color-text-muted)] animate-pulse">Loading stats...</p>
    </div>

  <!-- Error -->
  {:else if error}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-sm text-red-400 text-center px-4">{error}</p>
    </div>

  <!-- Never played -->
  {:else if !hasPlayed}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-sm text-[var(--color-text-muted)] text-center px-4">
        Play your first puzzle to see stats!
      </p>
    </div>

  <!-- Stats content -->
  {:else if stats}
    <div class="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
      <!-- Stats Grid (2x2) -->
      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
          <p class="text-xs text-[var(--color-text-muted)]">Solved</p>
          <p class="text-xl font-bold text-[var(--color-text-primary)]">
            {stats.totalSolved} / {stats.totalPlayed}
          </p>
        </div>
        <div class="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
          <p class="text-xs text-[var(--color-text-muted)]">Win Rate</p>
          <p class="text-xl font-bold text-[var(--color-text-primary)]">{winRate}%</p>
        </div>
        <div class="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
          <p class="text-xs text-[var(--color-text-muted)]">Current Streak</p>
          <p class="text-xl font-bold text-[var(--color-text-primary)]">
            {stats.currentStreak}{#if stats.currentStreak > 0}<span class="ml-1">🔥</span>{/if}
          </p>
        </div>
        <div class="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
          <p class="text-xs text-[var(--color-text-muted)]">Best Streak</p>
          <p class="text-xl font-bold text-[var(--color-text-primary)]">{stats.bestStreak}</p>
        </div>
      </div>

      <!-- Difficulty Level -->
      <div class="text-center">
        <span class="text-sm text-[var(--color-text-secondary)]">Your level: </span>
        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold {difficultyClasses}">
          {difficultyLabel}
        </span>
      </div>

      <!-- Attempt Distribution -->
      <div>
        <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Attempt Distribution
        </p>
        <div class="space-y-1.5">
          {#each stats.attemptDistribution as count, i (i)}
            <div class="flex items-center gap-2">
              <span class="w-4 text-xs text-[var(--color-text-secondary)] text-right font-medium">
                {i + 1}
              </span>
              <div class="flex-1 h-5 rounded bg-[var(--color-bg-surface)] overflow-hidden">
                <div
                  class="h-full rounded bg-[var(--color-accent)] transition-all"
                  style="width: {getBarWidth(count)}"
                ></div>
              </div>
              <span class="w-6 text-xs text-[var(--color-text-secondary)] text-right tabular-nums">
                {count}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Achievements -->
      <div>
        <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Achievements
        </p>
        <div class="grid grid-cols-2 gap-2">
          {#each ACHIEVEMENTS as achievement (achievement.id)}
            {@const earned = isEarned(achievement.id)}
            <div
              class="rounded-lg bg-[var(--color-bg-secondary)] p-3 {earned ? '' : 'opacity-40'}"
            >
              <div class="flex items-center gap-2">
                <span class="text-lg">{ICON_MAP[achievement.icon] ?? '?'}</span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                    {achievement.name}
                  </p>
                  <p class="text-xs text-[var(--color-text-muted)] truncate">
                    {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
