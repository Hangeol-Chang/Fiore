<script>
	import '$lib/components/logo/logo.css';
	import LogoLine from '$lib/components/logo/LogoLine.svelte';
	import LogoArea from '$lib/components/logo/LogoArea.svelte';
	import LogoText from '$lib/components/logo/LogoText.svelte';
	import LetterF from '$lib/components/logo/LetterF.svelte';
	import LetterI from '$lib/components/logo/LetterI.svelte';
	import LetterO from '$lib/components/logo/LetterO.svelte';
	import LetterR from '$lib/components/logo/LetterR.svelte';
	import LetterE from '$lib/components/logo/LetterE.svelte';

	import ShowcaseSample from './ShowcaseSample.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import StatusMessage from '$lib/components/ui/StatusMessage.svelte';

	let name = $state('');
	let run = $state(0); // key 바뀌면 애니메이션 재생
</script>

<main>
	<button onclick={() => run++}>다시 그리기</button>

	{#key run}
		<section>
			<h2>합친 모습 (라인아트)</h2>
			<div class="stack">
				<LogoLine class="draw" />
				<LogoText class="draw" />
			</div>
		</section>
		<section>
			<h2>LogoArea (내부 채움)</h2>
			<div class="stack">
				<LogoArea />
				<LogoLine />
			</div>
		</section>
		<section>
			<h2>글자별</h2>
			<div class="letters">
				<LetterF class="single draw" />
				<LetterI class="single draw" />
				<LetterO class="single draw" />
				<LetterR class="single draw" />
				<LetterE class="single draw" />
			</div>
		</section>
	{/key}
	<section class="ui-demo">
		<h2>공용 부품</h2>
		<div class="row">
			<Button>주 버튼</Button>
			<Button variant="secondary">보조 버튼</Button>
			<Button href="/">링크 버튼</Button>
		</div>
		<TextField label="이름" bind:value={name} placeholder="이름을 입력하세요" />
		<TextField label="이메일" type="email" error="올바른 이메일이 아닙니다. 다시 입력해 주세요." />
		<StatusMessage kind="success" message="저장했습니다." />
		<StatusMessage kind="warning" message="변경 사항이 저장되지 않았습니다." />
		<StatusMessage kind="error" message="전송에 실패했습니다. 잠시 후 다시 시도해 주세요." />
		<StatusMessage kind="empty" message="등록된 항목이 없습니다. 새 항목을 추가해 주세요." />
	</section>
	<section class="motif">
		<h2>3.6 모티프 후보 샘플</h2>

		<h3>A. 구분선 — 가운데에 로고 라인</h3>
		<div class="m-divider"><span></span><LogoLine class="m-mark" /><span></span></div>

		<h3>B. 이미지 테두리 — 모서리에 로고 라인 (사진 위, 일부만 보임)</h3>
		<div class="m-frame">
			<div class="m-photo"></div>
			<LogoLine class="m-corner" />
		</div>

		<h3>C. 빈 상태 일러스트 — 그려지는 로고 라인 + 문구</h3>
		{#key run}
			<div class="m-empty">
				<LogoLine class="draw m-empty-mark" />
				<p>아직 등록된 항목이 없어요</p>
			</div>
		{/key}
	</section>
	<ShowcaseSample />
</main>

<style>
	main {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	button {
		align-self: flex-start;
		padding: 0.5rem 1rem;
	}
	.stack {
		display: grid;
		width: 360px;
	}
	.stack > :global(svg) {
		grid-area: 1 / 1;
	}
	.ui-demo { display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px; }
	.row { display: flex; gap: 1.5rem; padding: 8px; }
	.letters {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.letters :global(svg.single) {
		width: 160px;
		outline: 1px dashed #ccc;
	}

	.motif { margin-top: 48px; color: var(--color-green-500); }
	.motif h3 { font-size: 14px; margin: 24px 0 8px; color: #333; }
	.m-divider { display: flex; align-items: center; gap: 16px; max-width: 600px; }
	.m-divider span { flex: 1; height: 1px; background: var(--color-green-300); }
	.m-divider :global(.m-mark) { width: 36px; }
	.m-frame { position: relative; width: 280px; height: 200px; overflow: hidden; border: 1px solid var(--color-green-300); }
	.m-photo { position: absolute; inset: 0; background: var(--color-green-100); }
	.m-frame :global(.m-corner) { position: absolute; left: -28px; bottom: -28px; width: 120px; color: var(--color-green-500); opacity: 0.55; }
	.m-empty { display: grid; justify-items: center; gap: 12px; width: 320px; padding: 32px; border: 1px dashed var(--color-green-300); }
	.m-empty :global(.m-empty-mark) { width: 96px; }
	.m-empty p { margin: 0; color: var(--color-placeholder); }
</style>
