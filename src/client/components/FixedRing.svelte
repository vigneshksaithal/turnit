<script lang="ts">
  interface FixedRingProps {
    letter: string
    feedback?: 'correct' | 'present' | 'absent' | null
    ringWidth?: number
    ringHeight?: number
  }

  const { letter, feedback = null, ringWidth = 52, ringHeight = 120 }: FixedRingProps = $props()

  const bgColor = $derived.by(() => {
    if (feedback === 'correct') return 'var(--color-feedback-correct)'
    return 'var(--color-ring-fixed)'
  })

  const textColor = $derived.by(() => {
    if (feedback === 'correct') return 'var(--color-text-primary)'
    return 'var(--color-ring-fixed-text)'
  })

  const textSizeClass = $derived(ringHeight >= 110 ? 'text-2xl' : ringHeight >= 100 ? 'text-xl' : 'text-lg')
</script>

<div
  class="relative overflow-hidden rounded-lg border border-[var(--color-ring-fixed)] shadow-inner select-none flex items-center justify-center"
  style:width="{ringWidth}px"
  style:height="{ringHeight}px"
  style:background-color={bgColor}
  aria-label="Fixed letter {letter.toUpperCase()}"
  role="img"
>
  <span
    class="{textSizeClass} font-bold font-mono uppercase"
    style:color={textColor}
  >
    {letter.toUpperCase()}
  </span>
</div>
