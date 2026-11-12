<script>
	import { AREA_D, AREA_BOX } from './areaPath.js';
	import { prefersReducedMotion, cssMs } from '$lib/utils/motion.js';

	// 부모(position: relative) 전체를 덮고 면 왼쪽 아래가 부모 왼쪽 아래 모서리에 닿음.
	// start(): 모서리 근처 무작위 지점에서 3개 파형으로 퍼짐. stop(): 되감지 않고 같은 방향으로 계속 퍼지며 옅어져 사라짐
	let { ...rest } = $props();
	const id = $props.id();
	const [bx, by, bw, bh] = AREA_BOX.split(' ').map(Number);

	let drops = $state([]);
	let n = 0;

	export function start() {
		const r = prefersReducedMotion() ? 0.5 : Math.random();
		const r2 = prefersReducedMotion() ? 0.5 : Math.random();
		drops.push({ k: n++, x: bx + r * 30, y: by + bh - r2 * 30, out: false });
	}

	export function stop() {
		const d = drops.findLast((d) => !d.out);
		if (!d) return;
		d.out = true;
		setTimeout(() => (drops = drops.filter((x) => x !== d)), cssMs('--dur-slow', 800) + 50);
	}
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox={AREA_BOX} preserveAspectRatio="xMinYMax meet" aria-hidden="true" {...rest}>
	<clipPath id="clip-{id}"><path d={AREA_D} /></clipPath>
	<g clip-path="url(#clip-{id})" opacity="0.85">
		{#each drops as d (d.k)}
			<g class="drop" class:out={d.out} style="--x: {d.x}px; --y: {d.y}px">
				<circle class="fill" cx={d.x} cy={d.y} r="1" />
				<circle class="ring" cx={d.x} cy={d.y} r="1" style="--delay: 0s" />
				<circle class="ring" cx={d.x} cy={d.y} r="1" style="--delay: calc(var(--dur-slow) * 0.25)" />
				<circle class="ring" cx={d.x} cy={d.y} r="1" style="--delay: calc(var(--dur-slow) * 0.5)" />
			</g>
		{/each}
	</g>
</svg>

<style>
	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.drop {
		opacity: 1;
		transition: opacity var(--dur-slow) linear;
	}
	.drop.out {
		opacity: 0;
	}
	circle {
		transform-box: view-box;
		transform-origin: var(--x) var(--y);
		transform: scale(0);
		animation: spread calc(var(--dur-slow) * 4) cubic-bezier(0.12, 0.45, 0.2, 1) forwards;
	}
	.fill {
		fill: var(--color-green-700);
	}
	.ring {
		fill: none;
		stroke: var(--color-green-400);
		stroke-width: 1.5;
		vector-effect: non-scaling-stroke;
		animation:
			spread calc(var(--dur-slow) * 4) cubic-bezier(0.12, 0.45, 0.2, 1) var(--delay) forwards,
			fade calc(var(--dur-slow) * 4) linear var(--delay) forwards;
	}
	@keyframes spread {
		to { transform: scale(440); }
	}
	@keyframes fade {
		from { opacity: 0.9; }
		to { opacity: 0; }
	}
</style>
