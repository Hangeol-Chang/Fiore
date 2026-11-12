<script>
	let { variant = 'primary', href, type = 'button', children, class: className = '', ...rest } = $props();
	const v = $derived(variant === 'secondary' ? 'secondary' : 'primary');
</script>

<svelte:element this={href ? 'a' : 'button'} {href} {...(href ? {} : { type })} class="btn {v} {className}" {...rest}>
	{@render children?.()}
</svelte:element>

<style>
	.btn {
		position: relative;
		display: inline-block;
		border: none;
		border-radius: 999px;
		padding: 6px 22px;
		font: inherit;
		font-weight: 500;
		line-height: 1.4;
		text-decoration: none;
		cursor: pointer;
		transition: background-color var(--dur-fast), color var(--dur-fast);
	}
	.primary { background: var(--color-green-500); color: var(--color-on-primary); }
	.primary:hover { background: var(--color-green-600); }
	.secondary { background: var(--color-green-100); color: var(--color-on-surface); }
	.secondary:hover { background: var(--color-green-500); color: var(--color-on-primary); }
	.btn::before {
		content: "";
		position: absolute;
		inset: -7px;
		border: 1px solid var(--color-green-500);
		border-radius: 999px;
		opacity: 0;
		transition: opacity var(--dur-fast);
		pointer-events: none;
	}
	.btn:hover::before { opacity: 1; }
</style>
