<script lang="ts">
  interface RingProps {
    letters: string[]
    feedback?: 'correct' | 'present' | 'absent' | null
    disabled?: boolean
    ringWidth?: number
    ringHeight?: number
    cellHeight?: number
    onSelect?: (letter: string, index: number) => void
  }

  const {
    letters,
    feedback = null,
    disabled = false,
    ringWidth = 52,
    ringHeight = 120,
    cellHeight = 40,
    onSelect,
  }: RingProps = $props()
  const VELOCITY_THRESHOLD = 0.3
  const MOMENTUM_DECAY = 0.92
  const MOMENTUM_MIN = 0.5

  let selectedIndex = $state(0)
  let translateY = $state(0)
  let isDragging = $state(false)
  let hasTransition = $state(false)

  let pointerLastY = 0
  let pointerLastTime = 0
  let velocity = 0
  let animationFrameId = 0

  const letterCount = $derived(letters.length)

  // Build virtual letters: 3 copies for seamless wrapping
  const virtualLetters = $derived([...letters, ...letters, ...letters])

  // The offset to center the middle copy at selectedIndex
  const baseOffset = $derived(-(letterCount + selectedIndex) * cellHeight + cellHeight)

  const currentTranslateY = $derived(baseOffset + translateY)

  // Determine which letter index is visually centered
  const visibleIndex = $derived.by(() => {
    if (letterCount === 0) return 0
    const offset = -translateY / cellHeight
    const idx = ((selectedIndex + Math.round(offset)) % letterCount + letterCount) % letterCount
    return idx
  })

  const feedbackBg = $derived.by(() => {
    if (feedback === 'correct') return 'var(--color-feedback-correct)'
    if (feedback === 'present') return 'var(--color-feedback-present)'
    if (feedback === 'absent') return 'var(--color-feedback-absent)'
    return 'var(--color-lock-ring-bg)'
  })

  // Notify parent when selection changes — called imperatively from snap logic
  const notifySelection = (index: number): void => {
    const letter = letters[index]
    if (letter !== undefined && onSelect) {
      onSelect(letter, index)
    }
  }

  const wrapIndex = (idx: number): number => {
    return ((idx % letterCount) + letterCount) % letterCount
  }

  const snapToNearest = (): void => {
    const offsetInCells = -translateY / cellHeight
    const snappedCells = Math.round(offsetInCells)
    const newIndex = wrapIndex(selectedIndex + snappedCells)
    selectedIndex = newIndex
    translateY = 0
    hasTransition = true
    notifySelection(newIndex)
    // Remove transition class after animation completes
    setTimeout(() => {
      hasTransition = false
    }, 200)
  }

  const startMomentum = (initialVelocity: number): void => {
    let vel = initialVelocity

    const step = (): void => {
      vel *= MOMENTUM_DECAY
      if (Math.abs(vel) < MOMENTUM_MIN) {
        snapToNearest()
        return
      }
      translateY += vel
      animationFrameId = requestAnimationFrame(step)
    }

    animationFrameId = requestAnimationFrame(step)
  }

  const handlePointerDown = (e: PointerEvent): void => {
    if (disabled) return
    e.preventDefault()

    // Cancel any ongoing momentum animation
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = 0
    }

    isDragging = true
    hasTransition = false
    pointerLastY = e.clientY
    pointerLastTime = Date.now()
    velocity = 0

    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent): void => {
    if (!isDragging || disabled) return
    e.preventDefault()

    const now = Date.now()
    const delta = e.clientY - pointerLastY
    const timeDelta = now - pointerLastTime

    if (timeDelta > 0) {
      velocity = delta / timeDelta * 16 // normalize to ~60fps frame
    }

    translateY += delta
    pointerLastY = e.clientY
    pointerLastTime = now
  }

  const handlePointerUp = (e: PointerEvent): void => {
    if (!isDragging) return
    e.preventDefault()
    isDragging = false

    const target = e.currentTarget as HTMLElement
    target.releasePointerCapture(e.pointerId)

    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      startMomentum(velocity)
    } else {
      snapToNearest()
    }
  }

  // Determine opacity/scale for each virtual cell
  const getCellClasses = (virtualIndex: number): string => {
    const centerVirtualIndex = letterCount + visibleIndex
    const diff = virtualIndex - centerVirtualIndex

    // Scale text based on cell height
    const mainTextClass = cellHeight >= 38 ? 'text-xl' : cellHeight >= 34 ? 'text-lg' : 'text-base'
    const nearTextClass = cellHeight >= 38 ? 'text-sm' : 'text-xs'

    if (diff === 0) {
      return `${mainTextClass} font-bold text-[var(--color-text-primary)]`
    }
    if (Math.abs(diff) === 1) {
      return `${nearTextClass} text-[var(--color-text-muted)] opacity-50`
    }
    return 'text-xs text-[var(--color-text-muted)] opacity-0'
  }
</script>

<div
  class="relative overflow-hidden rounded-lg border border-[var(--color-lock-ring-border)] shadow-inner select-none touch-none {disabled ? 'pointer-events-none opacity-60' : 'cursor-grab'} {isDragging ? 'cursor-grabbing' : ''}"
  style:width="{ringWidth}px"
  style:height="{ringHeight}px"
  style:background-color={feedbackBg}
  role="spinbutton"
  aria-valuenow={selectedIndex}
  aria-valuemin={0}
  aria-valuemax={letterCount - 1}
  aria-valuetext={letters[selectedIndex]}
  tabindex={disabled ? -1 : 0}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
>
  <div
    class="absolute left-0 right-0 will-change-transform font-mono {hasTransition && !isDragging ? 'transition-transform duration-200 ease-out' : ''}"
    style:transform="translateY({currentTranslateY}px)"
  >
    {#each virtualLetters as letter, i (i)}
      <div
        class="flex items-center justify-center transition-all duration-100 {getCellClasses(i)}"
        style:height="{cellHeight}px"
      >
        {letter.toUpperCase()}
      </div>
    {/each}
  </div>
</div>
