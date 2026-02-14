<script lang="ts">
  import type { LeaderboardEntry } from '../../shared/types'
  import { loadPostLeaderboard, loadGlobalLeaderboard } from '../lib/api'

  // ─── State ───────────────────────────────────────────────────────────────────

  let activeTab = $state<'post' | 'global'>('post')
  let postEntries = $state<LeaderboardEntry[]>([])
  let globalEntries = $state<LeaderboardEntry[]>([])
  let totalSolvers = $state(0)
  let isLoading = $state(true)
  let error = $state<string | null>(null)
  let globalLoaded = $state(false)

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const entries = $derived(activeTab === 'post' ? postEntries : globalEntries)

  const emptyMessage = $derived(
    activeTab === 'post'
      ? 'No one has cracked this lock yet'
      : 'No global data yet'
  )

  // ─── Rank Colors ─────────────────────────────────────────────────────────────

  const getRankColor = (rank: number): string => {
    if (rank === 1) return 'text-[#d4a017]'
    if (rank === 2) return 'text-[#8a8a9a]'
    if (rank === 3) return 'text-[#cd7f32]'
    return 'text-[var(--color-text-secondary)]'
  }

  // ─── Load Post Leaderboard (on mount) ────────────────────────────────────────

  $effect(() => {
    const load = async (): Promise<void> => {
      try {
        const result = await loadPostLeaderboard()
        postEntries = result.entries
        totalSolvers = result.totalSolvers
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load leaderboard'
      } finally {
        isLoading = false
      }
    }

    load()
  })

  // ─── Lazy-load Global Leaderboard ────────────────────────────────────────────

  $effect(() => {
    if (activeTab !== 'global' || globalLoaded) return

    const load = async (): Promise<void> => {
      isLoading = true
      error = null

      try {
        const result = await loadGlobalLeaderboard()
        globalEntries = result.entries
        globalLoaded = true
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load global leaderboard'
      } finally {
        isLoading = false
      }
    }

    load()
  })

  // ─── Tab Switching ───────────────────────────────────────────────────────────

  const switchTab = (tab: 'post' | 'global'): void => {
    activeTab = tab
  }
</script>

<div class="h-full flex flex-col overflow-hidden">
  <!-- Tab Bar -->
  <div class="flex-none px-4 pt-3 pb-2">
    <div class="flex rounded-full bg-[var(--color-bg-surface)] p-1 gap-1">
      <button
        type="button"
        class="flex-1 min-h-[44px] rounded-full text-sm font-semibold transition-colors {activeTab === 'post'
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--color-text-muted)]'}"
        onclick={() => switchTab('post')}
      >
        This Puzzle
      </button>
      <button
        type="button"
        class="flex-1 min-h-[44px] rounded-full text-sm font-semibold transition-colors {activeTab === 'global'
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--color-text-muted)]'}"
        onclick={() => switchTab('global')}
      >
        Global
      </button>
    </div>
  </div>

  <!-- Subheader (post tab only) -->
  {#if activeTab === 'post' && !isLoading && !error && totalSolvers > 0}
    <div class="flex-none px-4 pb-2">
      <p class="text-xs text-[var(--color-text-muted)] text-center">
        {totalSolvers} player{totalSolvers === 1 ? '' : 's'} cracked this lock
      </p>
    </div>
  {/if}

  <!-- Column Headers -->
  {#if !isLoading && !error && entries.length > 0}
    <div class="flex-none px-4 pb-1">
      <div class="flex items-center text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
        <span class="w-10 text-center">#</span>
        <span class="flex-1">Player</span>
        <span class="w-20 text-right">
          {activeTab === 'post' ? 'Attempts' : 'Score'}
        </span>
      </div>
    </div>
  {/if}

  <!-- Content Area -->
  <div class="flex-1 overflow-y-auto px-4 pb-4">
    {#if isLoading}
      <div class="flex items-center justify-center h-full">
        <p class="text-sm text-[var(--color-text-muted)] animate-pulse">Loading...</p>
      </div>

    {:else if error}
      <div class="flex items-center justify-center h-full">
        <p class="text-sm text-[var(--color-accent)] text-center">{error}</p>
      </div>

    {:else if entries.length === 0}
      <div class="flex items-center justify-center h-full">
        <p class="text-sm text-[var(--color-text-muted)] text-center">{emptyMessage}</p>
      </div>

    {:else}
      <ul class="space-y-1">
        {#each entries as entry (entry.rank)}
          <li class="flex items-center rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--color-bg-surface)]">
            <span class="w-10 text-center text-sm font-bold {getRankColor(entry.rank)}">
              {entry.rank}
            </span>
            <span class="flex-1 text-sm font-medium text-[var(--color-text-primary)] truncate">
              {entry.username}
            </span>
            <span class="w-20 text-right text-sm tabular-nums text-[var(--color-text-secondary)]">
              {entry.score}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
