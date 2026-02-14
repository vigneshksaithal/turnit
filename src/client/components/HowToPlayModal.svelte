<script lang="ts">
  interface HowToPlayModalProps {
    onClose: () => void
  }

  const { onClose }: HowToPlayModalProps = $props()

  const handleBackdropClick = (e: MouseEvent): void => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
  onclick={handleBackdropClick}
>
  <div class="relative w-[280px] max-w-[90vw] rounded-2xl bg-[var(--color-bg-primary)] p-5 shadow-xl">
    <!-- Close button -->
    <button
      class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
      onclick={onClose}
      aria-label="Close"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Title -->
    <h2 class="mb-4 text-lg font-bold text-[var(--color-text-primary)]">How to Play</h2>

    <!-- Steps -->
    <div class="space-y-3 text-sm text-[var(--color-text-secondary)]">
      <div class="flex gap-3">
        <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-xs font-bold text-[var(--color-accent)]">1</span>
        <p>Spin the rings to select letters for your guess.</p>
      </div>

      <div class="flex gap-3">
        <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-xs font-bold text-[var(--color-accent)]">2</span>
        <p><strong class="text-[var(--color-text-primary)]">Pull up the shackle</strong> to submit your guess.</p>
      </div>

      <div class="flex gap-3">
        <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-xs font-bold text-[var(--color-accent)]">3</span>
        <p>Watch the feedback to crack the code!</p>
      </div>
    </div>

    <!-- Feedback legend -->
    <div class="mt-5 rounded-xl bg-[var(--color-bg-secondary)] p-3">
      <p class="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">FEEDBACK</p>
      <div class="space-y-1.5 text-xs">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-[var(--color-feedback-correct)]"></div>
          <span class="text-[var(--color-text-secondary)]">Correct letter, correct spot</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-[var(--color-feedback-wrong-spot)]"></div>
          <span class="text-[var(--color-text-secondary)]">Correct letter, wrong spot</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-[var(--color-text-muted)]"></div>
          <span class="text-[var(--color-text-secondary)]">Letter not in word</span>
        </div>
      </div>
    </div>

    <!-- Got it button -->
    <button
      class="mt-4 w-full rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-semibold text-white hover:opacity-90"
      onclick={onClose}
    >
      Got it!
    </button>
  </div>
</div>
