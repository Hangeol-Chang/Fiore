<script>
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
  import { renderMarkdown } from '$lib/utils/markdown.js';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';
  const NO_MATCH = '일치하는 정보가 없습니다. 지원서에 입력한 이름과 생년월일을 다시 확인해 주세요.';

  let recruitments = $state([]);
  let recruitmentId = $state('');
  let name = $state('');
  let birth = $state('');
  let error = $state('');
  let loading = $state(false);
  let result = $state(null); // { name, outcome, message }
  let ready = $state(false);

  $effect(() => {
    fetch(`${API}/api/results/recruitments`)
      .then(r => (r.ok ? r.json() : []))
      .then(list => {
        recruitments = list;
        if (list.length === 1) recruitmentId = String(list[0].id);
      })
      .catch(() => {})
      .finally(() => (ready = true));
  });

  // index.html normBirth와 동일 규칙 (백엔드가 한 번 더 검증)
  function normBirth(s) {
    const parts = String(s || '').trim().split(/[^\d]+/).filter(Boolean);
    const d = parts.length === 3 && parts[0].length === 4
      ? parts[0] + parts[1].padStart(2, '0') + parts[2].padStart(2, '0')
      : parts.join('');
    if (d.length !== 8) return null;
    const y = +d.slice(0, 4), m = +d.slice(4, 6), day = +d.slice(6, 8);
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || day < 1 || day > 31) return null;
    return d;
  }

  async function submit(e) {
    e.preventDefault();
    error = '';
    const n = name.trim();
    const b = normBirth(birth);
    if (!recruitmentId) { error = '모집 공고를 선택해 주세요.'; return; }
    if (!n) { error = '이름을 입력해 주세요.'; return; }
    if (!b) { error = '생년월일을 8자리 숫자로 입력해 주세요. (예: 20080315)'; return; }

    loading = true;
    try {
      const res = await fetch(`${API}/api/results/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruitment_id: Number(recruitmentId), name: n, birth: b })
      });
      if (res.status === 404 || res.status === 422) error = NO_MATCH;
      else if (!res.ok) throw new Error();
      else {
        result = await res.json();
        window.scrollTo(0, 0);
      }
    } catch {
      error = '결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    } finally {
      loading = false;
    }
  }

  function reset() {
    result = null; name = ''; birth = ''; error = '';
  }

</script>

<svelte:head>
  <title>결과 조회 - Fiore</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="result-section">
  {#if !result}
    <h1>결과 조회</h1>
    <p class="lead">지원 시 입력하신 이름과 생년월일을 입력해 주세요.</p>

    {#if ready && recruitments.length === 0}
      <div class="status-msg">현재 결과를 조회할 수 있는 모집 공고가 없습니다.</div>
    {:else if !ready}
      <div class="status-msg">불러오는 중…</div>
    {:else}
      <form class="lookup-form" autocomplete="off" novalidate onsubmit={submit}>
        <div class="form-row">
          <label for="recruitment">모집 공고</label>
          <select id="recruitment" bind:value={recruitmentId}>
            <option value="">선택해 주세요</option>
            {#each recruitments as a}
              <option value={String(a.id)}>{a.title}</option>
            {/each}
          </select>
        </div>
        <div class="form-row">
          <label for="name">이름</label>
          <input id="name" type="text" placeholder="홍길동" bind:value={name} />
        </div>
        <div class="form-row">
          <label for="birth">생년월일 (8자리)</label>
          <div class="field">
            <input
              id="birth" type="text" inputmode="numeric" maxlength="14" placeholder="20080315"
              bind:value={birth}
              oninput={() => (birth = birth.replace(/[^\d.\-/ ]/g, ''))}
            />
            <p class="hint">예: 2008년 3월 15일 → 20080315</p>
          </div>
        </div>

        {#if error}<div class="result-msg error" role="alert">{error}</div>{/if}

        <div class="submit-row">
          <button class="submit-btn" type="submit" disabled={loading}>{loading ? '확인 중…' : '결과 확인'}</button>
        </div>
      </form>
    {/if}
  {:else}
    <div class="result-view">
      <p class="applicant">{result.name} 님</p>

      {#if result.message}
        <div class="result-box markdown-body">{@html renderMarkdown(result.message)}</div>
      {:else if result.outcome === 'pending'}
        <div class="result-box"><p>심사 중입니다.</p></div>
      {/if}

      <div class="submit-row center">
        <button class="submit-btn ghost" type="button" onclick={reset}>처음으로</button>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .result-section {
    max-width: 800px;
    margin: 0 auto;
    padding: 8rem 2rem 6rem;

    @media (--tablet) {
      padding: 6rem 1.5rem 4rem;
    }

    h1 {
      font-weight: 200;
      letter-spacing: 0.05em;
      margin: 0 0 1rem;
    }
  }

  .lead {
    color: #666;
    margin: 0 0 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
  }

  .status-msg {
    padding: 4rem 2rem;
    text-align: center;
    color: #999;
    font-size: 0.95rem;
  }

  /* 폼: Rental.svelte 신청 폼과 동일한 필드 스타일 */
  .lookup-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-row {
    gap: 6px;
    display: grid;
    grid-template-columns: 160px 1fr;
    align-items: start;

    @media (--tablet) {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    label {
      font-size: 0.9rem;
      color: #555;
      font-weight: 500;
      padding-top: 10px;

      @media (--tablet) { padding-top: 0; }
    }

    input,
    select {
      padding: 10px 14px;
      border: 1px solid #d6ccc2;
      border-radius: 2px;
      font-size: 0.95rem;
      color: #333;
      background: #fdfaf7;
      transition: border-color 0.2s;
      width: 100%;

      &:focus {
        outline: none;
        border-color: #a08878;
        background: #fff;
      }
    }
  }

  .field {
    width: 100%;
  }

  .hint {
    margin-top: 6px;
    font-size: 0.8rem;
    color: #999;
  }

  .result-msg {
    padding: 12px 16px;
    border-radius: 2px;
    font-size: 0.9rem;
    text-align: center;

    &.error {
      background: #fdecea;
      color: #c62828;
      border: 1px solid #ef9a9a;
    }
  }

  .submit-row {
    display: flex;
    justify-content: flex-end;

    &.center { justify-content: center; margin-top: 3rem; }
    @media (--mobile) { justify-content: center; }
  }

  .submit-btn {
    margin-top: 8px;
    padding: 12px 2.5rem;
    background: #7b6c6c;
    color: #fff;
    border: none;
    border-radius: 2px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;

    &:hover:not(:disabled) { background: #5a4e4e; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }

    /* 공지사항 상세의 CTA 버튼과 동일 */
    &.ghost {
      background: #222;
      border: 1px solid #222;
      font-weight: 400;
      letter-spacing: 0.02em;
      &:hover:not(:disabled) { background: #fff; color: #222; }
    }
  }

  /* 결과 화면: 공지사항 상세의 헤더/본문 구조 */
  .applicant {
    font-size: 1.3rem;
    color: #222;
    margin: 0 0 2rem; /* 전역 p의 좌우 margin 제거 → 본문과 왼쪽 정렬 통일 */
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
  }

  .result-box {
    overflow-wrap: break-word;
    line-height: 1.8;

    :global(p) { margin: 0 0 1em; }
    :global(ul), :global(ol) { padding-left: 1.5em; margin: 0 0 1em; }
    :global(li) { margin-bottom: 0.25em; }
    :global(a) { color: #2563eb; text-decoration: underline; }
    :global(strong) { font-weight: 700; }
    :global(img) { max-width: 100%; }
  }
</style>
