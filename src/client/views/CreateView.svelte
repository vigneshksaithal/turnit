<script lang="ts">
  import { untrack } from 'svelte'
  import { validateWord, createPuzzle } from '../lib/api'
  import { MIN_WORD_LENGTH, MAX_WORD_LENGTH } from '../../shared/types'

  // ─── State ───────────────────────────────────────────────────────────────────

  let word = $state('')
  let validationResult = $state<{ valid: boolean; message: string } | null>(null)
  let isValidating = $state(false)
  let isCreating = $state(false)
  let error = $state<string | null>(null)
  let created = $state(false)
  let navigateUrl = $state<string | null>(null)

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const charCount = $derived(`${word.length}/${MAX_WORD_LENGTH}`)
  const isValid = $derived(validationResult?.valid === true)
  const validationMessage = $derived(validationResult?.message ?? null)
  const canCreate = $derived(isValid && !isValidating && !isCreating && word.length >= MIN_WORD_LENGTH)

  // ─── Input Handler ───────────────────────────────────────────────────────────

  const handleInput = (e: Event): void => {
    const target = e.target as HTMLInputElement
    const filtered = target.value.toLowerCase().replace(/[^a-z]/g, '')
    word = filtered.slice(0, MAX_WORD_LENGTH)
    target.value = word
    error = null
    validationResult = null
  }

  // ─── Debounced Validation ────────────────────────────────────────────────────

  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const runValidation = async (targetWord: string): Promise<void> => {
    try {
      const valid = await validateWord(targetWord)
      // Only update if word hasn't changed during validation
      if (untrack(() => word) === targetWord) {
        validationResult = { valid, message: valid ? 'Valid word' : 'Word not found' }
        isValidating = false
      }
    } catch (err) {
      if (untrack(() => word) === targetWord) {
        validationResult = null
        isValidating = false
        error = err instanceof Error ? err.message : 'Validation failed'
      }
    }
  }

  $effect(() => {
    const currentWord = word

    if (currentWord.length < MIN_WORD_LENGTH) {
      isValidating = false
      validationResult = null
      return
    }

    isValidating = true
    validationResult = null

    debounceTimer = setTimeout(() => {
      runValidation(currentWord)
    }, 500)

    return () => {
      clearTimeout(debounceTimer)
    }
  })

  // ─── Create Handler ──────────────────────────────────────────────────────────

  const handleCreate = async (): Promise<void> => {
    if (!canCreate) return

    isCreating = true
    error = null

    try {
      const result = await createPuzzle(word)
      created = true
      navigateUrl = result.navigateTo
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create puzzle'
    } finally {
      isCreating = false
    }
  }
</script>

<div class="h-full flex flex-col overflow-hidden">
  <main class="flex-1 flex flex-col items-center justify-center gap-4 px-6">
    {#if created}
      <!-- Success state -->
      <div class="text-center">
        <div class="mb-3 text-4xl">&#x1F513;</div>
        <h2 class="text-xl font-bold text-[var(--color-feedback-correct)]">
          Puzzle created!
        </h2>
        <p class="mt-2 text-sm text-[var(--color-text-secondary)]">
          Redirecting...
        </p>
        {#if navigateUrl}
          <p class="mt-3 text-xs text-[var(--color-text-muted)] break-all max-w-xs">
            {navigateUrl}
          </p>
        {/if}
      </div>
    {:else}
      <!-- Form -->
      <div class="text-center">
        <h1 class="text-2xl font-bold text-[var(--color-text-primary)]">
          Create a Puzzle
        </h1>
        <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
          Choose a word and challenge the community
        </p>
      </div>

      <div class="w-full max-w-xs flex flex-col gap-3">
        <!-- Input group -->
        <div class="relative">
          <input
            type="text"
            value={word}
            oninput={handleInput}
            maxlength={MAX_WORD_LENGTH}
            minlength={MIN_WORD_LENGTH}
            placeholder="Enter a word..."
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            disabled={isCreating}
            class="w-full rounded-lg bg-[var(--color-lock-ring-bg)] border border-[var(--color-lock-ring-border)] text-[var(--color-text-primary)] px-4 py-3 text-center text-lg font-mono tracking-widest uppercase placeholder:text-[var(--color-text-muted)] placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-50"
          />
          <!-- Character count -->
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
            {charCount}
          </span>
        </div>

        <!-- Validation feedback -->
        <div class="h-5 flex items-center justify-center">
          {#if isValidating}
            <span class="text-xs text-[var(--color-text-muted)] animate-pulse">
              Checking...
            </span>
          {:else if validationMessage && isValid}
            <span class="text-xs text-[var(--color-feedback-correct)] flex items-center gap-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.78 4.97a.75.75 0 0 0-1.06 0L7 8.69 5.28 6.97a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0 0-1.06Z"/>
              </svg>
              Valid word
            </span>
          {:else if validationMessage && !isValid}
            <span class="text-xs text-[var(--color-accent)] flex items-center gap-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm2.78 4.97a.75.75 0 0 0-1.06 0L8 6.69 6.28 4.97a.75.75 0 0 0-1.06 1.06L6.94 7.75 5.22 9.47a.75.75 0 0 0 1.06 1.06L8 8.81l1.72 1.72a.75.75 0 0 0 1.06-1.06L9.06 7.75l1.72-1.72a.75.75 0 0 0 0-1.06Z"/>
              </svg>
              Word not found
            </span>
          {/if}
        </div>

        <!-- Error message -->
        {#if error}
          <p class="text-xs text-[var(--color-accent)] text-center">
            {error}
          </p>
        {/if}

        <!-- Create button -->
        <button
          onclick={handleCreate}
          disabled={!canCreate}
          class="w-full rounded-lg bg-[var(--color-accent)] text-white font-semibold py-3 min-h-[44px] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {#if isCreating}
            <span class="animate-pulse">Creating...</span>
          {:else}
            Create Puzzle
          {/if}
        </button>
      </div>
    {/if}
  </main>
</div>
