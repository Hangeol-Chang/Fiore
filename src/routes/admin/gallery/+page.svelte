<script>
  import Button from '$lib/components/ui/Button.svelte';
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte';
  import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
  import { uploadMediaFile, fetchWithRetry } from '$lib/utils/uploadMedia.js';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  // ── 갤러리 목록 ─────────────────────────────────────
  let gallery = $state([]);
  let galleryLoading = $state(true);

  async function loadGallery() {
    galleryLoading = true;
    try {
      const res = await fetch(`${API}/api/gallery/?sort=recent`);
      if (res.ok) gallery = await res.json();
    } catch (e) {
      console.error('Failed to load gallery:', e);
    }
    galleryLoading = false;
  }

  async function deleteGalleryItem(id) {
    if (!confirm('갤러리에서 이 이미지를 제거하시겠습니까?\n(미디어 원본은 삭제되지 않습니다)')) return;
    try {
      const res = await fetch(`${API}/api/gallery/${id}`, { method: 'DELETE' });
      if (res.ok) await loadGallery();
      else alert('삭제 실패: ' + res.statusText);
    } catch (e) {
      alert('삭제 오류: ' + e.message);
    }
  }

  // ── 추가 패널 탭 ─────────────────────────────────────
  /** @type {'media' | 'upload'} */
  let addTab = $state('media');

  // 폼 공통
  let addTitle = $state('');
  let addCategory = $state('');
  let addSortOrder = $state(0);
  let adding = $state(false);
  let panelOpen = $state(false);
  let saveError = $state('');

  // ── 탭 1: 미디어 라이브러리에서 선택 ────────────────
  let mediaList = $state([]);
  let mediaTotal = $state(0);
  let mediaLoading = $state(false);
  let mediaPage = $state(0);
  let mediaFilter = $state('');
  let mediaSearch = $state('');
  let pickedMedia = $state(null);  // 선택된 미디어 객체
  const MEDIA_PAGE_SIZE = 20;

  const mediaCategories = [
    { value: 'artist', label: '아티스트' },
    { value: 'concert', label: '콘서트' },
    { value: 'gallery', label: '갤러리' },
    { value: 'general', label: '일반' },
  ];

  async function loadMedia() {
    mediaLoading = true;
    try {
      const params = new URLSearchParams({
        skip: String(mediaPage * MEDIA_PAGE_SIZE),
        limit: String(MEDIA_PAGE_SIZE),
      });
      if (mediaFilter) params.set('category', mediaFilter);
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

  function openAdd() {
    pickedMedia = null;
    dropFiles = [];
    addTitle = '';
    addCategory = '';
    addSortOrder = 0;
    saveError = '';
    panelOpen = true;
  }

  function closePanel() {
    panelOpen = false;
    saveError = '';
  }

  function submit() {
    return addTab === 'media' ? addFromMedia() : uploadAndAdd();
  }

  async function addFromMedia() {
    if (!pickedMedia) return;
    adding = true;
    saveError = '';
    try {
      const formData = new FormData();
      formData.append('media_id', String(pickedMedia.id));
      if (addTitle) formData.append('title', addTitle);
      if (addCategory) formData.append('category', addCategory);
      formData.append('sort_order', String(addSortOrder));

      const res = await fetch(`${API}/api/gallery/`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      pickedMedia = null;
      addTitle = '';
      addCategory = '';
      addSortOrder = 0;
      closePanel();
      await loadGallery();
    } catch (e) {
      saveError = '추가 실패: ' + e.message + '.';
    }
    adding = false;
  }

  // ── 탭 2: 직접 업로드 ────────────────────────────────
  let dropFiles = $state([]);
  let dragOver = $state(false);
  let uploadCategory = $state('gallery');
  let uploading = $state(false);
  let uploadResults = $state([]);

  function handleDrop(e) {
    e.preventDefault();
    dragOver = false;
    dropFiles = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
  }

  function handleFileInput(e) {
    dropFiles = Array.from(e.target.files || []);
    uploadResults = [];
  }

  function removeDropFile(idx) {
    dropFiles = dropFiles.filter((_, i) => i !== idx);
  }

  async function uploadAndAdd() {
    if (!dropFiles.length) return;
    uploading = true;
    uploadResults = [];
    saveError = '';

    for (const file of dropFiles) {
      try {
        // 1단계: media 업로드 (실패 시 자동 재시도)
        const media = await uploadMediaFile(API, file, uploadCategory, { alt_text: addTitle || undefined });

        // 2단계: gallery_images에 추가
        const gForm = new FormData();
        gForm.append('media_id', String(media.id));
        if (addTitle) gForm.append('title', addTitle);
        if (addCategory) gForm.append('category', addCategory);
        gForm.append('sort_order', String(addSortOrder));

        await fetchWithRetry(`${API}/api/gallery/`, { method: 'POST', body: gForm });

        uploadResults = [...uploadResults, { success: true, name: file.name }];
      } catch (e) {
        uploadResults = [...uploadResults, { success: false, name: file.name, error: e.message }];
      }
    }

    uploading = false;
    const failed = uploadResults.filter((x) => !x.success);
    if (failed.length) {
      // 성공한 파일은 목록에서 빼서, 다시 저장해도 중복 등록되지 않게 한다
      const okNames = new Set(uploadResults.filter((x) => x.success).map((x) => x.name));
      dropFiles = dropFiles.filter((f) => !okNames.has(f.name));
      saveError = `업로드 실패: ${failed.map((x) => x.name).join(', ')}.`;
    } else {
      dropFiles = [];
      addTitle = '';
      addCategory = '';
      addSortOrder = 0;
      closePanel();
    }
    await loadGallery();
  }

  // ── 유틸 ──────────────────────────────────────────────
  function formatSize(bytes) {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dt) {
    if (!dt) return '-';
    return new Date(dt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // 초기 로드
  $effect(() => {
    loadGallery();
    loadMedia();
  });
</script>

<svelte:head>
  <title>갤러리 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>갤러리 관리</h1>
    </div>
    <Button onclick={openAdd}>+ 이미지 추가</Button>
  </header>

  <section class="gallery-section">
    <div class="section-head">
      <h2>등록된 이미지 <span class="count">({gallery.length})</span></h2>
    </div>

    {#if galleryLoading}
      <div class="state-msg">로딩 중...</div>
    {:else if gallery.length === 0}
      <div class="state-msg">등록된 이미지가 없습니다. 이미지 추가를 눌러 등록해 주세요.</div>
    {:else}
      <div class="gallery-grid">
        {#each gallery as item}
          <div class="gallery-card">
            <div class="card-img-wrap">
              <ResponsiveImage src={item.image_url} thumb={item.image_thumb_url} alt={item.title || ''} sizes="200px" />
              <Button variant="secondary" class="sm danger card-delete" onclick={() => deleteGalleryItem(item.id)} aria-label="제거">제거</Button>
            </div>
            <div class="card-meta">
              <span class="card-title" title={item.title}>{item.title || '(제목 없음)'}</span>
              <span class="card-tags">
                {#if item.category}<span class="tag">{item.category}</span>{/if}
                <span class="date">{formatDate(item.created_at)}</span>
              </span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <SlidePanel
    open={panelOpen}
    title="이미지 추가"
    sections={[{ id: 'source', label: '이미지' }, { id: 'meta', label: '제목과 분류' }]}
    snapshot={() => [addTab, addTitle, addCategory, addSortOrder, pickedMedia?.id, dropFiles.map((f) => f.name)]}
    saving={adding || uploading}
    error={saveError}
    canSave={addTab === 'media' ? !!pickedMedia : dropFiles.length > 0}
    saveLabel={addTab === 'media' ? '갤러리에 추가' : `업로드 후 추가 (${dropFiles.length})`}
    onsave={submit}
    onclose={closePanel}
  >
    <div class="form-section" data-section="source">
      <h3>이미지</h3>
      <div class="mode-tabs">
        <Button variant={addTab === 'media' ? 'primary' : 'secondary'} class="sm" aria-pressed={addTab === 'media'} onclick={() => (addTab = 'media')}>미디어에서 선택</Button>
        <Button variant={addTab === 'upload' ? 'primary' : 'secondary'} class="sm" aria-pressed={addTab === 'upload'} onclick={() => (addTab = 'upload')}>직접 업로드</Button>
      </div>

      {#if addTab === 'media'}
        <div class="media-picker">
          <div class="picker-controls">
            <select bind:value={mediaFilter} onchange={() => { mediaPage = 0; loadMedia(); }}>
              <option value="">전체 카테고리</option>
              {#each mediaCategories as cat}
                <option value={cat.value}>{cat.label}</option>
              {/each}
            </select>
            <input
              type="text"
              placeholder="검색..."
              bind:value={mediaSearch}
              onkeydown={(e) => { if (e.key === 'Enter') { mediaPage = 0; loadMedia(); } }}
            />
            <Button variant="secondary" class="sm" onclick={() => { mediaPage = 0; loadMedia(); }}>검색</Button>
          </div>

          {#if pickedMedia}
            <div class="picked-preview">
              <ResponsiveImage src={pickedMedia.url} thumb={pickedMedia.thumb_url} alt="" sizes="64px" />
              <div class="picked-info">
                <span class="picked-name">{pickedMedia.original_filename}</span>
                <span class="picked-cat">{pickedMedia.category} · {formatSize(pickedMedia.file_size)}</span>
              </div>
              <Button variant="secondary" class="sm" onclick={() => (pickedMedia = null)} aria-label="선택 취소">✕</Button>
            </div>
          {/if}

          {#if mediaLoading}
            <div class="state-msg">로딩 중...</div>
          {:else if mediaList.length === 0}
            <div class="state-msg">이미지가 없습니다.</div>
          {:else}
            <div class="picker-grid">
              {#each mediaList as media}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                  class="picker-card"
                  class:picked={pickedMedia?.id === media.id}
                  onclick={() => (pickedMedia = pickedMedia?.id === media.id ? null : media)}
                  role="button"
                  tabindex="0"
                  aria-pressed={pickedMedia?.id === media.id}
                >
                  <ResponsiveImage src={media.url} thumb={media.thumb_url} alt={media.alt_text || media.original_filename} sizes="120px" />
                  {#if pickedMedia?.id === media.id}
                    <div class="picker-check">✓</div>
                  {/if}
                </div>
              {/each}
            </div>

            <div class="pagination">
              <Button variant="secondary" class="sm" disabled={mediaPage === 0} onclick={() => { mediaPage--; loadMedia(); }}>←</Button>
              <span>{mediaPage + 1} / {Math.max(1, Math.ceil(mediaTotal / MEDIA_PAGE_SIZE))}</span>
              <Button
                variant="secondary"
                class="sm"
                disabled={(mediaPage + 1) * MEDIA_PAGE_SIZE >= mediaTotal}
                onclick={() => { mediaPage++; loadMedia(); }}
              >→</Button>
            </div>
          {/if}
        </div>
      {:else}
        <div class="upload-tab">
          <label class="upload-cat-label">
            미디어 카테고리
            <select bind:value={uploadCategory}>
              {#each mediaCategories as cat}
                <option value={cat.value}>{cat.label}</option>
              {/each}
            </select>
          </label>

          <div
            class="drop-zone"
            class:drag-over={dragOver}
            ondrop={handleDrop}
            ondragover={(e) => { e.preventDefault(); dragOver = true; }}
            ondragleave={() => (dragOver = false)}
            role="button"
            tabindex="0"
          >
            <p class="drop-text">파일을 드래그하거나 클릭하여 선택</p>
            <p class="drop-hint">여러 파일 동시 선택 가능</p>
            <input type="file" accept="image/*" multiple onchange={handleFileInput} class="file-input" aria-label="업로드할 이미지 파일" />
          </div>

          {#if dropFiles.length > 0}
            <ul class="drop-file-list">
              {#each dropFiles as file, i (file)}
                <li>
                  <span class="file-thumb-wrap">
                    <ResponsiveImage src={URL.createObjectURL(file)} alt="" class="file-thumb" sizes="40px" />
                  </span>
                  <span class="file-name">{file.name}</span>
                  <span class="file-size">({formatSize(file.size)})</span>
                  <Button variant="secondary" class="sm" onclick={() => removeDropFile(i)} aria-label="{file.name} 빼기">빼기</Button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </div>

    <div class="form-section" data-section="meta">
      <h3>제목과 분류</h3>
      <label>
        제목 (선택)
        <input type="text" bind:value={addTitle} placeholder="이미지 제목" />
      </label>
      <div class="row-2">
        <label>
          카테고리
          <input type="text" bind:value={addCategory} placeholder="예: concert" />
        </label>
        <label>
          순서
          <input type="number" bind:value={addSortOrder} min="0" />
        </label>
      </div>
    </div>
  </SlidePanel>
</div>

<style lang="scss">
  .section-head h2 { margin: 0 0 var(--space-3); font-size: 18px; }
  .count { font-weight: 400; }
  .state-msg { padding: var(--space-4); text-align: center; color: var(--color-green-700); border: 1px dashed var(--color-border); border-radius: var(--radius); }

  .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-3); }
  .gallery-card { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
  .card-img-wrap {
    position: relative; aspect-ratio: 1; background: var(--color-green-100);
    :global(img) { width: 100%; height: 100%; object-fit: cover; display: block; }
    :global(.card-delete) { position: absolute; top: var(--space-2); right: var(--space-2); background: var(--color-surface); }
  }
  .card-meta { display: flex; flex-direction: column; gap: 2px; padding: var(--space-2) var(--space-3); }
  .card-title { font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-tags { display: flex; gap: var(--space-2); align-items: center; font-size: 12px; color: var(--color-green-700); }
  .tag { padding: 0 var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius); }

  .mode-tabs { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); }
  .media-picker, .upload-tab { display: flex; flex-direction: column; gap: var(--space-3); }
  .picker-controls { display: flex; gap: var(--space-2); align-items: center; select { width: auto; } input { flex: 1; } }
  .picked-preview {
    display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius);
    :global(img) { width: 64px; height: 64px; object-fit: cover; border-radius: var(--radius); }
    .picked-info { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: 13px; }
    .picked-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .picked-cat { color: var(--color-green-700); }
  }
  .picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: var(--space-2); }
  .picker-card {
    position: relative; cursor: pointer; aspect-ratio: 1; border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden;
    :global(img) { width: 100%; height: 100%; object-fit: cover; display: block; }
    &.picked { border: 3px double var(--color-green-700); }
  }
  .picker-check { position: absolute; top: var(--space-1); right: var(--space-1); width: 22px; height: 22px; display: grid; place-items: center; background: var(--color-green-500); color: var(--color-on-primary); border-radius: var(--radius); font-size: 14px; }
  .pagination { display: flex; align-items: center; justify-content: center; gap: var(--space-3); font-size: 14px; }

  .upload-cat-label { display: flex; flex-direction: column; gap: var(--space-1); font-size: 14px; }
  .drop-file-list {
    list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2);
    li { display: flex; align-items: center; gap: var(--space-2); font-size: 14px; }
    :global(.file-thumb) { width: 40px; height: 40px; object-fit: cover; border-radius: var(--radius); }
  }
  .file-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-size { color: var(--color-green-700); font-size: 12px; }
</style>
