// 운영 결정: OS의 모션 줄이기 설정과 무관하게 애니메이션을 항상 재생한다 (NFR1과 다름)
export function prefersReducedMotion() {
	return false;
}

// :root의 시간 토큰(예: --loader-delay)을 ms로. SSR/실패 시 fallback
export function cssMs(name, fallback = 0) {
	if (typeof window === 'undefined') return fallback;
	const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
	return Number.isFinite(v) ? v * 1000 : fallback;
}
