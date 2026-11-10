<script>
	import { onMount } from 'svelte';
	import { AREA_D } from './areaPath.js';

	// 아래에서 물이 차오르는 채움. 앞(fill) + 뒤(backFill, 은은한 회색)가 같이 차오름.
	// 매 프레임 파형을 계산: 큰 너울(k=1~2) + 잔파도(k=3~7)의 합성이고,
	// 각 성분의 크기·이동속도가 1.5~3초마다 새 랜덤 목표로 부드럽게 바뀜 → 차오르는 동안 계속 불규칙하게 출렁임. 파장이 길고(T=900) 느려서 호수처럼 여유롭고,
	// 모든 성분이 같은 방향으로 이동해 앞(왼쪽)·뒤(오른쪽) 물결이 서로 반대로 흘러감
	// 마운트 시 1회 재생 후 채움이 끝나면 정지(다시 보려면 {#key}로 재마운트)
	let { fill = '#000', backFill = '#8a8a8a', backOpacity = 0.3, ...rest } = $props();
	const id = $props.id();

	const W = 370, T = 900, STEP = 4, DUR = 8, TAU = Math.PI * 2;
	const rand = (a, b) => a + Math.random() * (b - a);
	
	function harmonic(k, w, sp, dir) {
		const nw = () => rand(...w);
		const ns = () => dir * rand(...sp); // 모든 성분이 같은 방향 → 한쪽으로 흘러가는 물결
		const h = { k, w: nw(), tw: nw(), p: rand(0, TAU), sp: ns(), tsp: ns(), next: rand(0, 1.4) };
		h.retarget = () => {
			h.tw = nw();
			h.tsp = ns();
			h.next = rand(1.5, 3);
		};
		return h;
	}
	function makeLayer(amp, level, dir) {
		const hs = [harmonic(1, [1.4, 2.2], [0.5, 1.1], dir), harmonic(2, [0.9, 1.5], [0.7, 1.4], dir)];
		for (let i = 0; i < 6; i++) hs.push(harmonic(Math.round(rand(3, 7)), [0.1, 0.6], [0.9, 2.2], dir));
		return { amp, level, hs };
	}

	let frontEl, backEl;

	onMount(() => {
		const layers = [
			{ ...makeLayer(24, -28, 1), el: frontEl },
			{ ...makeLayer(28, -32, -1), el: backEl }
		];
		let t = 0,
			last = 0,
			raf = 0;

		const draw = (l, dt, p) => {
			const a = 1 - Math.exp(-dt * 1.2);
			let sum = 0;
			for (const h of l.hs) {
				if ((h.next -= dt) <= 0) h.retarget();
				h.w += (h.tw - h.w) * a;
				h.sp += (h.tsp - h.sp) * a;
				h.p += h.sp * dt;
				sum += h.w;
			}
			// 수위: 시작은 클립 밖 아래, 끝은 파고 전체가 모양 위로 올라간 높이
			const base = 245 + l.amp + (l.level - 245 - l.amp) * ((1 - Math.cos(Math.PI * p)) / 2);
			let d = '';
			for (let x = -STEP; x <= W + STEP; x += STEP) {
				let y = 0;
				for (const h of l.hs) y += h.w * Math.sin((TAU * h.k * x) / T + h.p);
				d += `${d ? 'L' : 'M'}${x},${(base + (y / sum) * l.amp).toFixed(1)}`;
			}
			l.el.setAttribute('d', `${d}L${W + STEP},420L${-STEP},420Z`);
		};

		const loop = (ts) => {
			const dt = last ? Math.min((ts - last) / 1000, 0.05) : 0.016;
			last = ts;
			t += dt;
			const p = Math.min(t / DUR, 1);
			for (const l of layers) draw(l, dt, p);
			if (t < DUR + 0.5) raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 369.87 323.06" {...rest}>
	<clipPath id="clip-{id}"><path d={AREA_D} /></clipPath>
	<path d={AREA_D} {fill} fill-opacity="0.08" />
	<g clip-path="url(#clip-{id})">
		<path bind:this={backEl} fill={backFill} fill-opacity={backOpacity} />
		<path bind:this={frontEl} {fill} />
	</g>
</svg>
