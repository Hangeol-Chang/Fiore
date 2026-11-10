<script>
	import { AREA_D } from './areaPath.js';
	// 라인 중심선 안쪽 면. 왼쪽 끝을 오른쪽 끝 높이(y=225.9)까지 내려 밑변이 수평. LogoLine과 같은 viewBox라 겹치면 맞음
	let { fill = '#000', ...rest } = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 369.87 323.06" {...rest}>
	<path
		class="area"
		{fill}
		d={AREA_D}
	/>
</svg>
