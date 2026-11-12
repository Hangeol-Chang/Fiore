<script>
	import { tick, untrack } from 'svelte';
	import Button from './Button.svelte';
	import StatusMessage from './StatusMessage.svelte';
	import Loader from './Loader.svelte';
	import { cssMs, prefersReducedMotion } from '$lib/utils/motion.js';

	// 편집·등록 공용 오른쪽 패널. 열기/닫기, 섹션 탭, 고정 저장·취소, 수정 중 닫기 확인,
	// ESC, 포커스 가두기·복귀를 여기서만 처리한다. 페이지는 섹션 목록과 저장 함수만 넘긴다.
	// 섹션 본문은 children 안에서 <section data-section="id"> 로 그린다.
	// snapshot: 수정 여부 비교용(직렬화 가능한 값을 돌려주는 함수). 열릴 때 값과 달라지면 "수정됨".
	// suspended: 패널 위에 다른 선택창이 떠 있는 동안 ESC·포커스 가두기를 멈춘다.
	let {
		open = false,
		title = '',
		sections = [],
		snapshot = () => null,
		saving = false,
		error = '',
		canSave = true,
		saveLabel = '저장',
		suspended = false,
		onsave,
		onclose,
		children
	} = $props();

	let rendered = $state(false);
	let closing = $state(false);
	let confirming = $state(false);
	let activeId = $state('');
	let toast = $state('');
	let baseline = $state(null);
	let opener = null;
	let panelEl = $state(null);
	let bodyEl = $state(null);
	let t = 0;
	let toastT = 0;
	let wasSaving = false;

	const dirty = $derived(rendered && baseline !== null && JSON.stringify(snapshot()) !== baseline);

	$effect(() => {
		if (open) {
			clearTimeout(t);
			untrack(() => {
				if (!rendered) opener = document.activeElement;
				rendered = true;
				closing = false;
				confirming = false;
				activeId = sections[0]?.id ?? '';
				baseline = JSON.stringify(snapshot());
			});
			tick().then(() => (bodyEl?.querySelector('input, select, textarea') ?? panelEl)?.focus({ preventScroll: true }));
		} else if (untrack(() => rendered)) {
			closing = true;
			t = setTimeout(() => {
				rendered = false;
				closing = false;
				baseline = null;
				if (opener?.isConnected) opener.focus();
				opener = null;
			}, cssMs('--dur-fast', 350));
		}
	});

	// 저장이 끝났고 에러가 없으면 성공 표시(패널이 닫힌 뒤에도 보인다)
	$effect(() => {
		if (wasSaving && !saving && !error) {
			toast = '저장했습니다.';
			clearTimeout(toastT);
			toastT = setTimeout(() => (toast = ''), 3000);
		}
		wasSaving = saving;
	});

	$effect(() => () => {
		clearTimeout(t);
		clearTimeout(toastT);
	});

	function requestClose() {
		if (saving) return;
		if (dirty) {
			confirming = true;
			tick().then(() => panelEl?.querySelector('[data-confirm-stay]')?.focus());
		} else onclose?.();
	}

	function stay() {
		confirming = false;
	}

	function keydown(e) {
		if (suspended) return;
		if (e.key === 'Escape') {
			e.stopPropagation();
			confirming ? stay() : requestClose();
			return;
		}
		if (e.key !== 'Tab') return;
		const items = [...panelEl.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
			(el) => !el.disabled && el.offsetParent !== null
		);
		if (!items.length) return e.preventDefault();
		const first = items[0];
		const last = items[items.length - 1];
		if (!panelEl.contains(document.activeElement) || (e.shiftKey && document.activeElement === first)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	function goTo(id) {
		const el = bodyEl?.querySelector(`[data-section="${id}"]`);
		if (!el) return;
		activeId = id;
		const top = el.getBoundingClientRect().top - bodyEl.getBoundingClientRect().top + bodyEl.scrollTop;
		bodyEl.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
	}

	function onscroll() {
		const base = bodyEl.getBoundingClientRect().top + 8;
		const atEnd = bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 2;
		let cur = sections[0]?.id ?? '';
		for (const s of sections) {
			const el = bodyEl.querySelector(`[data-section="${s.id}"]`);
			if (el && el.getBoundingClientRect().top <= base) cur = s.id;
		}
		if (atEnd && bodyEl.scrollTop > 0) cur = sections[sections.length - 1]?.id ?? cur;
		activeId = cur;
	}
</script>

{#if rendered}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="backdrop" class:closing onclick={requestClose}></div>
	<div
		class="panel"
		class:closing
		role="dialog"
		aria-modal="true"
		aria-label={title}
		tabindex="-1"
		bind:this={panelEl}
		onkeydown={keydown}
	>
		<header class="head">
			<h2 class="t-heading">{title}</h2>
			<button type="button" class="close" aria-label="닫기" onclick={requestClose}>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" /></svg>
			</button>
		</header>

		{#if sections.length}
			<nav class="tabs" aria-label="섹션">
				{#each sections as s (s.id)}
					<button type="button" class="tab" aria-current={activeId === s.id ? 'true' : undefined} onclick={() => goTo(s.id)}>{s.label}</button>
				{/each}
			</nav>
		{/if}

		<div class="body" bind:this={bodyEl} {onscroll}>
			{@render children?.()}
		</div>

		<footer class="foot">
			{#if confirming}
				<div class="confirm" role="alertdialog" aria-label="저장하지 않고 닫기">
					<StatusMessage kind="warning" message="저장하지 않고 닫을까요?" />
					<Button variant="secondary" onclick={() => onclose?.()}>저장하지 않고 닫기</Button>
					<Button data-confirm-stay onclick={stay}>계속 편집</Button>
				</div>
			{:else}
				{#if error}
					<StatusMessage kind="error" message="{error} 내용을 확인하고 다시 저장해 주세요." />
				{/if}
				<div class="actions">
					{#if saving}
						<span class="saving" role="status">
							<span class="t-label">저장 중</span>
							<span class="spin"><Loader active={saving} /></span>
						</span>
					{/if}
					<Button variant="secondary" onclick={requestClose} disabled={saving}>{onsave ? '취소' : '닫기'}</Button>
					{#if onsave}
						<Button onclick={() => onsave()} disabled={saving || !canSave}>{saveLabel}</Button>
					{/if}
				</div>
			{/if}
		</footer>
	</div>
{/if}

{#if toast}
	<div class="toast"><StatusMessage kind="success" message={toast} /></div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 900;
		background: color-mix(in srgb, var(--color-green-800) 35%, transparent);
		animation: fade var(--dur-fast) both;
	}
	.panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 901;
		display: flex;
		flex-direction: column;
		width: max(var(--admin-panel-width), 480px);
		max-width: 100vw;
		background: var(--color-surface);
		color: var(--color-on-surface);
		border-left: 1px solid var(--color-border);
		animation: slide var(--dur-fast) both;
	}
	.closing { animation-direction: reverse; animation-fill-mode: both; }
	.panel:focus { outline: none; }
	@keyframes slide { from { transform: translateX(100%); } to { transform: none; } }
	@keyframes fade { from { opacity: 0; } to { opacity: 1; } }

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}
	.head h2 { margin: 0; }
	.close {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius);
		color: var(--color-on-surface);
		cursor: pointer;
	}
	.close:hover { border-color: var(--color-border); }

	.tabs {
		display: flex;
		gap: var(--space-1);
		padding: 0 var(--space-4);
		border-bottom: 1px solid var(--color-border);
		overflow-x: auto;
	}
	.tab {
		flex: none;
		padding: var(--space-2) var(--space-3);
		background: none;
		border: none;
		border-bottom: 3px solid transparent;
		font: inherit;
		font-size: 14px;
		color: var(--color-on-surface);
		cursor: pointer;
	}
	.tab:hover { background: var(--color-green-50); }
	.tab[aria-current='true'] { border-bottom-color: var(--color-green-500); font-weight: 600; }

	.body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-4);
	}

	.foot {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
	}
	.actions, .confirm {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		flex-wrap: wrap;
	}
	.confirm :global(.status) { margin-right: auto; }
	.saving { display: inline-flex; align-items: center; gap: var(--space-2); margin-right: auto; }
	.spin :global(.loader) { flex-direction: row; padding: 0; }
	.spin :global(.loader svg) { width: 28px; }
	.spin :global(.loader span) { display: none; }
	.foot :global(.btn:disabled) { opacity: 0.5; cursor: not-allowed; }

	.toast {
		position: fixed;
		left: var(--space-4);
		bottom: var(--space-4);
		z-index: 1001;
		background: var(--color-surface);
		border-radius: var(--radius);
	}

	@media (max-width: 640px) {
		.head, .tabs, .body, .foot { padding-left: var(--space-3); padding-right: var(--space-3); }
	}
</style>
