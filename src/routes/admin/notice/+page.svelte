<script>
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
  import { renderMarkdown } from '$lib/utils/markdown.js';
  import { uploadMediaFile, fetchWithRetry } from '$lib/utils/uploadMedia.js';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  // ── 상태 ──────────────────────────────────
  let items = $state([]);
  let loading = $state(false);
  let editing = $state(null);
  let showForm = $state(false);
  let showPreview = $state(false);

  // ── 폼 데이터 ──────────────────────────────
  const DEFAULT_IMAGE_WIDTH = 1280;

  let form = $state({
    title: '',
    content: '',
    image_media_id: null,
    image_width: DEFAULT_IMAGE_WIDTH,
    button_text: '',
    button_url: '',
    is_active: true,
  });

  // ── 이미지 상태 ──────────────────────────
  let mediaList = $state([]);
  let showMediaPicker = $state(false);
  let selectedImageUrl = $state('');

  let imageDragOver = $state(false);
  let pendingImageFile = $state(null);
  let saving = $state(false);
  let saveError = $state('');

  // ── 초기 로드 ──────────────────────────────
  $effect(() => { loadItems(); });

  async function loadItems() {
    loading = true;
    try {
      const res = await fetch(`${API}/api/notices?active_only=false`);
      items = await res.json();
    } catch (e) {
      console.error('Failed to load notices:', e);
    }
    loading = false;
  }

  async function loadMedia() {
    try {
      const res = await fetch(`${API}/api/media?category=notice&limit=100`);
      const data = await res.json();
      mediaList = data.items || [];
    } catch (e) {
      console.error('Failed to load media:', e);
    }
  }

  // ── 폼 초기화 ──────────────────────────────
  function resetForm() {
    form = { title: '', content: '', image_media_id: null, image_width: DEFAULT_IMAGE_WIDTH, button_text: '', button_url: '', is_active: true };
    selectedImageUrl = '';
    pendingImageFile = null;
    editing = null;
    showForm = false;
    showPreview = false;
    saving = false;
    saveError = '';
  }

  function openCreate() {
    resetForm();
    showForm = true;
  }

  function openEdit(item) {
    editing = item;
    form = {
      title: item.title || '',
      content: item.content || '',
      image_media_id: null,
      image_width: item.image_width || DEFAULT_IMAGE_WIDTH,
      button_text: item.button_text || '',
      button_url: item.button_url || '',
      is_active: item.is_active ?? true,
    };
    selectedImageUrl = item.image_url || '';
    showForm = true;
  }

  // ── 이미지 ────────────────────────────────
  function handleImageDrop(e) {
    e.preventDefault(); imageDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) setImageLocally(file);
  }
  function handleImageFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) setImageLocally(file);
    e.target.value = '';
  }
  function setImageLocally(file) {
    if (pendingImageFile?._previewUrl) URL.revokeObjectURL(pendingImageFile._previewUrl);
    const previewUrl = URL.createObjectURL(file);
    file._previewUrl = previewUrl;
    pendingImageFile = file;
    form.image_media_id = null;
    selectedImageUrl = previewUrl;
  }
  async function flushPendingImage() {
    if (!pendingImageFile) return;
    const media = await uploadMediaFile(API, pendingImageFile, 'notice');
    form.image_media_id = media.id;
    selectedImageUrl = media.url;
    URL.revokeObjectURL(pendingImageFile._previewUrl);
    pendingImageFile = null;
  }
  async function openMediaPicker() {
    await loadMedia(); showMediaPicker = true;
  }
  function selectMedia(media) {
    form.image_media_id = media.id;
    selectedImageUrl = media.thumb_url || media.url;
    showMediaPicker = false;
  }

  // ── 저장 ───────────────────────────────────
  async function saveItem() {
    if (saving) return;
    saving = true;
    saveError = '';

    try {
      await flushPendingImage();
    } catch (e) {
      saving = false;
      saveError = '이미지 업로드 실패: ' + (e?.message || e);
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('content', form.content || '');
    if (form.image_media_id) formData.append('image_media_id', String(form.image_media_id));
    formData.append('image_width', String(form.image_width || DEFAULT_IMAGE_WIDTH));
    formData.append('button_text', form.button_text || '');
    formData.append('button_url', form.button_url || '');
    if (editing && !form.button_text && !form.button_url) formData.append('clear_button', 'true');
    formData.append('is_active', String(form.is_active));

    try {
      const url = editing ? `${API}/api/notices/${editing.id}` : `${API}/api/notices`;
      const method = editing ? 'PUT' : 'POST';
      await fetchWithRetry(url, { method, body: formData });
      resetForm();
      await loadItems();
    } catch (e) {
      saving = false;
      saveError = '저장 실패: ' + (e?.message || e);
    }
  }

  async function deleteItem(item) {
    if (!confirm(`"${item.title}" 공지사항을 삭제하시겠습니까?`)) return;
    try {
      await fetch(`${API}/api/notices/${item.id}`, { method: 'DELETE' });
      await loadItems();
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  }
</script>

<svelte:head>
  <title>공지사항 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>공지사항 관리</h1>
    </div>
    <button class="btn-primary" onclick={openCreate}>+ 공지사항 추가</button>
  </header>

  {#if loading}
    <p class="loading">로딩 중...</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>이미지</th>
            <th>제목</th>
            <th>작성일</th>
            <th>상태</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {#each items as item}
            <tr>
              <td>
                {#if item.image_thumb_url || item.image_url}
                  <img src={item.image_thumb_url || item.image_url} alt={item.title} class="thumb" />
                {:else}
                  <div class="thumb-placeholder"></div>
                {/if}
              </td>
              <td class="name-cell">{item.title}</td>
              <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
              <td>
                <span class="badge" class:active={item.is_active}>
                  {item.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="btn-sm btn-edit" onclick={() => openEdit(item)}>편집</button>
                  <button class="btn-sm btn-delete" onclick={() => deleteItem(item)}>삭제</button>
                </div>
              </td>
            </tr>
          {/each}
          {#if items.length === 0}
            <tr><td colspan="5" class="empty">등록된 공지사항이 없습니다.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ── 편집 / 생성 폼 ──────────────────── -->
  {#if showForm}
    <div class="modal-overlay">
      <div class="modal" role="none" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header-row">
          <h2>{editing ? '공지사항 편집' : '새 공지사항'}</h2>
          <div class="modal-header-actions">
            <button class="btn-primary btn-save-top" onclick={saveItem} disabled={!form.title || saving}>
              {saving ? '저장 중...' : (editing ? '수정' : '등록')}
            </button>
            <button class="modal-close" onclick={resetForm}>✕</button>
          </div>
        </div>

        {#if saveError}
          <p class="save-error">{saveError}</p>
        {/if}

        <!-- 기본 정보 -->
        <div class="form-section">
          <h3>기본 정보</h3>
          <label>
            제목 *
            <input type="text" bind:value={form.title} placeholder="공지사항 제목" required />
          </label>
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={form.is_active} />
            활성 상태
          </label>
        </div>

        <!-- 이미지 (페이지 상단에 표시, 1장) -->
        <div class="form-section">
          <h3>대표 이미지 (페이지 상단에 표시, 1장)</h3>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="drop-zone"
            class:drag-over={imageDragOver}
            class:has-image={!!selectedImageUrl}
            ondragover={(e) => { e.preventDefault(); imageDragOver = true; }}
            ondragleave={() => (imageDragOver = false)}
            ondrop={handleImageDrop}
          >
            <input type="file" accept="image/*" class="file-input" onchange={handleImageFileSelect} />
            {#if selectedImageUrl}
              <img src={selectedImageUrl} alt="notice preview" class="preview-img" />
              {#if pendingImageFile}
                <p class="drop-hint pending-hint">저장 시 업로드됩니다</p>
              {/if}
            {:else}
              <p class="drop-text">이미지를 드래그하거나 클릭하여 선택</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
            <button type="button" class="btn-secondary" onclick={openMediaPicker}>미디어에서 선택</button>
            {#if selectedImageUrl}
              <button type="button" class="btn-secondary" onclick={() => { selectedImageUrl = ''; form.image_media_id = null; pendingImageFile = null; }}>제거</button>
            {/if}
          </div>

          {#if selectedImageUrl}
            <div class="width-control">
              <label for="image-width-slider">이미지 최대 너비: {form.image_width}px</label>
              <div class="width-control-row">
                <input
                  id="image-width-slider"
                  type="range"
                  min="200"
                  max="1280"
                  step="10"
                  bind:value={form.image_width}
                />
                <input
                  type="number"
                  min="200"
                  max="1280"
                  step="10"
                  bind:value={form.image_width}
                  class="width-number"
                />
              </div>
            </div>
          {/if}
        </div>

        <!-- 본문 (마크다운) -->
        <div class="form-section">
          <div class="content-header">
            <h3>본문 (마크다운 문법 지원)</h3>
            <button type="button" class="btn-secondary btn-toggle-preview" onclick={() => (showPreview = !showPreview)}>
              {showPreview ? '편집으로' : '미리보기'}
            </button>
          </div>
          {#if showPreview}
            <div class="markdown-preview markdown-body">
              {@html renderMarkdown(form.content || '_내용 없음_')}
            </div>
          {:else}
            <textarea bind:value={form.content} placeholder="마크다운 문법으로 작성하세요 (# 제목, **굵게**, - 목록 등)"></textarea>
          {/if}
        </div>

        <!-- 하단 버튼 -->
        <div class="form-section">
          <h3>하단 버튼 (선택, 텍스트 비우면 표시 안 함)</h3>
          <label>
            버튼 텍스트
            <input type="text" bind:value={form.button_text} placeholder="예: 신청하러 가기" />
          </label>
          <label>
            리다이렉트 URL
            <input type="text" bind:value={form.button_url} placeholder="https://..." />
          </label>
        </div>

        <div class="form-actions">
          <button class="btn-primary" onclick={saveItem} disabled={!form.title || saving}>
            {saving ? '저장 중...' : (editing ? '수정' : '등록')}
          </button>
          <button class="btn-secondary" onclick={resetForm}>취소</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── 미디어 피커 모달 ──────────── -->
  {#if showMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showMediaPicker = false)}>✕</button>
        <h2>이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button type="button" class="media-item" class:already-selected={form.image_media_id === media.id} onclick={() => selectMedia(media)}>
              <img src={media.url} alt={media.original_filename} />
              <span class="media-name">{media.original_filename}</span>
            </button>
          {/each}
          {#if mediaList.length === 0}
            <p class="empty">업로드된 이미지가 없습니다.</p>
          {/if}
        </div>
        <button class="btn-secondary" onclick={() => (showMediaPicker = false)}>닫기</button>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .page {
    min-height: 100vh;
    background: #ffffff;
    color: #222;
    padding: 2rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;

    .header-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .back-link { color: #888; text-decoration: none; &:hover { color: #222; } }
    h1 { margin: 0; font-size: 1.5rem; color: #111; }
  }

  .loading { text-align: center; color: #999; padding: 3rem; }

  .table-wrap { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    th, td { padding: 0.75rem 1rem; text-align: left; vertical-align: middle; border-bottom: 1px solid #eee; }
    th { color: #888; font-weight: 500; font-size: 0.85rem; }
    tbody tr:hover { background: #f8f9fa; }
  }

  .thumb { width: 80px; height: 60px; border-radius: 6px; object-fit: cover; }
  .thumb-placeholder { width: 80px; height: 60px; border-radius: 6px; background: #eee; }
  .name-cell { font-weight: 600; color: #111; }

  .badge {
    padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem;
    background: #eee; color: #666;
    &.active { background: #dcfce7; color: #166534; }
  }

  .actions { display: flex; gap: 0.5rem; align-items: center; }
  .empty { text-align: center; color: #999; padding: 2rem; }

  .btn-primary {
    padding: 0.6rem 1.2rem; background: #2563eb; color: #fff;
    border: none; border-radius: 6px; cursor: pointer;
    &:hover { background: #1d4ed8; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
  .btn-secondary {
    padding: 0.6rem 1.2rem; background: #f3f4f6; color: #444;
    border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer;
    &:hover { background: #e5e7eb; }
  }
  .btn-sm { padding: 0.3rem 0.7rem; font-size: 0.85rem; border-radius: 4px; border: none; cursor: pointer; }
  .btn-edit { background: #2563eb; color: #fff; &:hover { background: #1d4ed8; } }
  .btn-delete { background: #dc3545; color: #fff; &:hover { background: #c82333; } }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 2rem; overflow-y: auto; z-index: 1000;
  }
  .modal {
    background: #fff; border: 1px solid #e0e0e0; border-radius: 12px;
    padding: 2rem; width: 100%; max-width: 700px; max-height: 90vh;
    overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.15); position: relative;
    h2 { margin: 0; font-size: 1.3rem; color: #111; }
  }
  .modal-header-row {
    position: sticky;
    top: -2rem;
    z-index: 2;
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem;
    margin: -2rem -2rem 1.5rem;
    padding: 1.25rem 2rem 1rem;
    background: #fff;
    border-bottom: 1px solid #eee;
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
    input[type="text"], textarea {
      display: block; width: 100%; margin-top: 0.25rem;
      padding: 0.5rem 0.75rem; background: #fff; border: 1px solid #d1d5db;
      border-radius: 6px; color: #222; font-size: 0.9rem;
      &:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    }
    textarea { resize: vertical; font-family: 'SFMono-Regular', Consolas, monospace; min-height: 260px; }
  }

  .content-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;
    h3 { margin: 0; }
  }
  .btn-toggle-preview { padding: 0.35rem 0.8rem; font-size: 0.8rem; }

  .markdown-preview {
    min-height: 260px; padding: 1rem; border: 1px solid #d1d5db; border-radius: 6px;
    background: #fafafa; color: #222; font-size: 0.9rem; line-height: 1.7;
    overflow-wrap: break-word;

    :global(p) { margin: 0 0 0.75em; }
    :global(img) { max-width: 100%; }
    :global(a) { color: #2563eb; }
    :global(ul), :global(ol) { padding-left: 1.5em; margin: 0 0 0.75em; }
    :global(table) {
      width: 100%; margin: 0 0 1em; border-collapse: collapse; text-align: center;
    }
    :global(th), :global(td) {
      border: 1px solid #ddd; padding: 0.25rem 0.5rem; text-align: center;
    }
    :global(th) { font-weight: 700; }
  }

  .checkbox-label {
    display: flex !important; align-items: center; gap: 0.5rem; cursor: pointer;
    input { width: auto; margin: 0; cursor: pointer; }
  }

  .drop-zone {
    border: 2px dashed #d1d5db; border-radius: 8px; padding: 2rem;
    text-align: center; cursor: pointer; position: relative;
    transition: border-color 0.2s, background 0.2s;
    &:hover, &.drag-over { border-color: #2563eb; background: #f0f4ff; }
    &.has-image { padding: 1rem; }
    .drop-text { margin: 0; color: #888; }
    .drop-hint { margin: 0.5rem 0 0; font-size: 0.8rem; color: #aaa; }
    .pending-hint { color: #f59e0b; font-weight: 500; }
    .file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .preview-img {
      max-width: 100%; max-height: 240px; border-radius: 8px;
      object-fit: contain; display: block; margin: 0 auto;
    }
  }

  .width-control {
    margin-top: 0.75rem;
    label { display: block; margin-bottom: 0.4rem; font-size: 0.85rem; color: #444; }
  }
  .width-control-row {
    display: flex; align-items: center; gap: 0.75rem;
    input[type="range"] { flex: 1; }
    .width-number {
      width: 90px; padding: 0.4rem 0.5rem; border: 1px solid #d1d5db;
      border-radius: 6px; color: #222; font-size: 0.85rem;
    }
  }

  .form-actions {
    display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;
  }

  .media-picker { max-width: 800px; }
  .media-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem; margin-bottom: 1rem; max-height: 400px; overflow-y: auto;
  }
  .media-item {
    background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px;
    cursor: pointer; padding: 0; overflow: hidden; transition: border-color 0.2s;
    &:hover { border-color: #2563eb; }
    &.already-selected { border-color: #2563eb; opacity: 0.6; cursor: default; }
    img { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; }
    .media-name {
      display: block; padding: 0.3rem; font-size: 0.7rem; color: #888;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
  }

  .empty { color: #999; text-align: center; padding: 1rem; }
</style>
