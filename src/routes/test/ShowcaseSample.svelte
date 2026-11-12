<script>
	import { onMount } from 'svelte';
	import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
	import ArtistCard from '$lib/components/artists/ArtistCard.svelte';
	import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
	import LogoDivider from '$lib/components/ui/LogoDivider.svelte';

	const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

	// 백엔드가 꺼져 있어도 모양을 볼 수 있게 샘플 데이터로 시작
	let artists = $state(
		['김하늘', '이도윤', '박서연', '최민준', '정유나'].map((name, i) => ({
			id: i + 1, name, name_en: ['Haneul Kim', 'Doyun Lee', 'Seoyeon Park', 'Minjun Choi', 'Yuna Jung'][i], role_name: 'artist'
		}))
	);
	let concerts = $state(
		[
			['봄의 소나타', '2026년 12월 5일', '예술의전당 리사이틀홀'],
			['쇼팽의 밤', '2026년 12월 19일', '롯데콘서트홀'],
			['피오레 신년 음악회', '2027년 1월 8일', '세종문화회관']
		].map(([title, date, location], i) => ({ id: i + 1, title, date, location }))
	);
	let a = $state(0);
	let c = $state(0);

	onMount(async () => {
		try {
			const r = await fetch(`${API}/api/artists/summary?active_only=true&role_id=1&limit=6`);
			if (r.ok) { const d = await r.json(); if (d.length) artists = d; }
			const r2 = await fetch(`${API}/api/concerts/?active_only=false&summary=true`);
			if (r2.ok) { const d = await r2.json(); if (d.length) concerts = d.slice(0, 5); }
		} catch {}
	});
	const rest = $derived(artists.filter((_, i) => i !== a));
</script>

<h2>A. 에디토리얼 쇼케이스 샘플</h2>

<section class="show">
	<h3>Artists — 한 명을 크게, 나머지는 작게 (작은 카드를 누르면 교체)</h3>
	<div class="artist-show">
		{#key a}<div class="big"><ArtistCard artist={artists[a]} /></div>{/key}
		<div class="strip">
			{#each rest as ar}
				<button class="mini" onclick={() => (a = artists.indexOf(ar))} aria-label={ar.name}>
					{#if ar.thumb_url || ar.mid_url}
						<ResponsiveImage src={ar.image_url} thumb={ar.thumb_url} mid={ar.mid_url} sizes="120px" alt="" />
					{:else}<span class="ph"></span>{/if}
					<span class="n">{ar.name_en ?? ar.name}</span>
				</button>
			{/each}
		</div>
	</div>

	<LogoDivider />

	<h3>Concerts — 포스터 + 큰 텍스트 (아래 번호를 누르면 교체)</h3>
	<div class="concert-show">
		<div class="poster">
			{#key c}
				{#if concerts[c].poster_thumb_url || concerts[c].poster_mid_url || concerts[c].poster_url}
					<ResponsiveImage src={concerts[c].poster_url} thumb={concerts[c].poster_thumb_url} mid={concerts[c].poster_mid_url} sizes="360px" alt={concerts[c].title} />
				{:else}<span class="ph"></span>{/if}
			{/key}
		</div>
		<div class="info">
			<p class="idx">{String(c + 1).padStart(2, '0')} / {String(concerts.length).padStart(2, '0')}</p>
			<h4>{concerts[c].title}</h4>
			<p class="date">{concerts[c].date}</p>
			<p class="loc">{concerts[c].location}</p>
			<a class="more" href="/concerts/{concerts[c].id}">자세히 보기 +</a>
			<div class="dots">
				{#each concerts as _, i}
					<button class:on={i === c} onclick={() => (c = i)} aria-label="{i + 1}번 공연">{i + 1}</button>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	.show { max-width: var(--content-max); margin: 0 auto; padding: var(--space-4) 5vw; }
	h3 { font-size: 14px; margin: var(--space-4) 0 var(--space-2); color: #333; }
	.artist-show { display: grid; grid-template-columns: minmax(240px, 2fr) 3fr; gap: var(--space-4); align-items: start; }
	.big { aspect-ratio: 3 / 4; }
	.strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: var(--space-3); }
	.mini { display: grid; gap: var(--space-1); padding: 0; border: 0; background: none; cursor: pointer; text-align: left; color: var(--color-green-700); }
	.mini :global(img), .mini .ph { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; background: var(--color-green-100); display: block; }
	.n { font-weight: 200; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; }
	.concert-show { display: grid; grid-template-columns: minmax(200px, 360px) 1fr; gap: var(--space-5); align-items: center; }
	.poster :global(img), .poster .ph { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; background: var(--color-green-100); display: block; }
	.info h4 { font-weight: 100; font-size: clamp(28px, 4vw, 48px); line-height: 1.15; margin: var(--space-2) 0; }
	.info p { margin: 0 0 var(--space-1); }
	.idx { font-size: 13px; letter-spacing: 0.2em; color: var(--color-green-500); }
	.date { font-size: 20px; font-weight: 200; }
	.loc { color: var(--color-placeholder); }
	.more { display: inline-block; margin-top: var(--space-3); color: var(--color-green-700); font-weight: 300; letter-spacing: 0.1em; }
	.dots { display: flex; gap: var(--space-2); margin-top: var(--space-4); }
	.dots button { width: 36px; height: 36px; border: 1px solid var(--color-green-300); border-radius: 50%; background: none; cursor: pointer; color: var(--color-green-700); }
	.dots button.on { background: var(--color-green-500); border-color: var(--color-green-500); color: #fff; }
	@media (max-width: 768px) { .artist-show, .concert-show { grid-template-columns: 1fr; } }
</style>
