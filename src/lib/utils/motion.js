export function prefersReducedMotion() {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// :root의 시간 토큰(예: --loader-delay)을 ms로. SSR/실패 시 fallback
export function cssMs(name, fallback = 0) {
	if (typeof window === 'undefined') return fallback;
	const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
	return Number.isFinite(v) ? v * 1000 : fallback;
}
