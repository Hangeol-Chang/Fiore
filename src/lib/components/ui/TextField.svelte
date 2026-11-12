<script>
	import StatusMessage from './StatusMessage.svelte';

	let {
		label,
		value = $bindable(''),
		type = 'text',
		placeholder = '',
		error = '',
		multiline = false,
		...rest
	} = $props();
	const id = $props.id();
</script>

<div class="field">
	<label for={id} class="t-label">{label}</label>
	<div class="control">
		{#if multiline}
			<textarea rows="4" {...rest} {id} bind:value {placeholder} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}></textarea>
		{:else}
			<input {...rest} {id} {type} bind:value {placeholder} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} />
		{/if}
		<span class="line"></span>
	</div>
	{#if error}
		<div id="{id}-err"><StatusMessage kind="error" message={error} /></div>
	{/if}
</div>

<style>
	.field { display: flex; flex-direction: column; gap: var(--space-1); }
	.control { position: relative; }
	input, textarea {
		display: block;
		width: 100%;
		border: none;
		background: none;
		padding: var(--space-2) 0;
		font: inherit;
		font-weight: 400;
		color: var(--color-on-surface);
		resize: vertical;
	}
	input:focus, textarea:focus { outline: none; }
	input::placeholder, textarea::placeholder { color: var(--color-placeholder); opacity: 1; }
	.line {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 2px;
		background: var(--color-green-500);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform var(--dur-fast);
	}
	.control:focus-within .line { transform: scaleX(1); }
	@media (forced-colors: active) { .line { background: Highlight; } }
</style>
