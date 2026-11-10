<script>
	import { AREA_D } from './areaPath.js';

	// 마우스를 올리면 바로 그 지점에서 파형이 퍼지며 안쪽이 채워짐.
	// 올린 직후부터 0.1초 간격으로, 그 시점의 마우스 위치에서 총 3번 파형을 만듦
	let { fill = '#000', ...rest } = $props();
	const id = $props.id();

	let svg;
	let drops = $state([]);
	let n = 0;

	let pos = { x: 0, y: 0 };
	const track = (e) => (pos = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()));
	const spawn = () => drops.push({ k: n++, x: pos.x, y: pos.y });

	function enter(e) {
		track(e);
		spawn();
		setTimeout(spawn, 100);
		setTimeout(spawn, 200);
	}
</script>

<svg bind:this={svg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 369.87 323.06" {...rest}>
	<clipPath id="clip-{id}"><path d={AREA_D} /></clipPath>
	<path d={AREA_D} {fill} fill-opacity="0.08" />
	<g clip-path="url(#clip-{id})">
		{#each drops as d (d.k)}
			<g style="transform-origin: {d.x}px {d.y}px; --x: {d.x}px; --y: {d.y}px">
				<circle class="fill" cx={d.x} cy={d.y} r="1" {fill} />
				<circle class="ring" cx={d.x} cy={d.y} r="1" stroke={fill} style="--delay: 0s" />
				<circle class="ring" cx={d.x} cy={d.y} r="1" stroke={fill} style="--delay: 0.18s" />
				<circle class="ring" cx={d.x} cy={d.y} r="1" stroke={fill} style="--delay: 0.36s" />
			</g>
		{/each}
	</g>
	<!-- 호버 판정용: 모양 위에서만 반응 -->
	<path d={AREA_D} fill="transparent" role="presentation" onpointerenter={enter} onpointermove={track} />
</svg>

<style>
	circle {
		transform-box: view-box;
		transform-origin: inherit;
	}
	.fill,
	.ring {
		transform: scale(0);
		animation: spread 5s cubic-bezier(0.12, 0.45, 0.2, 1) 0s forwards;
	}
	.ring {
		fill: none;
		stroke-width: 1.5;
		vector-effect: non-scaling-stroke;
		opacity: 0;
		animation:
			spread 4.2s cubic-bezier(0.12, 0.45, 0.2, 1) var(--delay) forwards,
			fade 4.2s linear var(--delay) forwards;
	}
	@keyframes spread {
		to { transform: scale(440); }
	}
	@keyframes fade {
		from { opacity: 0.9; }
		to { opacity: 0; }
	}
</style>
