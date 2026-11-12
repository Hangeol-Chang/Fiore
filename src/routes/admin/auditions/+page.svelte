<script>
  import Button from '$lib/components/ui/Button.svelte';
  import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte';
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
  import { uploadMediaFile, fetchWithRetry } from '$lib/utils/uploadMedia.js';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  // ── 상태 ──────────────────────────────────
  let items = $state([]);
  let loading = $state(false);
  let editing = $state(null);
  let showForm = $state(false);

  // ── 폼 데이터 ──────────────────────────────
  let form = $state({
    title: '',
    start_date: '',
    end_date: '',
    brief_description: '',
    content: '',
    apply_link: '',
    poster_media_id: null,
    banner_image_media_id: null,
    is_active: true,
  });

  // ── 미디어 & 이미지 상태 ─────────────────────
  let mediaList = $state([]);
  let showMediaPicker = $state(false);
  let showBannerMediaPicker = $state(false);
  let selectedPosterUrl = $state('');
  let selectedBannerUrl = $state('');

  let imageDragOver = $state(false);
  let bannerDragOver = $state(false);
  let pendingPosterFile = $state(null);
  let pendingBannerFile = $state(null);
  let saving = $state(false);
  let saveError = $state('');

  // ── 초기 로드 ──────────────────────────────
  $effect(() => { loadItems(); });

  async function loadItems() {
    loading = true;
    try {
      const res = await fetch(`${API}/api/auditions?active_only=false`);
      items = await res.json();
    } catch (e) {
      console.error('Failed to load auditions:', e);
    }
    loading = false;
  }

  async function loadMedia() {
    try {
      const res = await fetch(`${API}/api/media?category=concert&limit=100`);
      const data = await res.json();
      mediaList = data.items || [];
    } catch (e) {
      console.error('Failed to load media:', e);
    }
  }

  // ── 폼 초기화 ──────────────────────────────
  function resetForm() {
    form = {
      title: '', start_date: '', end_date: '', brief_description: '', content: '', apply_link: '',
      poster_media_id: null, banner_image_media_id: null, is_active: true,
    };
    selectedPosterUrl = '';
    selectedBannerUrl = '';
    pendingPosterFile = null;
    pendingBannerFile = null;
    editing = null;
    showForm = false;
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
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      brief_description: item.brief_description || '',
      content: item.content || '',
      apply_link: item.apply_link || '',
      poster_media_id: null,
      banner_image_media_id: null,
      is_active: item.is_active ?? true,
    };
    selectedPosterUrl = item.poster_url || '';
    selectedBannerUrl = item.banner_image_url || '';
    showForm = true;
  }

  // ── 포스터 ────────────────────────────────
  function handleImageDrop(e) {
    e.preventDefault(); imageDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) setPosterLocally(file);
  }
  function handleImageFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) setPosterLocally(file);
    e.target.value = '';
  }
  function setPosterLocally(file) {
    if (pendingPosterFile?._previewUrl) URL.revokeObjectURL(pendingPosterFile._previewUrl);
    const previewUrl = URL.createObjectURL(file);
    file._previewUrl = previewUrl;
    pendingPosterFile = file;
    form.poster_media_id = null;
    selectedPosterUrl = previewUrl;
  }
  async function flushPendingPoster() {
    if (!pendingPosterFile) return;
    const media = await uploadMediaFile(API, pendingPosterFile, 'concert');
    form.poster_media_id = media.id;
    selectedPosterUrl = media.url;
    URL.revokeObjectURL(pendingPosterFile._previewUrl);
    pendingPosterFile = null;
  }
  async function openMediaPicker() {
    await loadMedia(); showMediaPicker = true;
  }
  function selectMedia(media) {
    form.poster_media_id = media.id;
    selectedPosterUrl = media.thumb_url || media.url;
    showMediaPicker = false;
  }

  // ── 배너 이미지 ──────────────────────────
  function handleBannerDrop(e) {
    e.preventDefault(); bannerDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) setBannerLocally(file);
  }
  function handleBannerFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) setBannerLocally(file);
    e.target.value = '';
  }
  function setBannerLocally(file) {
    if (pendingBannerFile?._previewUrl) URL.revokeObjectURL(pendingBannerFile._previewUrl);
    const previewUrl = URL.createObjectURL(file);
    file._previewUrl = previewUrl;
    pendingBannerFile = file;
    form.banner_image_media_id = null;
    selectedBannerUrl = previewUrl;
  }
  async function flushPendingBanner() {
    if (!pendingBannerFile) return;
    const media = await uploadMediaFile(API, pendingBannerFile, 'concert');
    form.banner_image_media_id = media.id;
    selectedBannerUrl = media.url;
    URL.revokeObjectURL(pendingBannerFile._previewUrl);
    pendingBannerFile = null;
  }
  async function openBannerMediaPicker() {
    await loadMedia(); showBannerMediaPicker = true;
  }
  function selectBannerMedia(media) {
    form.banner_image_media_id = media.id;
    selectedBannerUrl = media.thumb_url || media.url;
    showBannerMediaPicker = false;
  }

  // ── 저장 ───────────────────────────────────
  async function saveItem() {
    if (saving) return;
    saving = true;
    saveError = '';

    try {
      await flushPendingPoster();
      await flushPendingBanner();
    } catch (e) {
      saving = false;
      saveError = '이미지 업로드 실패: ' + (e?.message || e);
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    if (form.start_date) formData.append('start_date', form.start_date);
    if (form.end_date) formData.append('end_date', form.end_date);
    if (form.brief_description) formData.append('brief_description', form.brief_description);
    if (form.content) formData.append('content', form.content);
    formData.append('apply_link', form.apply_link || '');
    if (form.poster_media_id) formData.append('poster_media_id', String(form.poster_media_id));
    if (form.banner_image_media_id) formData.append('banner_image_media_id', String(form.banner_image_media_id));
    formData.append('is_active', String(form.is_active));

    try {
      const url = editing ? `${API}/api/auditions/${editing.id}` : `${API}/api/auditions`;
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
    if (!confirm(`"${item.title}" 오디션을 삭제하시겠습니까?`)) return;
    try {
      await fetch(`${API}/api/auditions/${item.id}`, { method: 'DELETE' });
      await loadItems();
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  }
</script>

<svelte:head>
  <title>오디션 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>오디션 관리</h1>
    </div>
    <Button onclick={openCreate}>+ 오디션 추가</Button>
  </header>

  {#if loading}
    <p class="loading">로딩 중...</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>포스터</th>
            <th>제목</th>
            <th>시작일</th>
            <th>마감일</th>
            <th>지원 링크</th>
            <th>상태</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {#each items as item}
            <tr>
              <td>
                {#if item.poster_thumb_url || item.poster_url}
                  <ResponsiveImage src={item.poster_thumb_url || item.poster_url} alt={item.title} class="thumb" sizes="48px" />
                {:else}
                  <div class="thumb-placeholder"></div>
                {/if}
              </td>
              <td class="name-cell">{item.title}</td>
              <td>{item.start_date || '-'}</td>
              <td>{item.end_date || '-'}</td>
              <td>
                {#if item.apply_link}
                  <a href={item.apply_link} target="_blank" rel="noreferrer" class="link-cell">링크</a>
                {:else}
                  -
                {/if}
              </td>
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
            <tr><td colspan="7" class="empty">등록된 오디션이 없습니다.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ── 편집 / 생성 폼 ──────────────────── -->
  <SlidePanel
    open={showForm}
    title={editing ? '오디션 편집' : '새 오디션'}
    sections={[{ id: 'info', label: '기본 정보' }, { id: 'images', label: '이미지' }, { id: 'content', label: '설명' }]}
    snapshot={() => [form, selectedPosterUrl, selectedBannerUrl]}
    {saving}
    error={saveError}
    canSave={!(!form.title)}
    saveLabel={editing ? '수정' : '등록'}
    suspended={showMediaPicker || showBannerMediaPicker}
    onsave={saveItem}
    onclose={resetForm}
  >
<div class="form-section" data-section="info">
          <h3>기본 정보</h3>
          <label>
            제목 *
            <input type="text" bind:value={form.title} placeholder="오디션 제목" required />
          </label>
          <div class="row-2">
            <label>
              시작일
              <input type="date" bind:value={form.start_date} />
            </label>
            <label>
              마감일
              <input type="date" bind:value={form.end_date} />
            </label>
          </div>
          <label>
            지원 링크
            <input type="url" bind:value={form.apply_link} placeholder="https://..." />
          </label>
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={form.is_active} />
            활성 상태
          </label>
        </div>

        <!-- 포스터 -->
        <div class="form-section" data-section="images">
          <h3>포스터</h3>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="drop-zone"
            class:drag-over={imageDragOver}
            class:has-image={!!selectedPosterUrl}
            ondragover={(e) => { e.preventDefault(); imageDragOver = true; }}
            ondragleave={() => (imageDragOver = false)}
            ondrop={handleImageDrop}
          >
            <input type="file" accept="image/*" class="file-input" onchange={handleImageFileSelect} />
            {#if selectedPosterUrl}
              <ResponsiveImage src={selectedPosterUrl} alt="poster preview" class="preview-img" sizes="160px" />
              {#if pendingPosterFile}
                <p class="drop-hint pending-hint">저장 시 업로드됩니다</p>
              {/if}
            {:else}
              <p class="drop-text">이미지를 드래그하거나 클릭하여 선택</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
            <Button variant="secondary" type="button" onclick={openMediaPicker}>미디어에서 선택</Button>
            {#if selectedPosterUrl}
              <Button variant="secondary" type="button" onclick={() => { selectedPosterUrl = ''; form.poster_media_id = null; pendingPosterFile = null; }}>제거</Button>
            {/if}
          </div>
        </div>

        <!-- 배너 이미지 -->
        <div class="form-section">
          <h3>배너 이미지 (Banner Image)</h3>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="drop-zone banner-drop"
            class:drag-over={bannerDragOver}
            class:has-image={!!selectedBannerUrl}
            ondragover={(e) => { e.preventDefault(); bannerDragOver = true; }}
            ondragleave={() => (bannerDragOver = false)}
            ondrop={handleBannerDrop}
          >
            <input type="file" accept="image/*" class="file-input" onchange={handleBannerFileSelect} />
            {#if selectedBannerUrl}
              <ResponsiveImage src={selectedBannerUrl} alt="banner preview" class="preview-img banner-preview" sizes="160px" />
              {#if pendingBannerFile}
                <p class="drop-hint pending-hint">저장 시 업로드됩니다</p>
              {/if}
            {:else}
              <p class="drop-text">이미지를 드래그하거나 클릭하여 선택</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
          </div>
          <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
            <Button variant="secondary" type="button" onclick={openBannerMediaPicker}>미디어에서 선택</Button>
            {#if selectedBannerUrl}
              <Button variant="secondary" type="button" onclick={() => { selectedBannerUrl = ''; form.banner_image_media_id = null; pendingBannerFile = null; }}>제거</Button>
            {/if}
          </div>
        </div>

        <!-- 내용 -->
        <div class="form-section" data-section="content">
          <h3>간단 설명</h3>
          <label>
            Brief Description
            <textarea bind:value={form.brief_description} placeholder="오디션 간단 설명 (여러 줄 가능)" style="min-height:80px"></textarea>
          </label>
          <h3 style="margin-top:1rem">상세 내용</h3>
          <textarea bind:value={form.content} placeholder="오디션 상세 내용을 입력하세요"></textarea>
        </div>
  </SlidePanel>
  

  <!-- ── 포스터 미디어 피커 모달 ──────────── -->
  {#if showMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showMediaPicker = false)}>✕</button>
        <h2>포스터 이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button type="button" class="media-item" class:already-selected={form.poster_media_id === media.id} onclick={() => selectMedia(media)}>
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

  <!-- ── 배너 미디어 피커 모달 ─────────────── -->
  {#if showBannerMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showBannerMediaPicker = false)}>✕</button>
        <h2>배너 이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button type="button" class="media-item" class:already-selected={form.banner_image_media_id === media.id} onclick={() => selectBannerMedia(media)}>
              <ResponsiveImage src={media.url} alt={media.original_filename} sizes="120px" />
              <span class="media-name">{media.original_filename}</span>
            </button>
          {/each}
          {#if mediaList.length === 0}
            <p class="empty">업로드된 이미지가 없습니다.</p>
          {/if}
        </div>
        <Button variant="secondary" onclick={() => (showBannerMediaPicker = false)}>닫기</Button>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
.link-cell { color: var(--color-green-500); text-decoration: none; &:hover { text-decoration: underline; } }

.drop-zone.banner-drop {
    aspect-ratio: 16 / 5;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    &.has-image { padding: 0.5rem; }
  }


</style>
