<script>
  import Button from '$lib/components/ui/Button.svelte';
  import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte';
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
    is_pinned: false,
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
    form = { title: '', content: '', image_media_id: null, image_width: DEFAULT_IMAGE_WIDTH, button_text: '', button_url: '', is_active: true, is_pinned: false };
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
      is_pinned: item.is_pinned ?? false,
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
    formData.append('is_pinned', String(form.is_pinned));

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
    <Button onclick={openCreate}>+ 공지사항 추가</Button>
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
                  <ResponsiveImage src={item.image_thumb_url || item.image_url} alt={item.title} class="thumb" sizes="48px" />
                {:else}
                  <div class="thumb-placeholder"></div>
                {/if}
              </td>
              <td class="name-cell">{#if item.is_pinned}<svg class="pin-mark" viewBox="0 0 24 24" width="13" height="13" aria-label="상단 고정"><title>상단 고정</title><path fill="currentColor" d="M14.15 2.85a1 1 0 0 1 1.41 0l5.59 5.59a1 1 0 0 1 0 1.41l-2.83 2.83a1 1 0 0 1-1.41 0l-.4-.4-3.06 3.06.7 3.51a1 1 0 0 1-.27.91l-1 1a1 1 0 0 1-1.41 0l-3.7-3.7-4.6 4.6a1 1 0 0 1-1.41-1.41l4.6-4.6-3.7-3.7a1 1 0 0 1 0-1.41l1-1a1 1 0 0 1 .91-.27l3.51.7 3.06-3.06-.4-.4a1 1 0 0 1 0-1.41z"/></svg>{/if}{item.title}</td>
              <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
              <td>
                <span class="badge" class:active={item.is_active}>
                  {item.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td>
                <div class="actions">
                  <Button variant="secondary" class="sm" onclick={() => openEdit(item)}>편집</Button>
                  <Button variant="secondary" class="sm danger" onclick={() => deleteItem(item)}>삭제</Button>
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
  <SlidePanel
    open={showForm}
    title={editing ? '공지사항 편집' : '새 공지사항'}
    sections={[{ id: 'info', label: '기본 정보' }, { id: 'image', label: '대표 이미지' }, { id: 'content', label: '본문' }]}
    snapshot={() => [form, selectedImageUrl]}
    {saving}
    error={saveError}
    canSave={!(!form.title)}
    saveLabel={editing ? '수정' : '등록'}
    suspended={showMediaPicker}
    onsave={saveItem}
    onclose={resetForm}
  >
<div class="form-section" data-section="info">
          <h3>기본 정보</h3>
          <label>
            제목 *
            <input type="text" bind:value={form.title} placeholder="공지사항 제목" required />
          </label>
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={form.is_active} />
            활성 상태
          </label>
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={form.is_pinned} />
            상단 고정
          </label>
        </div>

        <!-- 이미지 (페이지 상단에 표시, 1장) -->
        <div class="form-section" data-section="image">
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
              <ResponsiveImage src={selectedImageUrl} alt="notice preview" class="preview-img" sizes="160px" />
              {#if pendingImageFile}
                <p class="drop-hint pending-hint">저장 시 업로드됩니다</p>
              {/if}
            {:else}
              <p class="drop-text">이미지를 드래그하거나 클릭하여 선택</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
            <Button variant="secondary" type="button" onclick={openMediaPicker}>미디어에서 선택</Button>
            {#if selectedImageUrl}
              <Button variant="secondary" type="button" onclick={() => { selectedImageUrl = ''; form.image_media_id = null; pendingImageFile = null; }}>제거</Button>
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
        <div class="form-section" data-section="content">
          <div class="content-header">
            <h3>본문 (마크다운 문법 지원)</h3>
            <Button variant="secondary" type="button" onclick={() => (showPreview = !showPreview)}>
              {showPreview ? '편집으로' : '미리보기'}
            </Button>
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
  </SlidePanel>
  

  <!-- ── 미디어 피커 모달 ──────────── -->
  {#if showMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showMediaPicker = false)}>✕</button>
        <h2>이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button type="button" class="media-item" class:already-selected={form.image_media_id === media.id} onclick={() => selectMedia(media)}>
              <ResponsiveImage src={media.url} alt={media.original_filename} sizes="120px" />
              <span class="media-name">{media.original_filename}</span>
            </button>
          {/each}
          {#if mediaList.length === 0}
            <p class="empty">업로드된 이미지가 없습니다.</p>
          {/if}
        </div>
        <Button variant="secondary" onclick={() => (showMediaPicker = false)}>닫기</Button>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
.pin-mark { margin-right: 0.4rem; color: var(--color-green-700); vertical-align: middle; }

.content-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;
    h3 { margin: 0; }
  }



.markdown-preview {
    min-height: 260px; padding: 1rem; border: 1px solid var(--color-border); border-radius: 6px;
    background: var(--color-green-50); color: var(--color-on-surface); font-size: 0.9rem; line-height: 1.7;
    overflow-wrap: break-word;

    :global(p) { margin: 0 0 0.75em; }
    :global(img) { max-width: 100%; }
    :global(a) { color: var(--color-green-500); }
    :global(ul), :global(ol) { padding-left: 1.5em; margin: 0 0 0.75em; }
    :global(table) {
      width: 100%; margin: 0 0 1em; border-collapse: collapse; text-align: center;
    }
    :global(th), :global(td) {
      border: 1px solid var(--color-green-200); padding: 0.25rem 0.5rem; text-align: center;
    }
    :global(th) { font-weight: 700; }
  }

.width-control {
    margin-top: 0.75rem;
    label { display: block; margin-bottom: 0.4rem; font-size: 0.85rem; color: var(--color-on-surface); }
  }

.width-control-row {
    display: flex; align-items: center; gap: 0.75rem;
    input[type="range"] { flex: 1; }
    .width-number {
      width: 90px; padding: 0.4rem 0.5rem; border: 1px solid var(--color-border);
      border-radius: 6px; color: var(--color-on-surface); font-size: 0.85rem;
    }
  }
</style>
