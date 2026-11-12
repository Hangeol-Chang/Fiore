<script>
	let { kind = 'empty', message = '', class: className = '' } = $props();
	const k = $derived(['success', 'warning', 'error'].includes(kind) ? kind : 'empty');
</script>

<div class="status {k} {className}" role={k === 'error' ? 'alert' : 'status'}>
	{#if k !== 'empty'}
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			{#if k === 'success'}
				<path d="M4 10.5l4 4 8-9" />
			{:else if k === 'warning'}
				<path d="M10 3v9M10 16v.5" />
			{:else}
				<circle cx="10" cy="10" r="8" />
				<path d="M6.5 6.5l7 7M13.5 6.5l-7 7" />
			{/if}
		</svg>
	{/if}
	<span>{message}</span>
</div>

<style>
	.status {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		color: var(--color-on-surface);
		font-size: 14px;
		line-height: 1.4;
	}
	svg { flex: none; margin-top: 1px; }
	.success { background: var(--color-green-100); }
	.warning { border: 3px solid var(--color-green-500); }
	.error { border: 6px double var(--color-green-700); }
	.empty { color: var(--color-green-700); }
</style>
