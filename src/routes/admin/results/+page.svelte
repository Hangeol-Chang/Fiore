<script>
  import { enhance, deserialize } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { renderMarkdown } from '$lib/utils/markdown.js';

  /** @type {{ data: import('./$types').PageData, form: any }} */
  let { data, form } = $props();

  // 편집/생성 폼: null = 닫힘, {} = 새로 만들기, {id,...} = 편집
  let editing = $state(null);

  // 안내 메시지 (마크다운 원문 그대로 저장)
  let passMessage = $state('');
  let failMessage = $state('');
  let showPreview = $state(false);

  // CSV 가져오기
  let headers = $state([]);
  let csvRows = $state([]);
  let colName = $state('');
  let colBirth = $state('');
  let colResult = $state('');
  let csvError = $state('');

  // 결과 행 (편집 중인 모집 공고)
  const PRESET = ['합격', '불합격', '심사 중'];
  let rows = $state([]);
  let rowsLoading = $state(false);
  let rowsError = $state('');
  let status = $state({}); // rowId -> 'saving' | 'saved' | 'error'
  let newRow = $state({ name: '', birth: '', result: '심사 중' });
  let adding = $state(false);

  const mappedRows = $derived(
    csvRows.map(r => ({
      name: r[headers.indexOf(colName)] ?? '',
      birth: r[headers.indexOf(colBirth)] ?? '',
      result: r[headers.indexOf(colResult)] ?? ''
    }))
  );

  // RFC4180 최소 파서: 따옴표, 이스케이프(""), 필드 내 줄바꿈
  function parseCsv(text) {
    const out = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        out.push(row); row = [];
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); out.push(row); }
    return out.filter(r => r.some(v => v.trim() !== ''));
  }

  async function onFile(e) {
    csvError = '';
    const file = e.target.files?.[0];
    if (!file) { resetCsv(); return; }
    const buf = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) text = new TextDecoder('euc-kr').decode(buf); // Excel CP949
    text = text.replace(/^﻿/, '');
    const parsed = parseCsv(text);
    if (parsed.length < 2) { csvError = 'CSV에 데이터 행이 없습니다.'; headers = []; csvRows = []; return; }
    headers = parsed[0].map(h => h.trim());
    csvRows = parsed.slice(1);
    colName = colBirth = colResult = '';
  }

  const canImport = $derived(
    colName && colBirth && colResult && csvRows.length > 0 &&
    new Set([colName, colBirth, colResult]).size === 3
  );
  // 파일은 골랐지만 열 매핑이 끝나지 않은 상태 (모달 저장 막음)
  const csvPending = $derived(headers.length > 0 && !canImport);

  function resetCsv() {
    headers = []; csvRows = []; colName = colBirth = colResult = ''; csvError = '';
  }

  // ── 서버 액션 호출 (페이지 form 상태를 건드리지 않음) ──
  async function act(name, fields) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
    try {
      const res = await fetch(`?/${name}`, { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
      const r = deserialize(await res.text());
      if (r.type === 'success') return { data: r.data };
      if (r.type === 'redirect') { location.href = r.location; return { error: '다시 로그인해 주세요.' }; }
      return { error: r.data?.error || '요청에 실패했습니다.' };
    } catch {
      return { error: '요청에 실패했습니다.' };
    }
  }

  async function openEditor(rec) {
    resetCsv();
    editing = rec;
    passMessage = rec.pass_message ?? '';
    failMessage = rec.fail_message ?? '';
    showPreview = false;
    rows = []; rowsError = ''; status = {};
    newRow = { name: '', birth: '', result: '심사 중' };
    if (rec.id) {
      rowsLoading = true;
      const r = await act('rows', { id: rec.id });
      if (editing?.id === rec.id) {
        if (r.error) rowsError = r.error;
        else rows = r.data.rows;
        rowsLoading = false;
      }
    }
  }

  const fmtBirth = (b) => (/^\d{8}$/.test(b) ? `${b.slice(0, 4)}.${b.slice(4, 6)}.${b.slice(6)}` : b);

  function flash(id, st) {
    status[id] = st;
    if (st === 'saved') setTimeout(() => { if (status[id] === 'saved') delete status[id]; }, 1500);
  }

  async function saveField(row, field, input) {
    const value = input.value.trim();
    if (value === (field === 'birth' ? fmtBirth(row.birth) : row[field])) return;
    flash(row.id, 'saving');
    const r = await act('rowUpdate', { id: editing.id, rowId: row.id, [field]: value });
    if (r.error) {
      input.value = field === 'birth' ? fmtBirth(row.birth) : row[field]; // 실패 시 되돌림
      rowsError = r.error;
      flash(row.id, 'error');
      return;
    }
    rowsError = '';
    Object.assign(row, r.data.row);
    flash(row.id, 'saved');
  }

  async function addRow() {
    if (adding) return;
    adding = true;
    const r = await act('rowAdd', { id: editing.id, ...newRow });
    adding = false;
    if (r.error) { rowsError = r.error; return; }
    rowsError = '';
    rows = [...rows, r.data.row];
    newRow = { name: '', birth: '', result: newRow.result };
    invalidateAll();
  }

  async function deleteRow(row) {
    if (!confirm(`"${row.name}" 행을 삭제하시겠습니까?`)) return;
    flash(row.id, 'saving');
    const r = await act('rowDelete', { id: editing.id, rowId: row.id });
    if (r.error) { rowsError = r.error; flash(row.id, 'error'); return; }
    rowsError = '';
    rows = rows.filter(x => x.id !== row.id);
    invalidateAll();
  }

  const currentCount = $derived(editing?.id ? rows.length : 0);
</script>

{#snippet csvMapper()}
  {#if csvError}<p class="msg err">{csvError}</p>{/if}
  {#if headers.length}
    <div class="cols">
      <label>이름 열
        <select bind:value={colName}><option value="">선택...</option>{#each headers as h}<option value={h}>{h}</option>{/each}</select>
      </label>
      <label>생년월일 열
        <select bind:value={colBirth}><option value="">선택...</option>{#each headers as h}<option value={h}>{h}</option>{/each}</select>
      </label>
      <label>결과 열
        <select bind:value={colResult}><option value="">선택...</option>{#each headers as h}<option value={h}>{h}</option>{/each}</select>
      </label>
    </div>
    <p class="note">총 {csvRows.length}행{canImport ? '' : ' — 이름·생년월일·결과에 서로 다른 열을 선택해 주세요.'}</p>
  {/if}
{/snippet}

<svelte:head>
  <title>모집 공고 / 결과 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>모집 공고 / 결과 관리</h1>
    </div>
    <button class="btn-primary" onclick={() => openEditor({})}>+ 새 모집 공고</button>
  </header>

  {#if data.error}<p class="msg err">{data.error}</p>{/if}
  {#if form?.error && !editing}<p class="msg err">{form.error}</p>{/if}
  {#if form?.imported !== undefined && !editing}
    <p class="msg ok">{form.imported}건 가져옴, {form.skipped}건 건너뜀 (이름 없음/생년월일 오류/길이 초과).</p>
  {/if}

  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>제목</th><th>행 수</th><th>공개 여부</th><th>작업</th></tr>
      </thead>
      <tbody>
        {#each data.recruitments as r (r.id)}
          <tr>
            <td class="name-cell">{r.title}</td>
            <td>{r.count}</td>
            <td><span class="badge" class:active={r.is_published}>{r.is_published ? '공개' : '비공개'}</span></td>
            <td>
              <div class="actions">
                <button class="btn-sm btn-edit" onclick={() => openEditor({ ...r })}>편집</button>
                <form
                  method="POST" action="?/delete"
                  use:enhance={({ cancel }) => {
                    if (!confirm(`"${r.title}" 모집 공고와 등록된 결과 ${r.count}건을 삭제하시겠습니까?`)) cancel();
                  }}
                >
                  <input type="hidden" name="id" value={r.id} />
                  <button class="btn-sm btn-delete" type="submit">삭제</button>
                </form>
              </div>
            </td>
          </tr>
        {/each}
        {#if data.recruitments.length === 0}
          <tr><td colspan="4" class="empty">등록된 모집 공고가 없습니다.</td></tr>
        {/if}
      </tbody>
    </table>
  </div>

  <!-- ── 편집 / 생성 모달 (결과 관리 포함) ──────────────────── -->
  {#if editing}
    {#key editing.id}
    <div class="modal-overlay">
      <div class="modal modal-wide" role="none" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header-row">
          <h2>{editing.id ? '모집 공고 편집' : '새 모집 공고'}</h2>
          <div class="modal-header-actions">
            <button class="btn-primary btn-save-top" type="submit" form="recruitment-form" disabled={csvPending}>
              {editing.id ? '수정' : '등록'}
            </button>
            <button class="modal-close" type="button" onclick={() => (editing = null)}>✕</button>
          </div>
        </div>

        {#if form?.error}
          <p class="save-error">{form.error}</p>
        {/if}

        <form
          id="recruitment-form"
          method="POST"
          action={editing.id ? '?/update' : '?/create'}
          use:enhance={() => async ({ result, update }) => {
            await update({ reset: false });
            // 공고는 저장됐지만 CSV만 실패한 경우에도 닫는다 (중복 생성 방지, 오류는 페이지에 표시)
            if (result.type === 'success' || (result.type === 'failure' && result.data?.error?.startsWith('공고는 저장됐지만'))) editing = null;
          }}
        >
          {#if editing.id}<input type="hidden" name="id" value={editing.id} />{/if}
          <div class="form-section">
            <h3>기본 정보</h3>
            <label>
              제목 *
              <input type="text" name="title" required maxlength="200" value={editing.title ?? ''} placeholder="예: 2027 아티스트 모집" />
            </label>
            <label class="checkbox-label">
              <input type="checkbox" name="is_published" checked={editing.is_published ?? false} />
              결과 공개 (<code>/result</code> 목록에 노출)
            </label>
          </div>

          <!-- 안내 메시지 (마크다운, 공지사항과 동일) -->
          <div class="form-section">
            <div class="content-header">
              <h3>결과 안내 메시지 (마크다운 문법 지원)</h3>
              <button type="button" class="btn-secondary btn-toggle-preview" onclick={() => (showPreview = !showPreview)}>
                {showPreview ? '편집으로' : '미리보기'}
              </button>
            </div>
            <!-- 미리보기 중에도 값이 제출되도록 textarea는 항상 렌더링하고 숨긴다 -->
            <div class:hidden={showPreview}>
              <label>
                합격 메시지
                <textarea name="pass_message" bind:value={passMessage} placeholder="마크다운 문법으로 작성하세요 (# 제목, **굵게**, - 목록 등)"></textarea>
              </label>
              <label>
                불합격 메시지
                <textarea name="fail_message" bind:value={failMessage} placeholder="마크다운 문법으로 작성하세요"></textarea>
              </label>
            </div>
            {#if showPreview}
              <p class="note">합격 메시지</p>
              <div class="markdown-preview markdown-body">{@html renderMarkdown(passMessage || '_내용 없음_')}</div>
              <p class="note">불합격 메시지</p>
              <div class="markdown-preview markdown-body">{@html renderMarkdown(failMessage || '_내용 없음_')}</div>
            {/if}
          </div>

          <div class="form-section">
            <h3>지원자 결과 CSV (선택)</h3>
            <p class="note">
              {#if editing.id}
                파일을 선택하고 저장하면 기존 결과 {currentCount}건이 <strong>모두 교체</strong>됩니다. 이름·생년월일·결과 외 열은 저장되지 않습니다.
              {:else}
                파일을 선택하면 등록과 함께 결과를 가져옵니다. 이름·생년월일·결과 외 열은 저장되지 않습니다.
              {/if}
            </p>
            <input type="file" accept=".csv,text/csv" onchange={onFile} />
            {@render csvMapper()}
            <input type="hidden" name="rows" value={canImport ? JSON.stringify(mappedRows) : ''} />
          </div>

          <div class="form-actions">
            <button class="btn-primary" type="submit" disabled={csvPending}>{editing.id ? '수정' : '등록'}</button>
            <button class="btn-secondary" type="button" onclick={() => (editing = null)}>취소</button>
          </div>
        </form>

        {#if editing.id}
          <!-- 결과 행 직접 편집 (공고 저장 폼과 별개로 즉시 저장) -->
          <div class="form-section rows-section">
            <h3>등록된 결과 ({rows.length})</h3>
            <p class="note">수정은 입력 후 포커스를 옮기거나 Enter를 누르면, 결과 드롭다운은 선택 즉시 저장됩니다.</p>
            {#if rowsError}<p class="save-error">{rowsError}</p>{/if}
            {#if rowsLoading}
              <p class="note">불러오는 중...</p>
            {:else}
              <div class="rows-wrap">
                <table class="rows-table">
                  <thead><tr><th>이름</th><th>생년월일</th><th>결과</th><th></th></tr></thead>
                  <tbody>
                    {#each rows as r (r.id)}
                      <tr>
                        <td><input type="text" class="cell" maxlength="100" value={r.name} onchange={(e) => saveField(r, 'name', e.currentTarget)} /></td>
                        <td><input type="text" class="cell" maxlength="14" inputmode="numeric" value={fmtBirth(r.birth)} onchange={(e) => saveField(r, 'birth', e.currentTarget)} /></td>
                        <td>
                          <select class="cell" value={r.result} onchange={async (e) => {
                            const el = e.currentTarget;
                            flash(r.id, 'saving');
                            const res = await act('rowUpdate', { id: editing.id, rowId: r.id, result: el.value });
                            if (res.error) { el.value = r.result; rowsError = res.error; flash(r.id, 'error'); return; }
                            rowsError = ''; Object.assign(r, res.data.row); flash(r.id, 'saved');
                          }}>
                            {#each PRESET as p}<option value={p}>{p}</option>{/each}
                            {#if !PRESET.includes(r.result)}<option value={r.result}>{r.result || '(비어 있음)'}</option>{/if}
                          </select>
                        </td>
                        <td class="row-actions">
                          <span class="st" class:err={status[r.id] === 'error'}>
                            {status[r.id] === 'saving' ? '저장 중...' : status[r.id] === 'saved' ? '저장됨' : status[r.id] === 'error' ? '실패' : ''}
                          </span>
                          <button type="button" class="btn-sm btn-delete" onclick={() => deleteRow(r)}>삭제</button>
                        </td>
                      </tr>
                    {/each}
                    {#if rows.length === 0}
                      <tr><td colspan="4" class="empty">등록된 결과가 없습니다.</td></tr>
                    {/if}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><input type="text" class="cell" maxlength="100" placeholder="이름" bind:value={newRow.name} /></td>
                      <td><input type="text" class="cell" maxlength="14" inputmode="numeric" placeholder="20080315" bind:value={newRow.birth} /></td>
                      <td>
                        <select class="cell" bind:value={newRow.result}>
                          {#each PRESET as p}<option value={p}>{p}</option>{/each}
                        </select>
                      </td>
                      <td class="row-actions">
                        <button type="button" class="btn-sm btn-edit" disabled={adding || !newRow.name.trim() || !newRow.birth.trim()} onclick={addRow}>
                          {adding ? '추가 중...' : '+ 행 추가'}
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    {/key}
  {/if}
</div>

<style lang="scss">
  .page { min-height: 100vh; background: #fff; color: #222; padding: 2rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;
    .header-left { display: flex; align-items: center; gap: 1.5rem; }
    .back-link { color: #888; text-decoration: none; &:hover { color: #222; } }
    h1 { margin: 0; font-size: 1.5rem; color: #111; } }
  .note { color: #888; font-size: 0.85rem; margin: 0 0 0.75rem; }
  select { display: block; width: 100%; margin-top: 0.25rem; padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db; border-radius: 6px; font: inherit; font-size: 0.9rem; background: #fff; color: #222; }
  .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; font-size: 0.9rem; color: #444; }
  .btn-primary { padding: 0.6rem 1.2rem; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;
    &:hover { background: #1d4ed8; } &:disabled { opacity: 0.5; cursor: not-allowed; } }
  .btn-secondary { padding: 0.6rem 1.2rem; background: #f3f4f6; color: #444; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; }
  .btn-sm { padding: 0.3rem 0.7rem; font-size: 0.85rem; border-radius: 4px; border: none; cursor: pointer; text-decoration: none; display: inline-block;
    &:disabled { opacity: 0.5; cursor: not-allowed; } }
  .btn-edit { background: #2563eb; color: #fff; &:hover { background: #1d4ed8; } }
  .btn-delete { background: #dc3545; color: #fff; &:hover { background: #c82333; } }
  .actions { display: flex; gap: 0.5rem; align-items: center; }
  .badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; background: #eee; color: #666;
    &.active { background: #dcfce7; color: #166534; } }
  .msg { margin: 0.75rem 0; font-size: 0.85rem; &.err { color: #b91c1c; } &.ok { color: #166534; } }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse;
    th, td { padding: 0.75rem 1rem; text-align: left; vertical-align: middle; border-bottom: 1px solid #eee; }
    th { color: #888; font-weight: 500; font-size: 0.85rem; }
    tbody tr:hover { background: #f8f9fa; } }
  .name-cell { font-weight: 600; color: #111; }
  .empty { text-align: center; color: #999; padding: 2rem; }

  /* ── 모달 (artists/concerts 관리 페이지와 동일) ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 2rem; overflow-y: auto; z-index: 1000;
  }
  .modal {
    background: #fff; border: 1px solid #e0e0e0; border-radius: 12px;
    padding: 2rem; width: 100%; max-width: 700px; max-height: 90vh;
    overflow-y: auto; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); position: relative;
    h2 { margin: 0; font-size: 1.3rem; color: #111; }
    &.modal-wide { max-width: 900px; }
  }
  .modal-header-row {
    position: sticky; top: -2rem; z-index: 2;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    margin: -2rem -2rem 1.5rem; padding: 1.25rem 2rem 1rem;
    background: #fff; border-bottom: 1px solid #eee;
  }
  .modal-header-actions {
    display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;
    .modal-close { position: static; }
  }
  .btn-save-top { flex-shrink: 0; padding: 0.45rem 1rem; font-size: 0.85rem; }
  .save-error {
    background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;
    border-radius: 6px; padding: 0.6rem 0.9rem; margin: 0 0 1rem;
    font-size: 0.85rem; white-space: pre-wrap;
  }
  .modal-close {
    position: absolute; top: 0.75rem; right: 0.75rem;
    background: none; border: none; color: #888; font-size: 1.4rem; cursor: pointer; z-index: 1;
    &:hover { color: #222; }
  }
  .form-section {
    margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee;
    h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #666; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #444; }
    input[type='text'], textarea {
      display: block; width: 100%; margin-top: 0.25rem;
      padding: 0.5rem 0.75rem; background: #fff; border: 1px solid #d1d5db;
      border-radius: 6px; color: #222; font-size: 0.9rem;
      &:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
    }
    textarea { resize: vertical; font-family: 'SFMono-Regular', Consolas, monospace; min-height: 200px; }
  }
  .hidden { display: none; }
  .content-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;
    h3 { margin: 0; }
  }
  .btn-toggle-preview { padding: 0.35rem 0.8rem; font-size: 0.8rem; }
  .markdown-preview {
    min-height: 120px; padding: 1rem; margin-bottom: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;
    background: #fafafa; color: #222; font-size: 0.9rem; line-height: 1.7;
    overflow-wrap: break-word;

    :global(p) { margin: 0 0 0.75em; }
    :global(img) { max-width: 100%; }
    :global(a) { color: #2563eb; }
    :global(ul), :global(ol) { padding-left: 1.5em; margin: 0 0 0.75em; }
    :global(table) { width: 100%; margin: 0 0 1em; border-collapse: collapse; text-align: center; }
    :global(th), :global(td) { border: 1px solid #ddd; padding: 0.25rem 0.5rem; text-align: center; }
    :global(th) { font-weight: 700; }
  }
  .checkbox-label {
    display: flex !important; align-items: center; gap: 0.5rem; cursor: pointer;
    input { width: auto; margin: 0; cursor: pointer; }
  }
  .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end; }

  .rows-wrap { max-height: 420px; overflow: auto; border: 1px solid #eee; border-radius: 6px; }
  .rows-table {
    th, td { padding: 0.15rem 0.35rem; }
    thead th { position: sticky; top: 0; background: #fff; z-index: 1; }
    tfoot td { position: sticky; bottom: 0; background: #f8f9fa; border-top: 1px solid #ddd; border-bottom: none; }
    .cell { margin: 0; padding: 0.25rem 0.35rem; font-size: 0.85rem; border: none; border-radius: 4px; background: transparent; box-shadow: none; outline: none;
      &:hover { background: #f3f4f6; }
      &:focus { background: #eef2ff; } }
    tfoot .cell { background: #fff; }
    /* .form-section input[type='text'] 규칙보다 우선하도록 specificity를 높임 */
    input.cell[type='text'] { border: none; background: transparent; margin: 0; padding: 0.25rem 0.35rem; border-radius: 4px;
      &:hover { background: #f3f4f6; }
      &:focus { background: #eef2ff; } }
    tfoot input.cell[type='text'] { background: #fff; }
  }
  .row-actions { white-space: nowrap; text-align: right;
    .st { font-size: 0.75rem; color: #166534; margin-right: 0.5rem; &.err { color: #b91c1c; } } }
</style>
