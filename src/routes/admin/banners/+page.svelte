<script>
  import Button from '$lib/components/ui/Button.svelte';
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte';
  import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  const TYPE_LABELS = {
    hero: 'Hero 이미지',
    latest_concert: '최신 콘서트 (자동)',
    latest_concours: '최신 콩쿠르 (자동)',
    latest_audition: '최신 오디션 (자동)',
    concert: '특정 콘서트',
    concours: '특정 콩쿠르',
    audition: '특정 오디션',
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
  let saveError = $state('');
  let panelOpen = $state(false);
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
    saveError = '';
    panelOpen = false;
  }

  function startAdd() {
    resetAddForm();
    addType = 'hero';
    panelOpen = true;
  }

  function submit() {
    return editingId ? saveEdit() : addBanner();
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
    saveError = '';
    panelOpen = true;
  }

  async function addBanner() {
    if (addType === 'hero' && !pickedMedia) {
      saveError = '배너에 사용할 이미지가 없습니다. 이미지 선택에서 고른 뒤 저장해 주세요.';
      return;
    }
    if (REF_TYPES.includes(addType) && !addRefId) {
      saveError = '노출할 항목이 선택되지 않았습니다. 목록에서 항목을 고른 뒤 저장해 주세요.';
      return;
    }

    adding = true;
    saveError = '';
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
      saveError = '추가 실패: ' + e.message + '.';
    }
    adding = false;
  }

  async function saveEdit() {
    if (!pickedMedia) {
      saveError = '배너에 사용할 이미지가 없습니다. 이미지 선택에서 고른 뒤 저장해 주세요.';
      return;
    }

    adding = true;
    saveError = '';
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
      saveError = '수정 실패: ' + e.message + '.';
    }
    adding = false;
  }

  $effect(() => {
    loadBanners();
    loadRefLists();
  });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && pickerOpen) pickerOpen = false; }} />

