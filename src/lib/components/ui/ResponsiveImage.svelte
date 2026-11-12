<script>
	import { buildSrcset } from '../../utils/imageSrcset.js';

	// alt는 필수(장식용이면 명시적 빈 문자열). sizes는 사용처가 자리 너비로 선언한다.
	let {
		src = '',
		thumb = null,
		mid = null,
		large = null,
		width = null,
		height = null,
		sizes = '100vw',
		alt,
		class: className = '',
		loading = 'lazy',
		...rest
	} = $props();

	const srcset = $derived(buildSrcset({ thumb, mid, large, src, width }));
	// srcset을 못 쓰는 브라우저용 기본 주소: 너무 크지 않은 변형부터
	const fallback = $derived(mid || large || thumb || src);
</script>

<img
	src={fallback}
	srcset={srcset || undefined}
	{sizes}
	{alt}
	width={width && height ? width : undefined}
	height={width && height ? height : undefined}
	class={className}
	{loading}
	decoding="async"
	{...rest}
/>
