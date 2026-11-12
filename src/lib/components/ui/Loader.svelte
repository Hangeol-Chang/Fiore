<script>
	import '$lib/components/logo/logo.css';
	import LogoLine from '$lib/components/logo/LogoLine.svelte';
	import { cssMs } from '$lib/utils/motion.js';

	// active가 --loader-delay 넘게 이어지면 나타나고, 한 번 나타나면 최소 --loader-min 유지.
	// 로더 타이머는 여기에만 둠. overlay면 화면 전체를 덮음.
	let { active = false, overlay = false } = $props();

	let visible = $state(false);
	let shownAt = 0;
	let tShow = 0;
	let tHide = 0;

	$effect(() => {
		if (active) {
			clearTimeout(tHide);
			if (!shownAt && !tShow)
				tShow = setTimeout(() => {
					tShow = 0;
					shownAt = Date.now();
					visible = true;
				}, cssMs('--loader-delay', 300));
		} else {
			clearTimeout(tShow);
			tShow = 0;
			if (shownAt)
				tHide = setTimeout(() => {
					shownAt = 0;
					visible = false;
				}, Math.max(0, cssMs('--loader-min', 600) - (Date.now() - shownAt)));
		}
	});

	$effect(() => () => {
		clearTimeout(tShow);
		clearTimeout(tHide);
	});
</script>

{#if visible}
	<div class="loader" class:overlay role="status" aria-live="polite">
		<LogoLine class="draw" />
		<span>불러오는 중</span>
	</div>
{/if}

<style>
	.loader {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2, 16px);
		padding: var(--space-4, 32px);
		color: var(--color-green-500);
	}
	.loader :global(svg) {
		width: 96px;
		height: auto;
	}
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		justify-content: center;
		background: var(--color-surface);
	}
</style>
