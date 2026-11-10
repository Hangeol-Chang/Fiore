<script>
	import LetterF from './LetterF.svelte';
	import LetterI from './LetterI.svelte';
	import LetterO from './LetterO.svelte';
	import LetterR from './LetterR.svelte';
	import LetterE from './LetterE.svelte';

	// 글자 svg는 모두 같은 viewBox라 중첩해도 제자리에 겹침
	let { fill = 'currentColor', ...rest } = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 369.87 323.06" {...rest}>
	<LetterF {fill} />
	<LetterI {fill} />
	<LetterO {fill} />
	<LetterR {fill} />
	<LetterE {fill} />
</svg>
