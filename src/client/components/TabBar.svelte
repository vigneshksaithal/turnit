<script lang="ts">
  interface TabBarProps {
    activeTab: 'play' | 'leaderboard' | 'create' | 'profile';
    onTabChange: (tab: string) => void;
  }

  const { activeTab, onTabChange }: TabBarProps = $props();

  const tabs = [
    { id: 'play', label: 'Play' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'create', label: 'Create' },
    { id: 'profile', label: 'Profile' },
  ] as const;
</script>

<nav class="flex-none h-14 flex items-center justify-around bg-[var(--color-tab-bg)] border-t border-[var(--color-lock-ring-border)]">
  {#each tabs as tab (tab.id)}
    {@const isActive = activeTab === tab.id}
    <button
      type="button"
      onclick={() => onTabChange(tab.id)}
      class="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] bg-transparent border-none cursor-pointer {isActive ? 'text-[var(--color-tab-active)]' : 'text-[var(--color-tab-inactive)]'}"
    >
      {#if tab.id === 'play'}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M10 2a5 5 0 0 0-5 5v1H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm3 6V7a3 3 0 1 0-6 0v1h6Z" clip-rule="evenodd" />
        </svg>
      {:else if tab.id === 'leaderboard'}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M10 1a.75.75 0 0 1 .7.48l1.72 4.47 4.75.41a.75.75 0 0 1 .43 1.32l-3.6 3.05 1.1 4.64a.75.75 0 0 1-1.12.82L10 13.36l-3.98 2.83a.75.75 0 0 1-1.12-.82l1.1-4.64-3.6-3.05a.75.75 0 0 1 .43-1.32l4.75-.41L9.3 1.48A.75.75 0 0 1 10 1Z" clip-rule="evenodd" />
        </svg>
      {:else if tab.id === 'create'}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" />
        </svg>
      {:else if tab.id === 'profile'}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a4.98 4.98 0 0 0-3.54 1.46.75.75 0 0 0 .02 1.06A6.47 6.47 0 0 0 10 16a6.47 6.47 0 0 0 3.52-1.48.75.75 0 0 0 .02-1.06A4.98 4.98 0 0 0 10 12Z" clip-rule="evenodd" />
        </svg>
      {/if}
      <span class="text-[10px] font-medium leading-none">{tab.label}</span>
    </button>
  {/each}
</nav>
