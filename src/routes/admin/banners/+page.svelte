<script>
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  const TYPE_LABELS = {
    hero: '🖼️ Hero 이미지',
    latest_concert: '🎵 최신 콘서트 (자동)',
    latest_concours: '🏆 최신 콩쿠르 (자동)',
    latest_audition: '🎤 최신 오디션 (자동)',
    concert: '🎵 특정 콘서트',
    concours: '🏆 특정 콩쿠르',
    audition: '🎤 특정 오디션',
  };

  const REF_TYPES = ['concert', 'concours', 'audition'];

  // ── 배너 목록 ─────────────────────────────────────
  let banners = $state([]);
  let resolvedById = $state({}); // banner.id -> resolved slide (preview image)
  let banersLoading = $state(true);

  // 참조 대상 목록 (특정 콘서트/콩쿠르/오디션 지정용 + 라벨 표시용)
  let concertList = $state([]);
  let concoursList = $state([]);
  let auditionList = $state([]);

  function refTitle(itemType, refId) {
    const list = itemType === 'concert' ? concertList : itemType === 'concours' ? concoursList : auditionList;
    return list.find(i => i.id === refId)?.title || `#${refId}`;
  }

  async function loadBanners() {
    banersLoading = true;
    try {
      const [rawRes, resolvedRes] = await Promise.all([
        fetch(`${API}/api/banners/`),
        fetch(`${API}/api/banners/resolved`),
      ]);
      banners = rawRes.ok ? await rawRes.json() : [];
      const resolved = resolvedRes.ok ? await resolvedRes.json() : [];
      resolvedById = Object.fromEntries(resolved.map(s => [s.id, s]));
    } catch (e) {
      console.error('Failed to load banners:', e);
    }
    banersLoading = false;
  }

  async function loadRefLists() {
    try {
      const [c, k, a] = await Promise.all([
        fetch(`${API}/api/concerts`).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/concours/`).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/auditions`).then(r => r.json()).catch(() => []),
      ]);
      concertList = Array.isArray(c) ? c : [];
      concoursList = Array.isArray(k) ? k : [];
      auditionList = Array.isArray(a) ? a : [];
    } catch (e) {
      console.error('Failed to load reference lists:', e);
    }
  }

  async function toggleActive(banner) {
    const formData = new FormData();
    formData.append('is_active', String(!banner.is_active));
    const res = await fetch(`${API}/api/banners/${banner.id}`, { method: 'PUT', body: formData });
    if (res.ok) await loadBanners();
    else alert('변경 실패: ' + (await res.text()));
  }

  async function deleteBanner(id) {
    if (!confirm('이 배너 항목을 삭제하시겠습니까?')) return;
    const res = await fetch(`${API}/api/banners/${id}`, { method: 'DELETE' });
    if (res.ok) await loadBanners();
    else alert('삭제 실패: ' + (await res.text()));
  }

  async function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= banners.length) return;
    const reordered = [...banners];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    banners = reordered;

    const formData = new FormData();
    for (const b of reordered) formData.append('order', String(b.id));
    const res = await fetch(`${API}/api/banners/reorder`, { method: 'POST', body: formData });
    if (res.ok) await loadBanners();
    else alert('순서 변경 실패: ' + (await res.text()));
  }

  // ── 추가/수정 패널 ─────────────────────────────────
  let addType = $state('hero');
  let addRefId = $state('');
  let addTitle = $state('');
  let addSubtitle = $state('');
  let addLinkUrl = $state('');
  let adding = $state(false);
  let editingId = $state(null); // null이면 추가 모드, 아니면 해당 배너 id 수정 모드

  // Hero 타입 전용: 미디어 라이브러리에서 이미지 선택 (모달)
  let mediaList = $state([]);
  let mediaTotal = $state(0);
  let mediaLoading = $state(false);
  let mediaPage = $state(0);
  let mediaSearch = $state('');
  let pickedMedia = $state(null);
  let pickerOpen = $state(false);
  const MEDIA_PAGE_SIZE = 24;

  async function loadMedia() {
    mediaLoading = true;
    try {
      const params = new URLSearchParams({
        skip: String(mediaPage * MEDIA_PAGE_SIZE),
        limit: String(MEDIA_PAGE_SIZE),
      });
      if (mediaSearch) params.set('search', mediaSearch);
      const res = await fetch(`${API}/api/media?${params}`);
      const data = await res.json();
      mediaList = data.items || [];
      mediaTotal = data.total || 0;
    } catch (e) {
      console.error('Failed to load media:', e);
    }
    mediaLoading = false;
  }

  function openPicker() {
    pickerOpen = true;
    loadMedia();
  }

  function choosePicked(media) {
    pickedMedia = media;
    pickerOpen = false;
  }

  function resetAddForm() {
    addRefId = '';
    addTitle = '';
    addSubtitle = '';
    addLinkUrl = '';
    pickedMedia = null;
    editingId = null;
  }

  function startEdit(banner) {
    editingId = banner.id;
    addType = banner.item_type;
    addTitle = banner.title || '';
    addSubtitle = banner.subtitle || '';
    addLinkUrl = banner.link_url || '';
    pickedMedia = banner.media_id
      ? { id: banner.media_id, url: banner.image_url, thumb_url: banner.image_url, original_filename: '현재 이미지' }
      : null;
  }

  async function addBanner() {
    if (addType === 'hero' && !pickedMedia) {
      alert('배너에 사용할 이미지를 미디어 라이브러리에서 선택해주세요.');
      return;
    }
    if (REF_TYPES.includes(addType) && !addRefId) {
      alert('노출할 항목을 선택해주세요.');
      return;
    }

    adding = true;
    try {
      const formData = new FormData();
      formData.append('item_type', addType);
      formData.append('sort_order', String(banners.length));
      if (addType === 'hero') {
        formData.append('media_id', String(pickedMedia.id));
        if (addTitle) formData.append('title', addTitle);
        if (addSubtitle) formData.append('subtitle', addSubtitle);
        if (addLinkUrl) formData.append('link_url', addLinkUrl);
      } else if (REF_TYPES.includes(addType)) {
        formData.append('ref_id', String(addRefId));
      }

      const res = await fetch(`${API}/api/banners/`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      resetAddForm();
      await loadBanners();
    } catch (e) {
      alert('추가 실패: ' + e.message);
    }
    adding = false;
  }

  async function saveEdit() {
    if (!pickedMedia) {
      alert('배너에 사용할 이미지를 미디어 라이브러리에서 선택해주세요.');
      return;
    }

    adding = true;
    try {
      const formData = new FormData();
      if (pickedMedia.id !== undefined) formData.append('media_id', String(pickedMedia.id));
      formData.append('title', addTitle);
      formData.append('subtitle', addSubtitle);
      formData.append('link_url', addLinkUrl);

      const res = await fetch(`${API}/api/banners/${editingId}`, { method: 'PUT', body: formData });
      if (!res.ok) throw new Error(await res.text());
      resetAddForm();
      await loadBanners();
    } catch (e) {
      alert('수정 실패: ' + e.message);
    }
    adding = false;
  }

  $effect(() => {
    loadBanners();
    loadRefLists();
  });
</script>

<svelte:head>
  <title>배너 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <a href="/admin" class="back-link">← Admin</a>
    <h1>🎞️ 배너 관리</h1>
  </header>

  <div class="layout">
    <!-- ── 왼쪽: 현재 배너 순서 ───────────────────────── -->
    <section class="banner-section">
      <div class="section-head">
        <h2>등록된 배너 <span class="count">({banners.length})</span></h2>
        <p class="hint">위에서부터 순서대로 메인 페이지에 노출됩니다.</p>
      </div>

      {#if banersLoading}
        <div class="state-msg">로딩 중...</div>
      {:else if banners.length === 0}
        <div class="state-msg empty">등록된 배너가 없습니다.<br/>오른쪽 패널에서 추가해주세요.</div>
      {:else}
        <ul class="banner-list">
          {#each banners as banner, i}
            {@const slide = resolvedById[banner.id]}
            <li class="banner-row {banner.is_active ? '' : 'inactive'}">
              <div class="row-order">
                <button disabled={i === 0} onclick={() => move(i, -1)} aria-label="위로">▲</button>
                <button disabled={i === banners.length - 1} onclick={() => move(i, 1)} aria-label="아래로">▼</button>
              </div>
              <div class="row-thumb">
                {#if slide?.image}
                  <img src={slide.image} alt="" loading="lazy" />
                {:else}
                  <div class="thumb-placeholder">?</div>
                {/if}
              </div>
              <div class="row-info">
                <span class="row-type">{TYPE_LABELS[banner.item_type] || banner.item_type}</span>
                {#if REF_TYPES.includes(banner.item_type)}
                  <span class="row-ref">{refTitle(banner.item_type, banner.ref_id)}</span>
                {:else if banner.item_type === 'hero' && banner.title}
                  <span class="row-ref">{banner.title}</span>
                {/if}
                {#if !slide && banner.is_active}
                  <span class="row-warn">노출할 데이터 없음 (예: 예정된 공연/오디션 없음)</span>
                {/if}
              </div>
              <div class="row-actions">
                {#if banner.item_type === 'hero'}
                  <button class="btn-toggle" onclick={() => startEdit(banner)}>수정</button>
                {/if}
                <button class="btn-toggle" onclick={() => toggleActive(banner)}>
                  {banner.is_active ? '노출 중' : '숨김'}
                </button>
                <button class="btn-delete" onclick={() => deleteBanner(banner.id)} aria-label="삭제">✕</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- ── 오른쪽: 추가/수정 패널 ─────────────────────── -->
    <aside class="add-panel">
      <h2>{editingId ? '배너 수정' : '배너 추가'}</h2>

      {#if editingId}
        <div class="field">
          노출 타입
          <div class="static-value">{TYPE_LABELS[addType] || addType}</div>
        </div>
      {:else}
        <label class="field">
          노출 타입
          <select bind:value={addType} onchange={resetAddForm}>
            {#each Object.entries(TYPE_LABELS) as [value, label]}
              <option {value}>{label}</option>
            {/each}
          </select>
        </label>
      {/if}

      {#if !editingId && REF_TYPES.includes(addType)}
        <label class="field">
          노출할 항목 선택
          <select bind:value={addRefId}>
            <option value="">-- 선택 --</option>
            {#each (addType === 'concert' ? concertList : addType === 'concours' ? concoursList : auditionList) as item}
              <option value={item.id}>{item.title}</option>
            {/each}
          </select>
        </label>
      {/if}

      {#if addType === 'hero'}
        <label class="field">
          제목 (선택)
          <input type="text" bind:value={addTitle} placeholder="예: 예술가들의 음악이 피어나는 곳" />
        </label>
        <label class="field">
          부제 (선택)
          <input type="text" bind:value={addSubtitle} placeholder="예: Fiore에서 만나는 클래식의 감동" />
        </label>
        <label class="field">
          링크 (선택)
          <input type="text" bind:value={addLinkUrl} placeholder="/concerts 등" />
        </label>

        <div class="media-picker">
          {#if pickedMedia}
            <div class="picked-preview">
              <img src={pickedMedia.thumb_url || pickedMedia.url} alt="" />
              <span class="picked-name">{pickedMedia.original_filename}</span>
              <button class="btn-cancel-pick" onclick={() => pickedMedia = null}>✕</button>
            </div>
          {/if}
          <button class="btn-open-picker" onclick={openPicker}>🖼️ 이미지 선택</button>
        </div>
      {/if}

      {#if editingId}
        <div class="edit-actions">
          <button class="btn-add" onclick={saveEdit} disabled={adding}>
            {adding ? '저장 중...' : '수정 저장'}
          </button>
          <button class="btn-cancel-edit" onclick={resetAddForm} disabled={adding}>취소</button>
        </div>
      {:else}
        <button class="btn-add" onclick={addBanner} disabled={adding}>
          {adding ? '추가 중...' : '배너로 추가'}
        </button>
      {/if}
    </aside>
  </div>

  <!-- ── 이미지 선택 모달 ─────────────────────────── -->
  {#if pickerOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="picker-modal-overlay" onclick={() => pickerOpen = false} role="presentation">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="picker-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="picker-modal-header">
          <h2>이미지 선택</h2>
          <button class="btn-modal-close" onclick={() => pickerOpen = false} aria-label="닫기">✕</button>
        </div>

        <div class="picker-modal-controls">
          <input
            type="text"
            placeholder="파일명, 태그로 검색..."
            bind:value={mediaSearch}
            onkeydown={(e) => { if (e.key === 'Enter') { mediaPage = 0; loadMedia(); } }}
          />
          <button class="btn-sm" onclick={() => { mediaPage = 0; loadMedia(); }}>검색</button>
        </div>

        <div class="picker-modal-body">
          {#if mediaLoading}
            <div class="state-msg">로딩 중...</div>
          {:else if mediaList.length === 0}
            <div class="state-msg empty">이미지가 없습니다.</div>
          {:else}
            <div class="picker-modal-grid">
              {#each mediaList as media}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                  class="picker-modal-card"
                  onclick={() => choosePicked(media)}
                  role="button"
                  tabindex="0"
                >
                  <img src={media.thumb_url || media.url} alt={media.alt_text || media.original_filename} loading="lazy" />
                  <span class="picker-modal-card-name">{media.original_filename}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="picker-modal-footer">
          <button disabled={mediaPage === 0} onclick={() => { mediaPage--; loadMedia(); }}>← 이전</button>
          <span>{mediaPage + 1} / {Math.max(1, Math.ceil(mediaTotal / MEDIA_PAGE_SIZE))}</span>
          <button
            disabled={(mediaPage + 1) * MEDIA_PAGE_SIZE >= mediaTotal}
            onclick={() => { mediaPage++; loadMedia(); }}
          >다음 →</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .page {
    min-height: 100vh;
    background: #fff;
    color: #222;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;

    .back-link { color: #888; text-decoration: none; &:hover { color: #222; } }
    h1 { margin: 0; font-size: 1.5rem; color: #111; }
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 2rem;
    align-items: start;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  .section-head {
    margin-bottom: 1rem;
  }

  h2 {
    margin: 0 0 0.25rem;
    font-size: 1.15rem;
    color: #111;
    font-weight: 600;
  }

  .count { font-weight: 400; color: #888; font-size: 0.9rem; }
  .hint { margin: 0; font-size: 0.8rem; color: #999; }

  .state-msg {
    text-align: center;
    padding: 3rem 1rem;
    color: #aaa;
    font-size: 0.95rem;
    &.empty { line-height: 1.7; }
  }

  /* ── 배너 목록 ── */
  .banner-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .banner-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fafafa;

    &.inactive { opacity: 0.5; }
  }

  .row-order {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    button {
      width: 24px;
      height: 20px;
      border: 1px solid #d1d5db;
      background: #fff;
      border-radius: 4px;
      font-size: 0.6rem;
      cursor: pointer;
      color: #555;
      &:hover:not(:disabled) { background: #f3f4f6; }
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }
  }

  .row-thumb {
    width: 64px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 5px;
    overflow: hidden;
    background: #eee;

    img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .thumb-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #bbb;
      font-size: 0.85rem;
    }
  }

  .row-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .row-type { font-size: 0.85rem; color: #222; font-weight: 500; }
  .row-ref {
    font-size: 0.78rem;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row-warn { font-size: 0.72rem; color: #b45309; }

  .row-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .btn-toggle {
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 5px;
    background: #fff;
    color: #444;
    cursor: pointer;
    white-space: nowrap;
    &:hover { background: #f3f4f6; }
  }

  .btn-delete {
    background: none;
    border: none;
    color: #bbb;
    cursor: pointer;
    font-size: 0.9rem;
    &:hover { color: #dc3545; }
  }

  /* ── 추가 패널 ── */
  .add-panel {
    background: #f8f9fa;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
    position: sticky;
    top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: #666;

    input, select {
      padding: 0.45rem 0.6rem;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      color: #222;
      font-size: 0.85rem;
      &:focus { outline: none; border-color: #2563eb; }
    }
  }

  .static-value {
    padding: 0.45rem 0.6rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    color: #444;
    font-size: 0.85rem;
  }

  .edit-actions {
    display: flex;
    gap: 0.5rem;

    .btn-add { flex: 2; }
  }

  .btn-cancel-edit {
    flex: 1;
    padding: 0.75rem;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #444;
    font-size: 0.9rem;
    cursor: pointer;
    &:hover:not(:disabled) { background: #f3f4f6; }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
  }

  .media-picker { display: flex; flex-direction: column; gap: 0.6rem; }

  .btn-open-picker {
    padding: 0.6rem;
    background: #fff;
    border: 1px dashed #9ca3af;
    border-radius: 6px;
    color: #444;
    font-size: 0.85rem;
    cursor: pointer;
    &:hover { background: #f3f4f6; border-color: #6b7280; }
  }

  .btn-sm {
    padding: 0.4rem 0.7rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 5px;
    font-size: 0.8rem;
    cursor: pointer;
    white-space: nowrap;
    &:hover { background: #1d4ed8; }
  }

  .picked-preview {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;

    img { width: 44px; height: 44px; object-fit: cover; border-radius: 4px; }
    .picked-name {
      flex: 1;
      min-width: 0;
      font-size: 0.78rem;
      color: #1e40af;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-cancel-pick {
      background: none;
      border: none;
      color: #93c5fd;
      cursor: pointer;
      font-size: 1rem;
      flex-shrink: 0;
      &:hover { color: #1e40af; }
    }
  }

  /* ── 이미지 선택 모달 ── */
  .picker-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .picker-modal {
    background: #fff;
    border-radius: 12px;
    width: min(1000px, 100%);
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .picker-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;

    h2 { margin: 0; font-size: 1.1rem; color: #111; }
  }

  .btn-modal-close {
    background: none;
    border: none;
    font-size: 1.1rem;
    color: #888;
    cursor: pointer;
    &:hover { color: #222; }
  }

  .picker-modal-controls {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;

    input {
      flex: 1;
      padding: 0.55rem 0.75rem;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      color: #222;
      font-size: 0.9rem;
      &:focus { outline: none; border-color: #2563eb; }
    }
  }

  .picker-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .picker-modal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }

  .picker-modal-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    cursor: pointer;

    img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 6px;
      border: 2px solid transparent;
      transition: border-color 0.15s, transform 0.15s;
    }

    &:hover img { border-color: #2563eb; transform: scale(1.02); }
  }

  .picker-modal-card-name {
    font-size: 0.72rem;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .picker-modal-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #e5e7eb;

    button {
      padding: 0.4rem 0.9rem;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      cursor: pointer;
      color: #444;
      font-size: 0.85rem;
      &:hover { background: #f3f4f6; }
      &:disabled { opacity: 0.35; cursor: not-allowed; }
    }

    span { font-size: 0.85rem; color: #888; }
  }

  .btn-add {
    width: 100%;
    padding: 0.75rem;
    background: #111;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s;

    &:hover:not(:disabled) { background: #374151; }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
  }
</style>
