<script lang="ts">
  const {} = $props()
</script>

<!-- Failure overlay: dark vignette + chains + messaging -->
<div class="absolute inset-0 pointer-events-none z-10">
  <!-- Dark vignette -->
  <div
    class="absolute inset-0 bg-black/40 rounded-2xl"
    style:animation="rust-fade 0.8s ease-out forwards"
  ></div>

  <!-- Chain X pattern -->
  <svg
    viewBox="0 0 100 100"
    class="absolute inset-0 w-full h-full"
    style:animation="chain-drop 0.6s ease-out 0.3s both"
  >
    <!-- Chain 1: top-left to bottom-right -->
    <line
      x1="15" y1="15" x2="85" y2="85"
      stroke="var(--color-lock-shackle)"
      stroke-width="4"
      stroke-linecap="round"
      stroke-dasharray="8 6"
      opacity="0.7"
    />
    <!-- Chain 2: top-right to bottom-left -->
    <line
      x1="85" y1="15" x2="15" y2="85"
      stroke="var(--color-lock-shackle)"
      stroke-width="4"
      stroke-linecap="round"
      stroke-dasharray="8 6"
      opacity="0.7"
    />
  </svg>

  <!-- Failure messaging -->
  <div class="absolute inset-x-0 bottom-4 flex flex-col items-center gap-1">
    <p
      class="text-lg font-semibold text-[var(--color-accent)]"
      style:animation="float-up 0.6s ease-out 0.8s both"
    >
      The lock stays shut
    </p>
    <p
      class="text-sm text-[var(--color-text-muted)]"
      style:animation="float-up 0.6s ease-out 1s both"
    >
      Better luck next time
    </p>
  </div>
</div>
