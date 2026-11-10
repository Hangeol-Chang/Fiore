<script>
	import '$lib/components/logo/logo.css';
	import LogoLine from '$lib/components/logo/LogoLine.svelte';
	import LogoArea from '$lib/components/logo/LogoArea.svelte';
	import LogoAreaRise from '$lib/components/logo/LogoAreaRise.svelte';
	import LogoAreaRipple from '$lib/components/logo/LogoAreaRipple.svelte';
	import LogoText from '$lib/components/logo/LogoText.svelte';
	import LetterF from '$lib/components/logo/LetterF.svelte';
	import LetterI from '$lib/components/logo/LetterI.svelte';
	import LetterO from '$lib/components/logo/LetterO.svelte';
	import LetterR from '$lib/components/logo/LetterR.svelte';
	import LetterE from '$lib/components/logo/LetterE.svelte';

	let run = $state(0); // key 바뀌면 애니메이션 재생
</script>

<main>
	<button onclick={() => run++}>다시 그리기</button>

	{#key run}
		<section>
			<h2>합친 모습 (라인아트)</h2>
			<div class="stack">
				<LogoLine class="draw" />
				<LogoText class="draw" />
			</div>
		</section>
		<section>
			<h2>LogoArea (내부 채움)</h2>
			<div class="stack">
				<LogoArea />
				<LogoLine />
			</div>
		</section>
		<section>
			<h2>물이 차오름</h2>
			<div class="stack">
				<LogoAreaRise />
				<LogoLine />
			</div>
		</section>
		<section>
			<h2>물방울 파형 (마우스를 올려보세요)</h2>
			<div class="stack">
				<LogoAreaRipple />
				<LogoLine style="pointer-events: none" />
			</div>
		</section>
		<section>
			<h2>글자별</h2>
			<div class="letters">
				<LetterF class="single draw" />
				<LetterI class="single draw" />
				<LetterO class="single draw" />
				<LetterR class="single draw" />
				<LetterE class="single draw" />
			</div>
		</section>
	{/key}
</main>

<style>
	main {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	button {
		align-self: flex-start;
		padding: 0.5rem 1rem;
	}
	.stack {
		display: grid;
		width: 360px;
	}
	.stack > :global(svg) {
		grid-area: 1 / 1;
	}
	.letters {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.letters :global(svg.single) {
		width: 160px;
		outline: 1px dashed #ccc;
	}
</style>
