<script>
	import '$lib/components/logo/logo.css';
	import LogoLine from '$lib/components/logo/LogoLine.svelte';
	import LogoText from '$lib/components/logo/LogoText.svelte';
	import bg from '$lib/assets/images/home/main_bg.png';
</script>

<section class="hero">
	<img src={bg} alt="" fetchpriority="high" />
	<h1 class="logo" aria-label="Fiore">
		<LogoLine class="draw" />
		<LogoText class="draw" />
	</h1>
</section>

<style>
	.hero {
		position: relative;
		width: 100%;
		height: 100svh;
		overflow: hidden;
		color: #fff;
	}
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}
	.logo {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		width: min(60vw, 480px);
		aspect-ratio: 369.87 / 323.06;
		margin: 0;
	}
	.logo :global(svg) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
</style>
