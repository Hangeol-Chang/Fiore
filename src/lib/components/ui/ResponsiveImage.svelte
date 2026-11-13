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

	const srcset = $derived(buildSrcset({ thumb, mid, large }));
	// 기본 주소: 리사이즈본 우선. src(원본)는 변형이 하나도 없는 레거시 행의 안전망일 뿐이다
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
