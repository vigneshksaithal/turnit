<script lang="ts">
	import TabBar from './components/TabBar.svelte'
	import PlayView from './views/PlayView.svelte'
	import LeaderboardView from './views/LeaderboardView.svelte'
	import CreateView from './views/CreateView.svelte'
	import ProfileView from './views/ProfileView.svelte'

	type Tab = 'play' | 'leaderboard' | 'create' | 'profile'

	let activeTab = $state<Tab>('play')

	const handleTabChange = (tab: string): void => {
		activeTab = tab as Tab
	}
</script>

<div class="h-full w-full flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
	<div class="flex-1 overflow-hidden">
		{#if activeTab === 'play'}
			<PlayView />
		{:else if activeTab === 'leaderboard'}
			<LeaderboardView />
		{:else if activeTab === 'create'}
			<CreateView />
		{:else if activeTab === 'profile'}
			<ProfileView />
		{/if}
	</div>

	<TabBar {activeTab} onTabChange={handleTabChange} />
</div>
