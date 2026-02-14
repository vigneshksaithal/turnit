<script lang="ts">
  import type { ClientPuzzleData, GameStatus, LetterFeedback } from '../../shared/types'
  import { MAX_ATTEMPTS } from '../../shared/types'
  import { loadPuzzle, submitGuess } from '../lib/api'
  import Lock from '../components/Lock.svelte'
  import Lives from '../components/Lives.svelte'
  import SuccessOverlay from '../components/SuccessOverlay.svelte'
  import FailureOverlay from '../components/FailureOverlay.svelte'
  import HowToPlayModal from '../components/HowToPlayModal.svelte'

  // ─── State ───────────────────────────────────────────────────────────────────

  let puzzle = $state<ClientPuzzleData | null>(null)
  let isLoading = $state(true)
  let error = $state<string | null>(null)
  let isCreator = $state(false)
  let gameStatus = $state<GameStatus>('playing')
  let attemptsUsed = $state(0)
  let feedbacks = $state<(LetterFeedback | null)[]>([])
  let isSubmitting = $state(false)
  let answer = $state<string | null>(null)
  let showSuccessAnim = $state(false)
  let showFailureAnim = $state(false)
  let isShaking = $state(false)
  let showHowToPlay = $state(false)

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const difficultyLabel = $derived(
    puzzle?.difficulty === 'easy' ? 'Easy'
    : puzzle?.difficulty === 'medium' ? 'Medium'
    : 'Hard'
  )

  const difficultyClasses = $derived(
    puzzle?.difficulty === 'easy' ? 'bg-green-600/20 text-green-400'
    : puzzle?.difficulty === 'medium' ? 'bg-yellow-600/20 text-yellow-400'
    : 'bg-red-600/20 text-red-400'
  )

  const isSolved = $derived(gameStatus === 'solved')
  const isFailed = $derived(gameStatus === 'failed')
  const isPlaying = $derived(gameStatus === 'playing' && puzzle !== null && !isCreator)

  // ─── Load Puzzle ─────────────────────────────────────────────────────────────

  $effect(() => {
    const load = async (): Promise<void> => {
      try {
        const result = await loadPuzzle()
        puzzle = result.puzzle
        isCreator = result.isCreator

        if (result.session) {
          attemptsUsed = result.session.attemptsUsed
          if (result.session.status !== 'playing') {
            gameStatus = result.session.status
          }
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load puzzle'
      } finally {
        isLoading = false
      }
    }

    load()
  })

  // ─── Guess Handler ───────────────────────────────────────────────────────────

  const handleGuess = async (guess: string): Promise<void> => {
    if (isSubmitting || !puzzle) return

    isSubmitting = true

    try {
      const result = await submitGuess(guess)

      // Show feedback colors on the rings
      feedbacks = result.feedback

      // Wait for user to see the feedback
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1500)
      })

      // Clear feedbacks
      feedbacks = []

      // Update attempts
      attemptsUsed = result.attemptsUsed

      // Check end states
      if (result.gameStatus === 'solved') {
        answer = result.answer ?? guess
        showSuccessAnim = true
        gameStatus = 'solved'
      } else if (result.gameStatus === 'failed') {
        // Shake the lock first
        isShaking = true
        setTimeout(() => {
          isShaking = false
          showFailureAnim = true
          gameStatus = 'failed'
        }, 600)
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to submit guess'
    } finally {
      isSubmitting = false
    }
  }
</script>

<div class="h-full flex flex-col overflow-hidden">
  <!-- Top: puzzle info + difficulty badge -->
  {#if puzzle && !isLoading && !isCreator}
    <header class="flex-none px-4 pt-3 pb-2 text-center">
      <div class="flex items-center justify-center gap-2">
        <p class="text-sm text-[var(--color-text-secondary)]">
          {puzzle.wordLength}-letter puzzle by
          <span class="font-medium text-[var(--color-text-primary)]">u/{puzzle.creatorName}</span>
        </p>
        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold {difficultyClasses}">
          {difficultyLabel}
        </span>
      </div>
    </header>
  {/if}

  <!-- Middle: main content area (centered, takes remaining space) -->
  <main class="flex-1 flex flex-col items-center justify-center gap-2 overflow-hidden px-4">
    <!-- Loading -->
    {#if isLoading}
      <p class="text-sm text-[var(--color-text-muted)] animate-pulse">Loading puzzle...</p>

    <!-- Error -->
    {:else if error}
      <p class="text-sm text-[var(--color-accent)] text-center">{error}</p>

    <!-- Creator cannot play their own puzzle -->
    {:else if isCreator}
      <div class="text-center">
        <p class="text-lg font-semibold text-[var(--color-text-primary)]">
          You created this puzzle
        </p>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">
          You can't play your own!
        </p>
      </div>

    <!-- Already solved -->
    {:else if isSolved && !isPlaying}
      <div class="relative">
        <Lock
          rings={puzzle?.rings ?? []}
          disabled={true}
          isOpen={true}
        />
        {#if showSuccessAnim && answer}
          <SuccessOverlay {answer} {attemptsUsed} />
        {/if}
      </div>
      {#if !showSuccessAnim}
        <div class="text-center mt-2">
          <p class="text-lg font-semibold text-[var(--color-feedback-correct)]">
            You already cracked this lock!
          </p>
        </div>
      {/if}

    <!-- Already failed -->
    {:else if isFailed && !isPlaying}
      {#if puzzle}
        <div class="relative">
          <Lock
            rings={puzzle.rings}
            disabled={true}
          />
          {#if showFailureAnim}
            <FailureOverlay />
          {/if}
        </div>
      {/if}
      {#if !showFailureAnim}
        <div class="text-center mt-2">
          <p class="text-lg font-semibold text-[var(--color-accent)]">
            The lock stays shut.
          </p>
          <p class="mt-1 text-sm text-[var(--color-text-muted)]">
            Better luck next time
          </p>
        </div>
      {/if}

    <!-- Playing -->
    {:else if puzzle}
      <div class="relative" style:animation={isShaking ? 'shake 0.6s ease-in-out' : 'none'}>
        <Lock
          rings={puzzle.rings}
          {feedbacks}
          disabled={isSubmitting || isShaking}
          isOpen={false}
          onSubmit={handleGuess}
        />
      </div>
      <Lives
        totalAttempts={MAX_ATTEMPTS}
        {attemptsUsed}
      />
      <button
        class="mt-1 text-xs font-medium text-[var(--color-text-muted)] underline hover:text-[var(--color-accent)]"
        onclick={() => showHowToPlay = true}
      >
        How to Play
      </button>
    {/if}
  </main>

  <!-- How to Play modal -->
  {#if showHowToPlay}
    <HowToPlayModal onClose={() => showHowToPlay = false} />
  {/if}
</div>
