<script>
	import LogoLine from '$lib/components/logo/LogoLine.svelte';
</script>

<div class="divider" aria-hidden="true">
	<span></span><LogoLine class="mark" /><span></span>
</div>

<style>
	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		max-width: var(--content-max);
		margin: var(--space-5) auto 0;
		padding: 0 5vw;
		color: var(--color-green-500);
	}
	span { flex: 1; height: 1px; background: var(--color-green-300); }
	.divider :global(.mark) { width: 36px; flex: none; }
</style>
