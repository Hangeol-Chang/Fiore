<script>
	import LogoLine from '$lib/components/logo/LogoLine.svelte';
</script>

<!-- 부모(position: relative; overflow: hidden) 왼쪽 아래 모서리에 일부만 보이는 로고 라인 -->
<LogoLine class="corner" aria-hidden="true" />

<style>
	:global(.corner) {
		position: absolute;
		left: -28px;
		bottom: -28px;
		width: 120px;
		color: #fff;
		opacity: 0.55;
		pointer-events: none;
	}
</style>
