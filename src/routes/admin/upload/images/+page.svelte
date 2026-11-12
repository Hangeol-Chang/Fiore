<script>
  import Button from '$lib/components/ui/Button.svelte';
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte';
  import StatusMessage from '$lib/components/ui/StatusMessage.svelte';
  import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

  /** @type {{ data: import('../$types').PageData }} */
  let { data } = $props();

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  // ── 상태 ──────────────────────────────────
  let files = $state([]);
  let category = $state('general');
  let tags = $state('');
  let altText = $state('');
  let uploading = $state(false);
  let uploadResults = $state([]);
  let uploadOpen = $state(false);
  let uploadError = $state('');
  // 상세 패널이 닫히는 동안에도 내용이 남도록 마지막 선택을 따로 기억한다
  let shown = $state(null);
  $effect(() => { if (selectedMedia) shown = selectedMedia; });

  function openUpload() {
    files = [];
    uploadResults = [];
    uploadError = '';
    uploadOpen = true;
  }

  function closeUpload() {
    uploadOpen = false;
    files = [];
    uploadResults = [];
    uploadError = '';
  }

  // ── 미디어 라이브러리 ─────────────────────
  let mediaList = $state([]);
  let mediaTotal = $state(0);
  let mediaLoading = $state(false);
  let filterCategory = $state('');
  let searchQuery = $state('');
  let currentPage = $state(0);
  const PAGE_SIZE = 20;

  // ── 선택 / 상세 ───────────────────────────
  let selectedMedia = $state(null);
  let selectedIds = $state(new Set());

  const categories = [
    { value: 'general', label: '일반' },
    { value: 'artist', label: '아티스트' },
    { value: 'concert', label: '콘서트' },
    { value: 'gallery', label: '갤러리' },
  ];

  // ── 미디어 목록 로드 ──────────────────────
  async function loadMedia() {
    mediaLoading = true;
    try {
      const params = new URLSearchParams({
        skip: String(currentPage * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      if (filterCategory) params.set('category', filterCategory);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API}/api/media?${params}`);
      const data = await res.json();
      mediaList = data.items || [];
      mediaTotal = data.total || 0;
    } catch (e) {
      console.error('Failed to load media:', e);
    }
    mediaLoading = false;
  }

  // ── 업로드 ────────────────────────────────
  function handleFileSelect(e) {
    files = Array.from(e.target.files || []);
    uploadResults = [];
  }

  function handleDrop(e) {
    e.preventDefault();
    files = Array.from(e.dataTransfer?.files || []);
    uploadResults = [];
  }

  async function uploadFiles() {
    if (!files.length) return;
    uploading = true;
    uploadResults = [];
    uploadError = '';

    // 중복 체크를 위해 전체 미디어 목록 조회
    let allMedia = [];
    try {
      const res = await fetch(`${API}/api/media?limit=10000`);
      const data = await res.json();
      allMedia = data.items || [];
    } catch (e) {
      console.error('Failed to load media for duplicate check:', e);
    }

    for (const file of files) {
      try {
        // 중복 파일명 체크
        const duplicate = allMedia.find(m => m.original_filename === file.name);
        if (duplicate) {
          const proceed = confirm(
            `동일한 파일명이 이미 존재합니다.\n\n` +
            `파일명: ${file.name}\n` +
            `기존 업로드: ${new Date(duplicate.created_at).toLocaleString()}\n` +
            `카테고리: ${duplicate.category}\n\n` +
            `그래도 업로드하시겠습니까?`
          );
          if (!proceed) {
            uploadResults = [...uploadResults, { 
              success: false, 
              name: file.name, 
              error: '사용자가 취소함 (중복 파일)' 
            }];
            continue;
          }
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        if (tags) formData.append('tags', tags);
        if (altText) formData.append('alt_text', altText);

        const res = await fetch(`${API}/api/media`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const result = await res.json();
          uploadResults = [...uploadResults, { success: true, name: file.name, data: result }];
        } else {
          uploadResults = [...uploadResults, { success: false, name: file.name, error: res.statusText }];
        }
      } catch (e) {
        uploadResults = [...uploadResults, { success: false, name: file.name, error: e.message }];
      }
    }

    uploading = false;
    const failed = uploadResults.filter((x) => !x.success);
    if (failed.length) {
      // 성공한 파일은 빼서 다시 저장해도 중복 업로드되지 않게 한다
      const ok = new Set(uploadResults.filter((x) => x.success).map((x) => x.name));
      files = files.filter((f) => !ok.has(f.name));
      uploadError = `${failed.length}개 파일을 올리지 못했습니다.`;
    } else {
      closeUpload();
    }
    // 업로드 후 목록 새로고침
    await loadMedia();
  }

  // ── 삭제 ──────────────────────────────────
  async function deleteMedia(id) {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`${API}/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        selectedMedia = null;
        await loadMedia();
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }

  async function deleteBatch() {
    if (!selectedIds.size) return;
    if (!confirm(`${selectedIds.size}개의 이미지를 삭제하시겠습니까?`)) return;
    try {
      const params = Array.from(selectedIds).map(id => `ids=${id}`).join('&');
      const res = await fetch(`${API}/api/media/batch/delete?${params}`, { method: 'DELETE' });
      if (res.ok) {
        selectedIds = new Set();
        await loadMedia();
      }
    } catch (e) {
      console.error('Batch delete failed:', e);
    }
  }

  // ── 유틸 ──────────────────────────────────
  function formatSize(bytes) {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function toggleSelect(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  // 초기 로드
  $effect(() => {
    loadMedia();
  });
</script>

<svelte:head>
  <title>이미지 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>이미지 관리</h1>
    </div>
    <Button onclick={openUpload}>+ 이미지 업로드</Button>
  </header>

  <!-- ── 미디어 라이브러리 ────────────────── -->
  <section class="library-section">
    <div class="library-header">
      <h2>미디어 라이브러리 ({mediaTotal})</h2>

      <div class="library-controls">
        <select bind:value={filterCategory} onchange={() => { currentPage = 0; loadMedia(); }}>
          <option value="">전체 카테고리</option>
          {#each categories as cat}
            <option value={cat.value}>{cat.label}</option>
          {/each}
        </select>

        <input
          type="text"
          placeholder="검색..."
          bind:value={searchQuery}
          onkeydown={(e) => { if (e.key === 'Enter') { currentPage = 0; loadMedia(); } }}
        />

        <Button variant="secondary" class="sm" onclick={() => { currentPage = 0; loadMedia(); }}>검색</Button>

        {#if selectedIds.size > 0}
          <Button variant="secondary" class="sm danger" onclick={deleteBatch}>
            {selectedIds.size}개 삭제
          </Button>
        {/if}
      </div>
    </div>

    {#if mediaLoading}
      <div class="loading">로딩 중...</div>
    {:else if mediaList.length === 0}
      <div class="empty">업로드된 이미지가 없습니다</div>
    {:else}
      <div class="media-grid">
        {#each mediaList as media}
          <div class="media-card" class:selected={selectedIds.has(media.id)}>
            <label class="card-checkbox">
              <input type="checkbox" checked={selectedIds.has(media.id)} onchange={() => toggleSelect(media.id)} aria-label="{media.original_filename} 선택" />
            </label>
            <button type="button" class="card-open" onclick={() => (selectedMedia = media)}>
              <span class="card-image">
                <ResponsiveImage src={media.url} thumb={media.thumb_url} alt={media.alt_text || media.original_filename} sizes="200px" />
              </span>
              <span class="card-info">
                <span class="card-name" title={media.original_filename}>{media.original_filename}</span>
                <span class="card-category">{media.category}</span>
              </span>
            </button>
          </div>
        {/each}
      </div>

      <div class="pagination">
        <Button variant="secondary" class="sm" disabled={currentPage === 0} onclick={() => { currentPage--; loadMedia(); }}>← 이전</Button>
        <span>{currentPage + 1} / {Math.ceil(mediaTotal / PAGE_SIZE)}</span>
        <Button variant="secondary" class="sm" disabled={(currentPage + 1) * PAGE_SIZE >= mediaTotal} onclick={() => { currentPage++; loadMedia(); }}>다음 →</Button>
      </div>
    {/if}
  </section>

  <!-- ── 업로드 패널 ──────────────────────── -->
  <SlidePanel
    open={uploadOpen}
    title="이미지 업로드"
    sections={[{ id: 'files', label: '파일' }, { id: 'meta', label: '분류와 설명' }]}
    snapshot={() => [files.map((f) => f.name), category, tags, altText]}
    saving={uploading}
    error={uploadError}
    canSave={files.length > 0}
    saveLabel="업로드 ({files.length})"
    onsave={uploadFiles}
    onclose={closeUpload}
  >
    <div class="form-section" data-section="files">
      <h3>파일</h3>
      <div class="drop-zone" ondrop={handleDrop} ondragover={(e) => e.preventDefault()} role="button" tabindex="0">
        <p class="drop-text">파일을 드래그하거나 클릭하여 선택</p>
        <input type="file" accept="image/*" multiple onchange={handleFileSelect} class="file-input" aria-label="업로드할 이미지 파일" />
      </div>

      {#if files.length > 0}
        <div class="upload-preview">
          <p>{files.length}개 파일 선택됨</p>
          <ul class="file-list">
            {#each files as file}
              <li>
                <ResponsiveImage src={URL.createObjectURL(file)} alt="" class="file-thumb" sizes="40px" />
                {file.name} ({formatSize(file.size)})
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if uploadResults.length > 0}
        <div class="upload-results">
          {#each uploadResults as result}
            <StatusMessage kind={result.success ? 'success' : 'error'} message={result.name + (result.error ? ' — ' + result.error : ' 업로드 완료')} />
          {/each}
        </div>
      {/if}
    </div>

    <div class="form-section" data-section="meta">
      <h3>분류와 설명</h3>
      <label>
        카테고리
        <select bind:value={category}>
          {#each categories as cat}
            <option value={cat.value}>{cat.label}</option>
          {/each}
        </select>
      </label>

      <label>
        태그 (쉼표 구분)
        <input type="text" bind:value={tags} placeholder="프로필, 피아노, 2026" />
      </label>

      <label>
        대체 텍스트
        <input type="text" bind:value={altText} placeholder="이미지 설명" />
      </label>
    </div>
  </SlidePanel>

  <!-- ── 상세 패널 ────────────────────────── -->
  <SlidePanel
    open={!!selectedMedia}
    title="이미지 상세"
    sections={[{ id: 'preview', label: '미리보기' }, { id: 'detail', label: '상세 정보' }]}
    onclose={() => (selectedMedia = null)}
  >
    {#if shown}
      <div class="form-section" data-section="preview">
        <h3>미리보기</h3>
        <ResponsiveImage src={shown.url} thumb={shown.thumb_url} alt={shown.alt_text || shown.original_filename} sizes="50vw" class="detail-image" />
      </div>

      <div class="form-section" data-section="detail">
        <h3>상세 정보</h3>
        <table>
          <tbody>
            <tr><th>ID</th><td>{shown.id}</td></tr>
            <tr><th>원본 파일명</th><td>{shown.original_filename}</td></tr>
            <tr><th>저장 파일명</th><td>{shown.stored_filename}</td></tr>
            <tr><th>카테고리</th><td>{shown.category}</td></tr>
            <tr><th>크기</th><td>{formatSize(shown.file_size)}</td></tr>
            <tr><th>타입</th><td>{shown.content_type}</td></tr>
            <tr><th>태그</th><td>{shown.tags || '-'}</td></tr>
            <tr><th>대체 텍스트</th><td>{shown.alt_text || '-'}</td></tr>
            <tr><th>업로드일</th><td>{new Date(shown.created_at).toLocaleString('ko-KR')}</td></tr>
          </tbody>
        </table>

        <label class="modal-url">
          URL
          <input type="text" readonly value={shown.url} onclick={(e) => e.target.select()} />
        </label>

        <div class="detail-actions">
          <Button variant="secondary" onclick={() => navigator.clipboard.writeText(shown.url)}>URL 복사</Button>
          <Button variant="secondary" class="danger" onclick={() => deleteMedia(shown.id)}>삭제</Button>
        </div>
      </div>
    {/if}
  </SlidePanel>
</div>

<style lang="scss">
  .library-header { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-3); h2 { margin: 0; font-size: 18px; } }
  .library-controls { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; select, input[type='text'] { width: auto; } }

  .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-3); max-height: none; overflow: visible; }
  .media-card {
    position: relative; border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden;
    &.selected { border: 3px double var(--color-green-700); }
    &:hover { background: var(--color-green-50); }
  }
  .card-checkbox { position: absolute; top: var(--space-2); left: var(--space-2); z-index: 1; padding: var(--space-1); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); input { display: block; margin: 0; } }
  .card-open { display: block; width: 100%; padding: 0; background: none; border: none; font: inherit; color: inherit; text-align: left; cursor: pointer; }
  .card-image { display: block; aspect-ratio: 1; background: var(--color-green-100); :global(img) { width: 100%; height: 100%; object-fit: cover; display: block; } }
  .card-info { display: flex; flex-direction: column; padding: var(--space-2) var(--space-3); }
  .card-name { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-category { font-size: 12px; color: var(--color-green-700); }
  .pagination { display: flex; align-items: center; justify-content: center; gap: var(--space-3); margin-top: var(--space-4); font-size: 14px; }

  .upload-preview p { margin: var(--space-3) 0 var(--space-2); font-size: 14px; }
  .file-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); font-size: 14px; li { display: flex; align-items: center; gap: var(--space-2); } :global(.file-thumb) { width: 40px; height: 40px; object-fit: cover; border-radius: var(--radius); } }
  .upload-results { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3); }

  :global(.detail-image) { display: block; max-width: 100%; max-height: 50vh; margin: 0 auto; border-radius: var(--radius); }
  .modal-url { margin-top: var(--space-3); }
  .detail-actions { display: flex; gap: var(--space-3); margin-top: var(--space-3); }
</style>
