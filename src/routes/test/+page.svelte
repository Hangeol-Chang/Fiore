<script>
	import LogoLine from '$lib/components/logo/LogoLine.svelte';
	import LogoText from '$lib/components/logo/LogoText.svelte';
</script>

<main>
	<section>
		<h2>합친 모습</h2>
		<div class="stack">
			<LogoLine />
			<LogoText />
		</div>
	</section>
	<section>
		<h2>LogoLine</h2>
		<LogoLine class="single" />
	</section>
	<section>
		<h2>LogoText</h2>
		<LogoText class="single" />
	</section>
</main>

<style>
	main {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.stack {
		display: grid;
		width: 360px;
	}
	.stack > :global(svg) {
		grid-area: 1 / 1;
	}
	main :global(svg.single) {
		width: 360px;
		outline: 1px dashed #ccc;
	}
</style>
