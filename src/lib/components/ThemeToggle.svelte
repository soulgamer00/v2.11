<script lang="ts">
	import { theme } from '$lib/stores/theme';
	import Icon from './icons/Icon.svelte';
	import { onMount } from 'svelte';
	
	onMount(() => {
		theme.init();
	});
</script>

<button
	type="button"
	class="btn btn-ghost btn-sm btn-circle theme-toggle"
	onclick={() => theme.toggle()}
	aria-label="Toggle theme"
	title="สลับธีม"
>
	{#key $theme}
		{#if $theme === 'light'}
			<Icon name="theme" size={20} class="transition-all duration-300" />
		{:else}
			<Icon name="theme" size={20} class="transition-all duration-300 rotate-180" />
		{/if}
	{/key}
</button>

<style>
	.theme-toggle {
		transition: all 0.3s ease-in-out;
	}
	
	.theme-toggle:hover {
		transform: scale(1.1) rotate(15deg);
	}
</style>






