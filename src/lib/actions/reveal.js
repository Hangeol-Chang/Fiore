import { prefersReducedMotion } from '$lib/utils/motion.js';

// 화면에 처음 들어올 때 --dur-slow 동안 나타나고, 다시 숨지 않음.
// JS 꺼짐/IO 없음/모션 줄이기면 아무것도 안 해서 처음부터 보임.
export function reveal(node) {
	if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
	node.style.opacity = '0';
	const io = new IntersectionObserver(([e]) => {
		if (!e.isIntersecting) return;
		node.style.transition = 'opacity var(--dur-slow) ease';
		node.style.opacity = '1';
		io.disconnect();
	});
	io.observe(node);
	return { destroy: () => io.disconnect() };
}
