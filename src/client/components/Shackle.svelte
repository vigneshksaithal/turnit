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
    class="absolute -top-10 text-sm font-bold text-[var(--color-accent)] transition-opacity duration-150 pointer-events-none whitespace-nowrap {isDragging ? '' : 'animate-bounce'}"
    style:opacity={dragHintOpacity}
  >
    {hintText}
  </div>

  <!-- Shackle interactive area -->
  <div
    class="relative w-full min-h-[80px] flex items-end justify-center {disabled ? 'opacity-50 pointer-events-none' : 'cursor-grab'} {isDragging ? 'cursor-grabbing' : ''}"
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
      viewBox="0 0 120 100"
      class="w-full h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="shackleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#5a5a6a" />
          <stop offset="20%" stop-color="#c0c0d0" />
          <stop offset="50%" stop-color="#9a9aaa" />
          <stop offset="80%" stop-color="#7a7a8a" />
          <stop offset="100%" stop-color="#5a5a6a" />
        </linearGradient>
        <linearGradient id="shackleVertGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#d0d0e0" />
          <stop offset="30%" stop-color="#a0a0b0" />
          <stop offset="100%" stop-color="#6a6a7a" />
        </linearGradient>
      </defs>
      <!-- Shadow layer -->
      <path
        d="M 18,95 L 18,58 A 42,42 0 0 1 102,58 L 102,95"
        stroke="#3a3a4a"
        stroke-width="20"
        stroke-linecap="round"
        opacity="0.35"
      />
      <!-- Main shackle body -->
      <path
        d="M 18,95 L 18,58 A 42,42 0 0 1 102,58 L 102,95"
        stroke="url(#shackleVertGrad)"
        stroke-width="18"
        stroke-linecap="round"
      />
      <!-- Left edge highlight for metallic sheen -->
      <path
        d="M 15,95 L 15,60 A 42,42 0 0 1 57,18"
        stroke="#e0e0f0"
        stroke-width="3"
        stroke-linecap="round"
        opacity="0.5"
      />
      <!-- Top arch highlight -->
      <path
        d="M 35,20 A 25,25 0 0 1 85,20"
        stroke="#c0c0d0"
        stroke-width="2.5"
        stroke-linecap="round"
        opacity="0.6"
      />
      <!-- Specular shine spot -->
      <ellipse cx="32" cy="22" rx="6" ry="4" fill="#ffffff" opacity="0.4" transform="rotate(-30 32 22)" />
    </svg>
  </div>
</div>
