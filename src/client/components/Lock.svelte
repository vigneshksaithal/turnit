<script lang="ts">
  import type { ClientRingData, LetterFeedback } from '../../shared/types'
  import Ring from './Ring.svelte'
  import FixedRing from './FixedRing.svelte'
  import Shackle from './Shackle.svelte'

  interface LockProps {
    rings: ClientRingData[]
    feedbacks?: (LetterFeedback | null)[] | undefined
    disabled?: boolean
    isOpen?: boolean
    onSubmit?: (guess: string) => void
  }

  const {
    rings,
    feedbacks,
    disabled = false,
    isOpen = false,
    onSubmit,
  }: LockProps = $props()

  // Track each scrollable ring's currently selected letter.
  // Fixed rings derive their letter from props; scrollable rings use this map.
  let selections = $state<Record<number, string>>({})

  // Compute ring dimensions based on number of rings to fit within 320px viewport
  // Available width: 320px viewport - 32px (page padding) - 24px (lock body padding) = 264px
  // Formula: ringWidth = floor((264 - (N-1) * gap) / N), capped at 52px
  const RING_GAP = 6 // gap-1.5 = 6px
  const MAX_RING_WIDTH = 52
  const MIN_AVAILABLE_WIDTH = 264

  const ringWidth = $derived(Math.min(
    MAX_RING_WIDTH,
    Math.floor((MIN_AVAILABLE_WIDTH - (rings.length - 1) * RING_GAP) / rings.length)
  ))

  // Scale height proportionally to width (base ratio: 120/52 ≈ 2.31)
  const ringHeight = $derived(Math.round(ringWidth * (120 / 52)))

  // Cell height is ring height / 3 (3 visible cells)
  const cellHeight = $derived(Math.round(ringHeight / 3))

  // Scale lock body padding based on ring size
  const lockPaddingY = $derived(ringWidth >= 48 ? 16 : 8)

  // Assembled letters: fixed rings use fixedLetter, scrollable rings use selections map
  const selectedLetters = $derived(
    rings.map((ring, i) => {
      if (ring.isFixed && ring.fixedLetter !== undefined) {
        return ring.fixedLetter
      }
      const sel = selections[i]
      if (sel !== undefined) return sel
      const first = ring.letters[0]
      return first ?? ''
    })
  )

  const handleRingSelect = (ringIndex: number, letter: string): void => {
    selections[ringIndex] = letter
  }

  const handleSubmit = (): void => {
    const guess = selectedLetters.join('')
    onSubmit?.(guess)
  }
</script>

<!-- Lock assembly -->
<div class="flex flex-col items-center">
  <!-- Shackle above the lock body -->
  <Shackle
    {disabled}
    {isOpen}
    onSubmit={handleSubmit}
  />

  <!-- Lock body -->
  <div
    class="relative -mt-2 flex items-center justify-center rounded-2xl px-3 shadow-lg"
    style:background="linear-gradient(to bottom, var(--color-lock-body-highlight), var(--color-lock-body))"
    style:padding-top="{lockPaddingY}px"
    style:padding-bottom="{lockPaddingY}px"
  >
    <!-- Ring row -->
    <div class="flex gap-1.5">
      {#each rings as ring, i (i)}
        {#if ring.isFixed && ring.fixedLetter !== undefined}
          <FixedRing
            letter={ring.fixedLetter}
            feedback={feedbacks?.[i] ?? null}
            {ringWidth}
            {ringHeight}
          />
        {:else}
          <Ring
            letters={ring.letters}
            feedback={feedbacks?.[i] ?? null}
            {disabled}
            {ringWidth}
            {ringHeight}
            {cellHeight}
            onSelect={(letter) => handleRingSelect(i, letter)}
          />
        {/if}
      {/each}
    </div>
  </div>
</div>
