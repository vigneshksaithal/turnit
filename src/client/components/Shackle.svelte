<script lang="ts">
  interface ShackleProps {
    disabled?: boolean
    isOpen?: boolean
    onSubmit?: () => void
  }

  const {
    disabled = false,
    isOpen = false,
    onSubmit,
  }: ShackleProps = $props()

  const DRAG_MAX = -60
  const SUBMIT_THRESHOLD = -40

  let dragY = $state(0)
  let isDragging = $state(false)
  let hasTransition = $state(false)
  let didSubmit = $state(false)

  let pointerStartY = 0

  const shackleTransform = $derived.by(() => {
    if (isOpen) return 'translateY(-24px) rotate(-15deg)'
    if (didSubmit) return 'translateY(-30px) rotate(-10deg)'
    if (isDragging) return `translateY(${dragY}px)`
    return 'translateY(0px)'
  })

  const handlePointerDown = (e: PointerEvent): void => {
    if (disabled || isOpen) return
    e.preventDefault()

    isDragging = true
    hasTransition = false
    didSubmit = false
    pointerStartY = e.clientY
    dragY = 0

    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent): void => {
    if (!isDragging || disabled || isOpen) return
    e.preventDefault()

    const delta = e.clientY - pointerStartY
    // Only allow upward drag (negative delta), clamp to max
    dragY = Math.max(DRAG_MAX, Math.min(0, delta))
  }

  const handlePointerUp = (e: PointerEvent): void => {
    if (!isDragging) return
    e.preventDefault()

    const target = e.currentTarget as HTMLElement
    target.releasePointerCapture(e.pointerId)

    isDragging = false

    if (dragY <= SUBMIT_THRESHOLD) {
      // Passed threshold — trigger submit with pop animation
      didSubmit = true
      hasTransition = true
      setTimeout(() => {
        onSubmit?.()
        didSubmit = false
        hasTransition = true
        dragY = 0
        setTimeout(() => {
          hasTransition = false
        }, 200)
      }, 200)
    } else {
      // Snap back
      hasTransition = true
      dragY = 0
      setTimeout(() => {
        hasTransition = false
      }, 200)
    }
  }

  const dragHintOpacity = $derived.by(() => {
    if (disabled || isOpen) return 0
    // Always show hint when not dragging
    if (!isDragging) return 0.9
    // Fade in the "release" hint as they drag
    return Math.min(1, Math.abs(dragY) / 30)
  })

  const hintText = $derived(isDragging ? 'Release to submit!' : '↑ Pull up to guess!')
</script>

<div class="relative flex flex-col items-center select-none touch-none">
  <!-- Pull hint text -->
  <div
    class="absolute -top-8 text-sm font-bold text-[var(--color-accent)] transition-opacity duration-150 pointer-events-none whitespace-nowrap {isDragging ? '' : 'animate-bounce'}"
    style:opacity={dragHintOpacity}
  >
    {hintText}
  </div>

  <!-- Shackle interactive area -->
  <div
    class="relative w-full min-h-[60px] flex items-end justify-center {disabled ? 'opacity-50 pointer-events-none' : 'cursor-grab'} {isDragging ? 'cursor-grabbing' : ''}"
    style:transform={shackleTransform}
    style:transition={hasTransition || isOpen ? 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)' : isDragging ? 'none' : 'transform 200ms ease-out'}
    role="button"
    aria-label={isOpen ? 'Lock is open' : 'Pull up to submit guess'}
    tabindex={disabled ? -1 : 0}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
  >
    <svg
      viewBox="0 0 120 70"
      class="w-full h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <!-- Shackle shadow/depth layer -->
      <path
        d="M 22,70 L 22,28 A 38,38 0 0 1 98,28 L 98,70"
        stroke="var(--color-lock-body)"
        stroke-width="14"
        stroke-linecap="round"
        opacity="0.4"
      />
      <!-- Main shackle body -->
      <path
        d="M 22,70 L 22,28 A 38,38 0 0 1 98,28 L 98,70"
        stroke="var(--color-lock-shackle)"
        stroke-width="12"
        stroke-linecap="round"
      />
      <!-- Metallic highlight on left leg -->
      <path
        d="M 19,70 L 19,30 A 38,36 0 0 1 60,12"
        stroke="var(--color-lock-body-highlight)"
        stroke-width="3"
        stroke-linecap="round"
        opacity="0.5"
      />
      <!-- Small highlight on arch top -->
      <path
        d="M 45,14 A 20,18 0 0 1 75,14"
        stroke="var(--color-lock-body-highlight)"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.35"
      />
    </svg>
  </div>
</div>
