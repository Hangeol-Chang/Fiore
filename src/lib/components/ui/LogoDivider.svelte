<script>
	import LogoLine from '$lib/components/logo/LogoLine.svelte';
	let { light = false } = $props();
</script>

<div class="divider" class:light aria-hidden="true">
	<span></span><LogoLine class="mark" /><span></span>
</div>

<style>
	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		max-width: var(--content-max);
		margin: var(--space-5) auto 0;
		padding: 0 5vw;
		color: var(--color-green-500);
	}
	span { flex: 1; height: 1px; background: var(--color-green-300); }
	/* light: 이미지 위 흰색 + 음각(#nav-engrave-mark 필터는 NavSection이 제공) */
	.light { color: #fff; }
	.light span { background: none; } /* 선은 숨기고 가운데 마크만 남김 (span은 마크 중앙 정렬용) */
	.light :global(.mark) { width: 56px; filter: url(#nav-engrave-mark); }
	.divider :global(.mark) { width: 36px; flex: none; }
</style>
