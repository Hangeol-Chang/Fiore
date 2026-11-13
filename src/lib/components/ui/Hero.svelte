<script>
	import '$lib/components/logo/logo.css';
	import LogoLine from '$lib/components/logo/LogoLine.svelte';
	import LogoText from '$lib/components/logo/LogoText.svelte';
	import bg from '$lib/assets/images/home/main_bg.webp';

	let scrolled = $state(false);
	const next = () => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 40)} />

<!-- 음각 효과: 위·왼쪽 안쪽 가장자리에 회색 띠 (렌더 폭 ~480px 기준 2px ≈ 1.5 단위) -->
<svg width="0" height="0" aria-hidden="true" style="position:absolute">
	<filter id="hero-engrave" x="-5%" y="-5%" width="110%" height="110%">
		<feOffset in="SourceAlpha" dx="1.3" dy="1.3" result="shifted" />
		<feComposite in="SourceAlpha" in2="shifted" operator="out" result="edge" />
		<feGaussianBlur in="edge" stdDeviation="1.1" result="soft" />
		<feFlood flood-color="#8a8a8a" result="gray" />
		<feComposite in="gray" in2="soft" operator="in" result="blurred" />
		<!-- 번진 띠가 글자 밖으로 새지 않게 원래 모양 안으로 자름 -->
		<feComposite in="blurred" in2="SourceAlpha" operator="in" result="band" />
		<feMerge>
			<feMergeNode in="SourceGraphic" />
			<feMergeNode in="band" />
		</feMerge>
	</filter>
</svg>

<section class="hero">
	<!-- 예외: LCP 이미지라 fetchpriority 직접 지정, 정적 import 자산 -->
	<img src={bg} alt="" fetchpriority="high" />
	<h1 class="logo" aria-label="Fiore">
		<LogoLine class="draw" />
		<LogoText class="draw" />
	</h1>
	<button class="scroll-cue" class:hidden={scrolled} onclick={next} aria-label="아래로 스크롤">
		<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
	</button>
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
		width: min(40vw, 320px);
		aspect-ratio: 369.87 / 323.06;
		margin: 0;
		color: #fff; /* 전역 h1 색이 상속을 덮어씀 */
		opacity: 0.9; /* 배경 질감이 비치게 */
	}
	.logo > :global(svg) {
		filter: url(#hero-engrave);
	}
	.logo :global(svg) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.scroll-cue {
		position: absolute;
		bottom: var(--space-5);
		left: 50%;
		translate: -50% 0;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		padding: 0;
		border: 0;
		background: none;
		color: #fff;
		cursor: pointer;
		opacity: 0;
		animation: cue-in var(--dur-slow) ease calc(var(--dur-slow) * 5.3) forwards, cue-bob 3s ease-in-out calc(var(--dur-slow) * 6.3) infinite;
	}
	.scroll-cue.hidden { visibility: hidden; opacity: 0; animation: none; }
	@keyframes cue-in { to { opacity: 1; } }
	@keyframes cue-bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(10px); }
	}
</style>
