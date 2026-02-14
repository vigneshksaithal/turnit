<script lang="ts">
  interface SuccessOverlayProps {
    answer: string
    attemptsUsed: number
  }

  const { answer, attemptsUsed }: SuccessOverlayProps = $props()

  const BEAM_COUNT = 8
  const BEAM_DELAY_STEP = 0.1

  const beams = $derived(
    Array.from({ length: BEAM_COUNT }, (_, i) => ({
      rotation: i * (360 / BEAM_COUNT),
      delay: i * BEAM_DELAY_STEP,
    }))
  )
</script>

<!-- Success overlay — no pointer events, layered above the lock -->
<div class="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
  <!-- Green glow background -->
  <div
    class="absolute inset-0 opacity-0"
    style="
      background: radial-gradient(circle at 50% 45%, var(--color-feedback-correct), transparent 70%);
      animation: success-glow 1s ease-out forwards;
    "
  ></div>

  <!-- Burst circle -->
  <div
    class="absolute rounded-full opacity-0"
    style="
      width: 120px;
      height: 120px;
      top: calc(45% - 60px);
      left: calc(50% - 60px);
      border: 2px solid var(--color-feedback-correct);
      animation: success-burst 0.8s ease-out forwards;
    "
  ></div>

  <!-- Light beams radiating from center -->
  <div
    class="absolute"
    style="top: 45%; left: 50%; transform: translate(-50%, -50%)"
  >
    {#each beams as beam (beam.rotation)}
      <div
        class="absolute w-1 h-20 origin-bottom opacity-0"
        style="
          left: -2px;
          bottom: 0;
          background: var(--color-feedback-correct);
          transform: rotate({beam.rotation}deg);
          animation: light-beam 1.2s ease-out forwards;
          animation-delay: {beam.delay}s;
        "
      ></div>
    {/each}
  </div>

  <!-- Text block positioned at the bottom -->
  <div class="absolute bottom-8 left-0 right-0 text-center">
    <!-- Solved answer -->
    <p
      class="text-4xl font-bold tracking-widest uppercase text-[var(--color-feedback-correct)]"
      style="animation: float-up 0.6s ease-out 0.8s both"
    >
      {answer}
    </p>

    <!-- Attempts message -->
    <p
      class="mt-2 text-sm text-[var(--color-text-secondary)]"
      style="animation: float-up 0.6s ease-out 1s both"
    >
      Cracked in {attemptsUsed} {attemptsUsed === 1 ? 'attempt' : 'attempts'}!
    </p>
  </div>
</div>
