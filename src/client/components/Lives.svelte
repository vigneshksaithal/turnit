<script lang="ts">
  interface LivesProps {
    totalAttempts: number
    attemptsUsed: number
  }

  const { totalAttempts, attemptsUsed }: LivesProps = $props()

  const attempts = $derived(Array.from({ length: totalAttempts }, (_, i) => i < attemptsUsed))
</script>

<div class="flex items-center justify-center gap-1" role="img" aria-label="{totalAttempts - attemptsUsed} of {totalAttempts} attempts remaining">
  {#each attempts as used, i (i)}
    {#if used}
      <!-- Open/broken lock: used attempt -->
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-[var(--color-text-muted)] opacity-40">
        <path d="M14 6a2 2 0 0 1 2 2v1h.5A1.5 1.5 0 0 1 18 10.5v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 15.5v-5A1.5 1.5 0 0 1 3.5 9H4V8a6 6 0 1 1 12 0h-2a4 4 0 0 0-8 0v1h8V8a2 2 0 0 1 2-2Z" />
      </svg>
    {:else}
      <!-- Closed/intact lock: remaining attempt -->
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-[var(--color-accent)]">
        <path fill-rule="evenodd" d="M10 2a5 5 0 0 0-5 5v1H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm3 6V7a3 3 0 1 0-6 0v1h6Z" clip-rule="evenodd" />
      </svg>
    {/if}
  {/each}
</div>
