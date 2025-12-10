<script lang="ts">
	import '../app.css';
	import { setUser } from '$lib/stores/user';
	import { theme } from '$lib/stores/theme';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children?: any } = $props();

	onMount(() => {
		setUser(data.user);
		theme.init();
	});
</script>

{@render children?.()}



