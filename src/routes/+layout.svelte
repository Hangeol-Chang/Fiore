<script>
	import { navigating } from '$app/state';
	import Loader from '@/components/ui/Loader.svelte';
	import { dev } from '$app/environment';
	import { inject } from '@vercel/analytics';
	import { injectSpeedInsights } from '@vercel/speed-insights';

	inject({ mode: dev ? 'development' : 'production' });
	injectSpeedInsights();

	import '@/styles/tokens.css';
	import '@/styles/globals.scss';
	import Header from '@/components/layout/header.svelte';
	import Footer from '@/components/layout/footer.svelte';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<title>Fiore</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<link rel="icon" type="image/x-icon" href={favicon}>
	<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
</svelte:head>

<Loader active={!!navigating.to} overlay />
<Header />
<div class="content" class:home={$page.url.pathname === '/'}>
	{@render children()}
</div>
<Footer />

<style>
	.content {
		min-height: calc(100vh - 160px);
		margin: 60px 0;
	}
	
	/* 홈은 Hero가 헤더 뒤까지 올라옴 */
	.content.home {
		margin-top: 0;
	}

	:global(body) {
		padding: 0;
		box-sizing: border-box;
	}
	.content {
		min-height: 100vh;
	}
</style>