<svelte:head>
  <title>배너 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>배너 관리</h1>
    </div>
    <Button onclick={startAdd}>+ 배너 추가</Button>
  </header>

  <section class="banner-section">
    <div class="section-head">
      <h2>등록된 배너 <span class="count">({banners.length})</span></h2>
      <p class="hint">위에서부터 순서대로 메인 페이지에 노출됩니다.</p>
    </div>

    {#if banersLoading}
      <div class="state-msg">로딩 중...</div>
    {:else if banners.length === 0}
      <div class="state-msg">등록된 배너가 없습니다. 배너 추가를 눌러 등록해 주세요.</div>
    {:else}
      <ul class="banner-list">
        {#each banners as banner, i}
          {@const slide = resolvedById[banner.id]}
          <li class="banner-row" class:inactive={!banner.is_active}>
            <div class="row-order">
              <Button variant="secondary" class="sm" disabled={i === 0} onclick={() => move(i, -1)} aria-label="위로">▲</Button>
              <Button variant="secondary" class="sm" disabled={i === banners.length - 1} onclick={() => move(i, 1)} aria-label="아래로">▼</Button>
            </div>
            <div class="row-thumb">
              {#if slide?.image}
                <ResponsiveImage src={slide.image} alt="" sizes="96px" />
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
                <Button variant="secondary" class="sm" onclick={() => startEdit(banner)}>수정</Button>
              {/if}
              <Button variant="secondary" class="sm" aria-pressed={banner.is_active} onclick={() => toggleActive(banner)}>
                {banner.is_active ? '노출 중' : '숨김'}
              </Button>
              <Button variant="secondary" class="sm danger" onclick={() => deleteBanner(banner.id)} aria-label="삭제">삭제</Button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <SlidePanel
    open={panelOpen}
    title={editingId ? '배너 수정' : '배너 추가'}
    sections={addType === 'hero' ? [{ id: 'target', label: '노출 대상' }, { id: 'text', label: '문구와 링크' }, { id: 'image', label: '이미지' }] : [{ id: 'target', label: '노출 대상' }]}
    snapshot={() => [addType, addRefId, addTitle, addSubtitle, addLinkUrl, pickedMedia?.id]}
    saving={adding}
    error={saveError}
    saveLabel={editingId ? '수정' : '추가'}
    suspended={pickerOpen}
    onsave={submit}
    onclose={resetAddForm}
  >
    <div class="form-section" data-section="target">
      <h3>노출 대상</h3>
      {#if editingId}
        <div class="field">
          노출 타입
          <div class="static-value">{TYPE_LABELS[addType] || addType}</div>
        </div>
      {:else}
        <label class="field">
          노출 타입
          <select bind:value={addType} onchange={() => { addRefId = ''; addTitle = ''; addSubtitle = ''; addLinkUrl = ''; pickedMedia = null; }}>
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
    </div>

    {#if addType === 'hero'}
      <div class="form-section" data-section="text">
        <h3>문구와 링크</h3>
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
      </div>

      <div class="form-section" data-section="image">
        <h3>이미지</h3>
        <div class="media-picker">
          {#if pickedMedia}
            <div class="picked-preview">
              <ResponsiveImage src={pickedMedia.thumb_url || pickedMedia.url} alt="" sizes="64px" />
              <span class="picked-name">{pickedMedia.original_filename}</span>
              <Button variant="secondary" class="sm" onclick={() => (pickedMedia = null)} aria-label="선택 취소">✕</Button>
            </div>
          {/if}
          <Button variant="secondary" class="sm" onclick={openPicker}>이미지 선택</Button>
        </div>
      </div>
    {/if}
  </SlidePanel>

<!-- ── 이미지 선택 모달 ─────────────────────────── -->
  {#if pickerOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="picker-modal-overlay" onclick={() => pickerOpen = false} role="presentation">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="picker-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="picker-modal-header">
          <h2>이미지 선택</h2>
          <Button variant="secondary" onclick={() => pickerOpen = false} aria-label="닫기">✕</Button>
        </div>

        <div class="picker-modal-controls">
          <input
            type="text"
            placeholder="파일명, 태그로 검색..."
            bind:value={mediaSearch}
            onkeydown={(e) => { if (e.key === 'Enter') { mediaPage = 0; loadMedia(); } }}
          />
          <Button variant="secondary" class="sm" onclick={() => { mediaPage = 0; loadMedia(); }}>검색</Button>
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
                  <ResponsiveImage src={media.thumb_url || media.url} alt={media.alt_text || media.original_filename} sizes="120px" />
                  <span class="picker-modal-card-name">{media.original_filename}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="picker-modal-footer">
          <Button variant="secondary" class="sm" disabled={mediaPage === 0} onclick={() => { mediaPage--; loadMedia(); }}>← 이전</Button>
          <span>{mediaPage + 1} / {Math.max(1, Math.ceil(mediaTotal / MEDIA_PAGE_SIZE))}</span>
          <Button
            variant="secondary"
            class="sm"
            disabled={(mediaPage + 1) * MEDIA_PAGE_SIZE >= mediaTotal}
            onclick={() => { mediaPage++; loadMedia(); }}
          >다음 →</Button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .section-head {
    margin-bottom: var(--space-3);
    h2 { margin: 0 0 var(--space-1); font-size: 18px; }
  }
  .count { font-weight: 400; }
  .hint { margin: 0; font-size: 13px; color: var(--color-green-700); }
  .state-msg { padding: var(--space-4); text-align: center; color: var(--color-green-700); border: 1px dashed var(--color-border); border-radius: var(--radius); }

  .banner-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
  .banner-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    &.inactive { border-style: dashed; .row-info { opacity: 0.6; } }
  }
  .row-order { display: flex; flex-direction: column; gap: var(--space-1); }
  .row-thumb {
    flex: none; width: 96px; height: 54px; border-radius: var(--radius); overflow: hidden; background: var(--color-green-100);
    :global(img) { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb-placeholder { width: 100%; height: 100%; display: grid; place-items: center; }
  }
  .row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .row-type { font-size: 14px; font-weight: 500; }
  .row-ref { font-size: 13px; color: var(--color-green-700); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-warn { font-size: 12px; color: var(--color-green-700); &::before { content: '! '; font-weight: 700; } }
  .row-actions { display: flex; gap: var(--space-2); align-items: center; }

  .field { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-3); font-size: 14px; }
  .static-value { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-green-200); border-radius: var(--radius); background: var(--color-green-50); }
  .media-picker { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); }
  .picked-preview {
    display: flex; align-items: center; gap: var(--space-2); width: 100%;
    padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius);
    :global(img) { width: 64px; height: 40px; object-fit: cover; border-radius: var(--radius); }
    .picked-name { flex: 1; min-width: 0; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }

  .picker-modal-overlay {
    position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: var(--space-4);
    background: color-mix(in srgb, var(--color-green-800) 45%, transparent);
  }
  .picker-modal {
    width: 100%; max-width: 860px; max-height: 90vh; display: flex; flex-direction: column;
    background: var(--color-surface); color: var(--color-on-surface); border: 1px solid var(--color-border); border-radius: var(--radius);
  }
  .picker-modal-header, .picker-modal-controls, .picker-modal-footer {
    display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4);
  }
  .picker-modal-header { justify-content: space-between; border-bottom: 1px solid var(--color-green-200); h2 { margin: 0; font-size: 18px; } }
  .picker-modal-controls input { flex: 1; }
  .picker-modal-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 var(--space-4); }
  .picker-modal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-3); }
  .picker-modal-card {
    cursor: pointer; border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden;
    &:hover { background: var(--color-green-100); }
    :global(img) { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
  }
  .picker-modal-card-name { display: block; padding: var(--space-1); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .picker-modal-footer { justify-content: center; border-top: 1px solid var(--color-green-200); }
</style>
