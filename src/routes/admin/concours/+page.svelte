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
    overview: '',
    description: '',
    divisions: [],
    schedule_items: [],
    repertoire: [],
    prizes: [],
    entry_fee: '',
    rules: [],
    register_link: '',
    poster_media_id: null,
    banner_image_media_id: null,
    is_active: true,
  });

  // ── 포스터 이미지 상태 ─────────────────────
  let mediaList = $state([]);
  let showMediaPicker = $state(false);
  let selectedPosterUrl = $state('');
  let imageDragOver = $state(false);
  let pendingPosterFile = $state(null);

  // ── 배너 이미지 상태 ───────────────────────
  let showBannerMediaPicker = $state(false);
  let selectedBannerUrl = $state('');
  let bannerDragOver = $state(false);
  let pendingBannerFile = $state(null);
  let saving = $state(false);
  let saveError = $state('');

  // ── 초기 로드 ──────────────────────────────
  $effect(() => { loadItems(); });

  async function loadItems() {
    loading = true;
    try {
      const res = await fetch(`${API}/api/concours/?active_only=false`);
      items = await res.json();
    } catch (e) {
      console.error('Failed to load concours:', e);
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
      title: '', overview: '', description: '', divisions: [], schedule_items: [],
      repertoire: [], prizes: [], entry_fee: '', rules: [], register_link: '',
      poster_media_id: null, banner_image_media_id: null, is_active: true,
    };
    selectedPosterUrl = '';
    pendingPosterFile = null;
    selectedBannerUrl = '';
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
      overview: item.overview || '',
      description: item.description || '',
      divisions: item.divisions ? [...item.divisions] : [],
      schedule_items: item.schedule_items ? item.schedule_items.map(s => ({ ...s })) : [],
      repertoire: item.repertoire ? [...item.repertoire] : [],
      prizes: item.prizes ? [...item.prizes] : [],
      entry_fee: item.entry_fee || '',
      rules: item.rules ? [...item.rules] : [],
      register_link: item.register_link || '',
      poster_media_id: null,
      banner_image_media_id: null,
      is_active: item.is_active ?? true,
    };
    selectedPosterUrl = item.poster_url || '';
    pendingPosterFile = null;
    selectedBannerUrl = item.banner_image_url || '';
    pendingBannerFile = null;
    showForm = true;
  }

  // ── 포스터 이미지 ──────────────────────────
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

  // ── 배너 이미지 ───────────────────────────
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

  // ── 동적 리스트 헬퍼 ──────────────────────
  function addListItem(arr) {
    return [...arr, ''];
  }
  function removeListItem(arr, idx) {
    return arr.filter((_, i) => i !== idx);
  }
  function updateListItem(arr, idx, value) {
    return arr.map((v, i) => i === idx ? value : v);
  }

  // ── 일정 헬퍼 ─────────────────────────────
  function addScheduleItem() {
    form.schedule_items = [...form.schedule_items, { start_date: '', end_date: '', description: '' }];
  }
  function removeScheduleItem(idx) {
    form.schedule_items = form.schedule_items.filter((_, i) => i !== idx);
  }
  function updateScheduleItem(idx, key, value) {
    form.schedule_items = form.schedule_items.map((s, i) =>
      i === idx ? { ...s, [key]: value } : s
    );
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

    const cleanSchedule = form.schedule_items.map(s => ({
      start_date: s.start_date,
      end_date: s.end_date || undefined,
      description: s.description,
    })).filter(s => s.start_date);

    const formData = new FormData();
    formData.append('title', form.title);
    if (form.overview) formData.append('overview', form.overview);
    if (form.description) formData.append('description', form.description);
    formData.append('divisions', JSON.stringify(form.divisions.filter(v => v.trim())));
    formData.append('schedule_items', JSON.stringify(cleanSchedule));
    formData.append('repertoire', JSON.stringify(form.repertoire.filter(v => v.trim())));
    formData.append('prizes', JSON.stringify(form.prizes.filter(v => v.trim())));
    if (form.entry_fee) formData.append('entry_fee', form.entry_fee);
    formData.append('rules', JSON.stringify(form.rules.filter(v => v.trim())));
    if (form.register_link) formData.append('register_link', form.register_link);
    if (form.poster_media_id) formData.append('poster_media_id', String(form.poster_media_id));
    if (editing && !form.poster_media_id && !pendingPosterFile && !selectedPosterUrl) {
      formData.append('clear_poster', 'true');
    }
    if (form.banner_image_media_id) formData.append('banner_image_media_id', String(form.banner_image_media_id));
    if (editing && !form.banner_image_media_id && !pendingBannerFile && !selectedBannerUrl) {
      formData.append('clear_banner', 'true');
    }
    formData.append('is_active', String(form.is_active));

    try {
      const url = editing ? `${API}/api/concours/${editing.id}` : `${API}/api/concours`;
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
    if (!confirm(`"${item.title}" 콩쿠르를 삭제하시겠습니까?`)) return;
    try {
      await fetch(`${API}/api/concours/${item.id}`, { method: 'DELETE' });
      await loadItems();
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  }
</script>

<svelte:head>
  <title>콩쿠르 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>콩쿠르 관리</h1>
    </div>
    <Button onclick={openCreate}>+ 콩쿠르 추가</Button>
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
            <th>참가 부분</th>
            <th>참가비</th>
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
              <td class="divisions-cell">
                {#if item.divisions?.length}
                  {item.divisions.slice(0, 2).join(', ')}{item.divisions.length > 2 ? ' ...' : ''}
                {:else}
                  -
                {/if}
              </td>
              <td>{item.entry_fee || '-'}</td>
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
            <tr><td colspan="6" class="empty">등록된 콩쿠르가 없습니다.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ── 편집 / 생성 폼 ──────────────────── -->
  <SlidePanel
    open={showForm}
    title={editing ? '콩쿠르 편집' : '새 콩쿠르'}
    sections={[{ id: 'info', label: '기본 정보' }, { id: 'images', label: '이미지' }, { id: 'overview', label: '모집 안내' }, { id: 'schedule', label: '일정과 과제곡' }, { id: 'terms', label: '특전·참가비·규정' }]}
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
            <input type="text" bind:value={form.title} placeholder="콩쿠르 제목" required />
          </label>
          <label class="checkbox-label" style="margin-top: 0.5rem;">
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
          <div class="row-btns">
            <Button variant="secondary" type="button" onclick={openMediaPicker}>미디어에서 선택</Button>
            {#if selectedPosterUrl}
              <Button variant="secondary" type="button" onclick={() => { selectedPosterUrl = ''; form.poster_media_id = null; pendingPosterFile = null; }}>제거</Button>
            {/if}
          </div>
        </div>

        <!-- 배너 이미지 -->
        <div class="form-section">
          <h3>배너 이미지</h3>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="drop-zone"
            class:drag-over={bannerDragOver}
            class:has-image={!!selectedBannerUrl}
            ondragover={(e) => { e.preventDefault(); bannerDragOver = true; }}
            ondragleave={() => (bannerDragOver = false)}
            ondrop={handleBannerDrop}
          >
            <input type="file" accept="image/*" class="file-input" onchange={handleBannerFileSelect} />
            {#if selectedBannerUrl}
              <ResponsiveImage src={selectedBannerUrl} alt="banner preview" class="preview-img banner-preview-img" sizes="160px" />
              {#if pendingBannerFile}
                <p class="drop-hint pending-hint">저장 시 업로드됩니다</p>
              {/if}
            {:else}
              <p class="drop-text">이미지를 드래그하거나 클릭하여 선택</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
          </div>
          <div class="row-btns">
            <Button variant="secondary" type="button" onclick={openBannerMediaPicker}>미디어에서 선택</Button>
            {#if selectedBannerUrl}
              <Button variant="secondary" type="button" onclick={() => { selectedBannerUrl = ''; form.banner_image_media_id = null; pendingBannerFile = null; }}>제거</Button>
            {/if}
          </div>
        </div>

        <!-- 상세 설명 -->
        <div class="form-section" data-section="overview">
          <h3>상세 설명</h3>
          <textarea bind:value={form.description} rows="6" placeholder="콩쿠르 상세 설명을 입력하세요&#10;"></textarea>
        </div>

        <!-- 모집 개요 -->
        <div class="form-section">
          <h3>모집 개요</h3>
          <textarea bind:value={form.overview} rows="4" placeholder="모집 개요를 입력하세요&#10;"></textarea>
        </div>

        <!-- 참가 부분 -->
        <div class="form-section">
          <h3>참가 부분</h3>
          <p class="section-hint">예: 학생부 (만 18세 ~ 만 25세), 일반부 (만 40세 ~ 만 59세)</p>
          {#each form.divisions as div, i}
            <div class="list-row">
              <input
                type="text"
                value={div}
                placeholder="참가 부분명 (예: 학생부 만 18~25세)"
                oninput={(e) => { form.divisions = updateListItem(form.divisions, i, e.target.value); }}
              />
              <Button variant="secondary" class="sm danger" type="button" onclick={() => { form.divisions = removeListItem(form.divisions, i); }}>×</Button>
            </div>
          {/each}
          <Button class="sm" type="button" onclick={() => { form.divisions = addListItem(form.divisions); }}>+ 부분 추가</Button>
        </div>

        <!-- 일정 안내 -->
        <div class="form-section" data-section="schedule">
          <h3>일정 안내</h3>
          <p class="section-hint">종료일을 비워두면 단일 날짜로 표시됩니다</p>
          {#each form.schedule_items as sched, i}
            <div class="schedule-row">
              <div class="schedule-dates">
                <input
                  type="date"
                  value={sched.start_date}
                  oninput={(e) => updateScheduleItem(i, 'start_date', e.target.value)}
                  placeholder="시작일"
                />
                <span class="date-sep">~</span>
                <input
                  type="date"
                  value={sched.end_date || ''}
                  oninput={(e) => updateScheduleItem(i, 'end_date', e.target.value)}
                  placeholder="종료일 (선택)"
                />
              </div>
              <div class="schedule-desc-row">
                <input
                  type="text"
                  value={sched.description}
                  placeholder="내용 (예: 접수기간, 발표 등)"
                  oninput={(e) => updateScheduleItem(i, 'description', e.target.value)}
                />
                <Button variant="secondary" class="sm danger" type="button" onclick={() => removeScheduleItem(i)}>×</Button>
              </div>
            </div>
          {/each}
          <Button class="sm" type="button" onclick={addScheduleItem}>+ 일정 추가</Button>
        </div>

        <!-- 과제곡 -->
        <div class="form-section">
          <h3>과제곡</h3>
          {#each form.repertoire as rep, i}
            <div class="list-row">
              <textarea
                rows="2"
                value={rep}
                placeholder="과제곡 (줄바꿈 지원)"
                oninput={(e) => { form.repertoire = updateListItem(form.repertoire, i, e.target.value); }}
              ></textarea>
              <Button variant="secondary" class="sm danger" type="button" onclick={() => { form.repertoire = removeListItem(form.repertoire, i); }}>×</Button>
            </div>
          {/each}
          <Button class="sm" type="button" onclick={() => { form.repertoire = addListItem(form.repertoire); }}>+ 과제곡 추가</Button>
        </div>

        <!-- 대회 특전 -->
        <div class="form-section" data-section="terms">
          <h3>대회 특전</h3>
          {#each form.prizes as prize, i}
            <div class="list-row">
              <textarea
                rows="2"
                value={prize}
                placeholder="특전 내용 (줄바꿈 지원)"
                oninput={(e) => { form.prizes = updateListItem(form.prizes, i, e.target.value); }}
              ></textarea>
              <Button variant="secondary" class="sm danger" type="button" onclick={() => { form.prizes = removeListItem(form.prizes, i); }}>×</Button>
            </div>
          {/each}
          <Button class="sm" type="button" onclick={() => { form.prizes = addListItem(form.prizes); }}>+ 특전 추가</Button>
        </div>

        <!-- 참가비 -->
        <div class="form-section">
          <h3>참가비</h3>
          <textarea bind:value={form.entry_fee} rows="3" placeholder="참가비 안내&#10;예: 1인 50,000원&#10;"></textarea>
        </div>

        <!-- 규정 -->
        <div class="form-section">
          <h3>규정</h3>
          {#each form.rules as rule, i}
            <div class="list-row">
              <textarea
                rows="2"
                value={rule}
                placeholder="규정 내용 (줄바꿈 지원)"
                oninput={(e) => { form.rules = updateListItem(form.rules, i, e.target.value); }}
              ></textarea>
              <Button variant="secondary" class="sm danger" type="button" onclick={() => { form.rules = removeListItem(form.rules, i); }}>×</Button>
            </div>
          {/each}
          <Button class="sm" type="button" onclick={() => { form.rules = addListItem(form.rules); }}>+ 규정 추가</Button>
        </div>

        <!-- 접수 링크 -->
        <div class="form-section">
          <h3>접수 링크</h3>
          <input type="url" bind:value={form.register_link} placeholder="https://..." />
        </div>
  </SlidePanel>
  

  <!-- ── 포스터 미디어 피커 모달 ──────────── -->
  {#if showMediaPicker}
    <div class="modal-overlay">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showMediaPicker = false)}>✕</button>
        <h2>포스터 이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button type="button" class="media-item" class:already-selected={form.poster_media_id === media.id} onclick={() => selectMedia(media)}>
              <ResponsiveImage src={media.thumb_url || media.url} alt={media.original_filename} sizes="120px" />
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

  <!-- ── 배너 미디어 피커 모달 ──────────── -->
  {#if showBannerMediaPicker}
    <div class="modal-overlay">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showBannerMediaPicker = false)}>✕</button>
        <h2>배너 이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button type="button" class="media-item" class:already-selected={form.banner_image_media_id === media.id} onclick={() => selectBannerMedia(media)}>
              <ResponsiveImage src={media.thumb_url || media.url} alt={media.original_filename} sizes="120px" />
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
.divisions-cell { font-size: 0.85rem; color: var(--color-green-700); max-width: 200px; }

.section-hint {
    font-size: 0.8rem; color: var(--color-green-700); margin: 0 0 0.75rem;
  }

.row-btns {
    display: flex; gap: 0.5rem; margin-top: 0.5rem;
  }

.list-row {
    display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;
    input, textarea {
      flex: 1;
      margin-top: 0;
    }
  }

.schedule-row {
    border: 1px solid var(--color-green-200); border-radius: 8px;
    padding: 0.75rem; margin-bottom: 0.75rem;
    background: var(--color-green-50);
  }

.schedule-dates {
    display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;
    input[type="date"] { flex: 1; margin-top: 0; }
  }

.date-sep { color: var(--color-green-700); flex-shrink: 0; }

.schedule-desc-row {
    display: flex; align-items: center; gap: 0.5rem;
    input { flex: 1; margin-top: 0; }
  }
</style>
