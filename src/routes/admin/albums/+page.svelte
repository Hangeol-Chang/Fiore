<script>
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  const LINK_KEYS = ['youtube music', 'spotify', 'apple music'];

  // ── 상태 ──────────────────────────────────
  let albums = $state([]);
  let artists = $state([]);
  let loading = $state(false);
  let editing = $state(null);
  let showForm = $state(false);

  // ── 폼 데이터 ──────────────────────────────
  // links: [{ key: 'spotify', value: 'https://...' }, ...]
  let form = $state({
    title: '',
    release_date: '',
    cover_media_id: null,
    tracklist: [],
    links: [],
    artist_ids: [],
    sort_order: 0,
    is_active: true,
  });

  // ── 미디어 선택 ────────────────────────────
  let mediaList = $state([]);
  let showMediaPicker = $state(false);
  let selectedCoverUrl = $state('');

  // ── 드래그 앤 드롭 ────────────────────────────
  let coverDragOver = $state(false);
  /** 아직 업로드 안 된 커버 File 객체 (저장 시 업로드) */
  let pendingCoverFile = $state(null);

  // ── 초기 로드 ──────────────────────────────
  $effect(() => {
    loadAlbums();
    loadArtists();
  });

  async function loadAlbums() {
    loading = true;
    try {
      const res = await fetch(`${API}/api/albums?active_only=false`);
      albums = await res.json();
    } catch (e) {
      console.error('Failed to load albums:', e);
    }
    loading = false;
  }

  async function loadArtists() {
    try {
      const res = await fetch(`${API}/api/artists?active_only=false`);
      artists = await res.json();
    } catch (e) {
      console.error('Failed to load artists:', e);
    }
  }

  async function loadMedia() {
    try {
      const res = await fetch(`${API}/api/media?category=album&limit=100`);
      const data = await res.json();
      mediaList = data.items || [];
    } catch (e) {
      console.error('Failed to load media:', e);
    }
  }

  // ── 폼 초기화 ──────────────────────────────
  function resetForm() {
    form = {
      title: '', release_date: '', cover_media_id: null,
      tracklist: [], links: [], artist_ids: [], sort_order: 0, is_active: true,
    };
    selectedCoverUrl = '';
    pendingCoverFile = null;
    editing = null;
    showForm = false;
  }

  function openCreate() {
    resetForm();
    showForm = true;
  }

  async function openEdit(albumSummary) {
    loading = true;
    let album = albumSummary;
    try {
      const res = await fetch(`${API}/api/albums/${albumSummary.id}`);
      if (res.ok) {
        album = await res.json();
      }
    } catch (e) {
      console.error('상세 정보 로드 실패:', e);
    }
    loading = false;

    editing = album;
    form = {
      title: album.title || '',
      release_date: album.release_date || '',
      cover_media_id: null,
      tracklist: album.tracklist ? [...album.tracklist] : [],
      links: Object.entries(album.links || {}).map(([key, value]) => ({ key, value })),
      artist_ids: (album.artists || []).map(a => a.id),
      sort_order: album.sort_order || 0,
      is_active: album.is_active ?? true,
    };
    selectedCoverUrl = album.cover_url || '';
    showForm = true;
  }

  // ── 수록곡 목록 ────────────────────────────
  function addTrack() {
    form.tracklist = [...form.tracklist, ''];
  }

  function removeTrack(idx) {
    form.tracklist = form.tracklist.filter((_, i) => i !== idx);
  }

  // ── 링크 목록 ──────────────────────────────
  let availableLinkKeys = $derived(
    LINK_KEYS.filter(k => !form.links.some(l => l.key === k))
  );

  function addLink() {
    if (availableLinkKeys.length === 0) return;
    form.links = [...form.links, { key: availableLinkKeys[0], value: '' }];
  }

  function removeLink(idx) {
    form.links = form.links.filter((_, i) => i !== idx);
  }

  // ── 커버 이미지 드래그 앤 드롭 ─────────────────
  function handleCoverDrop(e) {
    e.preventDefault();
    coverDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) setCoverLocally(file);
  }

  function handleCoverFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) setCoverLocally(file);
    e.target.value = '';
  }

  function setCoverLocally(file) {
    if (pendingCoverFile?._previewUrl) URL.revokeObjectURL(pendingCoverFile._previewUrl);
    const previewUrl = URL.createObjectURL(file);
    file._previewUrl = previewUrl;
    pendingCoverFile = file;
    form.cover_media_id = null;
    selectedCoverUrl = previewUrl;
  }

  /** 저장 시 호출: pending 커버 이미지를 실제 업로드 */
  async function flushPendingCover() {
    if (!pendingCoverFile) return;
    const fd = new FormData();
    fd.append('file', pendingCoverFile);
    fd.append('category', 'album');
    const res = await fetch(`${API}/api/media`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await res.text());
    const media = await res.json();
    form.cover_media_id = media.id;
    selectedCoverUrl = media.thumb_url || media.url;
    URL.revokeObjectURL(pendingCoverFile._previewUrl);
    pendingCoverFile = null;
  }

  // ── 미디어 선택 ────────────────────────────
  async function openMediaPicker() {
    await loadMedia();
    showMediaPicker = true;
  }

  function selectMedia(media) {
    form.cover_media_id = media.id;
    selectedCoverUrl = media.thumb_url || media.url;
    pendingCoverFile = null;
    showMediaPicker = false;
  }

  // ── 저장 ───────────────────────────────────
  async function saveAlbum() {
    try {
      await flushPendingCover();
    } catch (e) {
      alert('이미지 업로드 실패: ' + e.message);
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('release_date', form.release_date || '');
    if (form.cover_media_id) formData.append('cover_media_id', String(form.cover_media_id));
    formData.append('tracklist', JSON.stringify(form.tracklist.filter(t => t.trim())));
    formData.append('links', JSON.stringify(
      Object.fromEntries(form.links.filter(l => l.key && l.value?.trim()).map(l => [l.key, l.value.trim()]))
    ));
    formData.append('artist_ids', JSON.stringify(form.artist_ids));
    formData.append('sort_order', String(form.sort_order || 0));
    formData.append('is_active', String(form.is_active));

    try {
      const url = editing
        ? `${API}/api/albums/${editing.id}`
        : `${API}/api/albums`;
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error(await res.text());

      resetForm();
      await loadAlbums();
    } catch (e) {
      alert('저장 실패: ' + e.message);
    }
  }

  async function deleteAlbum(album) {
    if (!confirm(`"${album.title}" 앨범을 삭제하시겠습니까?`)) return;
    try {
      await fetch(`${API}/api/albums/${album.id}`, { method: 'DELETE' });
      await loadAlbums();
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  }

  // ── 아티스트 검색 & 선택 ───────────────────────
  let artistQuery = $state('');
  let showArtistResults = $state(false);
  let filteredArtistResults = $derived(
    artistQuery.trim()
      ? artists.filter(a =>
          !form.artist_ids.includes(a.id) &&
          ((a.name || '').toLowerCase().includes(artistQuery.trim().toLowerCase()) ||
           (a.name_en || '').toLowerCase().includes(artistQuery.trim().toLowerCase()))
        )
      : []
  );
  let selectedArtists = $derived(
    form.artist_ids.map(id => artists.find(a => a.id === id)).filter(Boolean)
  );

  function addArtist(artistId) {
    form.artist_ids = [...form.artist_ids, artistId];
    artistQuery = '';
    showArtistResults = false;
  }
  function removeArtist(artistId) {
    form.artist_ids = form.artist_ids.filter(id => id !== artistId);
  }
</script>

<svelte:head>
  <title>앨범 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>앨범 관리</h1>
    </div>
    <button class="btn-primary" onclick={openCreate}>+ 앨범 추가</button>
  </header>

  <!-- ── 앨범 목록 ─────────────────────── -->
  {#if loading}
    <p class="loading">로딩 중...</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>앨범아트</th>
            <th>앨범명</th>
            <th>발매일</th>
            <th>수록곡</th>
            <th>아티스트</th>
            <th>상태</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {#each albums as album}
            <tr>
              <td>
                {#if album.cover_thumb_url || album.cover_url}
                  <img src={album.cover_thumb_url || album.cover_url} alt={album.title} class="thumb" loading="lazy" />
                {:else}
                  <div class="thumb-placeholder"></div>
                {/if}
              </td>
              <td class="name-cell">{album.title}</td>
              <td>{album.release_date || '-'}</td>
              <td>{(album.tracklist || []).length}곡</td>
              <td>{(album.artists || []).length}명</td>
              <td>
                <span class="badge" class:active={album.is_active}>
                  {album.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td class="actions">
                <button class="btn-sm btn-edit" onclick={() => openEdit(album)}>편집</button>
                <button class="btn-sm btn-delete" onclick={() => deleteAlbum(album)}>삭제</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ── 편집 / 생성 폼 ──────────────────── -->
  {#if showForm}
    <div class="modal-overlay">
      <div class="modal" role="none" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header-row">
          <h2>{editing ? '앨범 편집' : '새 앨범'}</h2>
          <div class="modal-header-actions">
            <button class="btn-primary btn-save-top" onclick={saveAlbum} disabled={!form.title}>
              {editing ? '수정' : '등록'}
            </button>
            <button class="modal-close" onclick={resetForm}>✕</button>
          </div>
        </div>

        <!-- 기본 정보 -->
        <div class="form-section">
          <h3>기본 정보</h3>
          <label>
            앨범명 *
            <input type="text" bind:value={form.title} placeholder="앨범 이름" required />
          </label>
          <label>
            발매일
            <input type="date" bind:value={form.release_date} />
          </label>
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={form.is_active} />
            활성 상태
          </label>
        </div>

        <!-- 앨범아트 -->
        <div class="form-section">
          <h3>앨범아트</h3>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="drop-zone"
            class:drag-over={coverDragOver}
            class:has-image={!!selectedCoverUrl}
            ondragover={(e) => { e.preventDefault(); coverDragOver = true; }}
            ondragleave={() => (coverDragOver = false)}
            ondrop={handleCoverDrop}
          >
            <input type="file" accept="image/*" class="file-input" onchange={handleCoverFileSelect} />
            {#if selectedCoverUrl}
              <img src={selectedCoverUrl} alt="cover preview" class="preview-img" />
              {#if pendingCoverFile}
                <p class="drop-hint pending-hint">💾 저장 시 업로드됩니다</p>
              {/if}
            {:else}
              <p class="drop-text">이미지를 드래그하거나 클릭하여 선택</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
          </div>
          <button type="button" class="btn-secondary" style="margin-top:0.5rem" onclick={openMediaPicker}>
            미디어에서 선택
          </button>
        </div>

        <!-- 수록곡 목록 -->
        <div class="form-section">
          <h3>수록곡 목록</h3>
          {#each form.tracklist as track, i}
            <div class="track-row">
              <span class="track-num">{i + 1}.</span>
              <input
                type="text"
                value={track}
                oninput={e => { form.tracklist[i] = e.target.value; form.tracklist = [...form.tracklist]; }}
                placeholder="곡명"
              />
              <button type="button" class="btn-sm btn-delete" onclick={() => removeTrack(i)}>×</button>
            </div>
          {/each}
          <button type="button" class="btn-secondary btn-sm" style="margin-top:0.5rem" onclick={addTrack}>+ 곡 추가</button>
        </div>

        <!-- 링크 -->
        <div class="form-section">
          <h3>링크</h3>
          {#each form.links as link, i}
            <div class="link-row">
              <select bind:value={link.key}>
                {#each LINK_KEYS as key}
                  <option value={key} disabled={key !== link.key && !availableLinkKeys.includes(key)}>{key}</option>
                {/each}
              </select>
              <input type="url" bind:value={link.value} placeholder="https://..." />
              <button type="button" class="btn-sm btn-delete" onclick={() => removeLink(i)}>×</button>
            </div>
          {/each}
          <button type="button" class="btn-secondary btn-sm" style="margin-top:0.5rem" onclick={addLink} disabled={availableLinkKeys.length === 0}>+ 링크 추가</button>
        </div>

        <!-- 연결 아티스트 -->
        <div class="form-section">
          <h3>연결 아티스트</h3>
          {#if selectedArtists.length > 0}
            <div class="selected-artists">
              {#each selectedArtists as artist}
                <span class="artist-tag">
                  {artist.name}
                  {#if artist.name_en}<small>({artist.name_en})</small>{/if}
                  <button type="button" class="tag-remove" onclick={() => removeArtist(artist.id)}>&times;</button>
                </span>
              {/each}
            </div>
          {/if}
          <div class="artist-search-wrap">
            <input
              type="text"
              placeholder="아티스트 이름 검색..."
              bind:value={artistQuery}
              onfocus={() => showArtistResults = true}
              oninput={() => showArtistResults = true}
            />
            {#if showArtistResults && filteredArtistResults.length > 0}
              <ul class="artist-dropdown">
                {#each filteredArtistResults as artist}
                  <li>
                    <button type="button" onclick={() => addArtist(artist.id)}>
                      {artist.name}
                      {#if artist.name_en}<small>({artist.name_en})</small>{/if}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
            {#if artistQuery.trim() && filteredArtistResults.length === 0 && showArtistResults}
              <ul class="artist-dropdown"><li class="no-result">결과 없음</li></ul>
            {/if}
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-primary" onclick={saveAlbum} disabled={!form.title}>
            {editing ? '수정' : '생성'}
          </button>
          <button class="btn-secondary" onclick={resetForm}>취소</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── 미디어 피커 모달 ─────────────────── -->
  {#if showMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showMediaPicker = false)}>✕</button>
        <h2>앨범아트 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button class="media-item" onclick={() => selectMedia(media)}>
              <img src={media.thumb_url || media.url} alt={media.alt_text || media.original_filename} />
              <span class="media-name">{media.original_filename}</span>
            </button>
          {/each}
          {#if mediaList.length === 0}
            <p class="empty">업로드된 앨범 이미지가 없습니다.</p>
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

    .back-link {
      color: #888;
      text-decoration: none;
      &:hover { color: #222; }
    }

    h1 { margin: 0; font-size: 1.5rem; color: #111; }
  }

  .loading { text-align: center; color: #999; padding: 3rem; }

  /* ── 테이블 ─────────────────────────── */
  .table-wrap { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th { color: #888; font-weight: 500; font-size: 0.85rem; }
    tbody tr:hover { background: #f8f9fa; }
  }

  .thumb {
    width: 60px; height: 60px;
    border-radius: 6px;
    object-fit: cover;
  }
  .thumb-placeholder {
    width: 60px; height: 60px;
    border-radius: 6px;
    background: #eee;
  }

  .name-cell { font-weight: 600; color: #111; }

  .badge {
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.8rem;
    background: #eee;
    color: #666;
    &.active { background: #dcfce7; color: #166534; }
  }

  .actions { display: flex; gap: 0.5rem; }

  /* ── 버튼 ──────────────────────────── */
  .btn-primary {
    padding: 0.6rem 1.2rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    &:hover { background: #1d4ed8; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
  .btn-secondary {
    padding: 0.6rem 1.2rem;
    background: #f3f4f6;
    color: #444;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    &:hover { background: #e5e7eb; }
  }
  .btn-sm { padding: 0.3rem 0.7rem; font-size: 0.85rem; }
  .btn-edit { background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer; &:hover { background: #1d4ed8; } }
  .btn-delete { background: #dc3545; color: #fff; border: none; border-radius: 4px; cursor: pointer; &:hover { background: #c82333; } }

  /* ── 모달 ──────────────────────────── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem;
    overflow-y: auto;
    z-index: 1000;
  }
  .modal {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 2rem;
    width: 100%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    position: relative;

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

  .modal-close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: none;
    border: none;
    color: #888;
    font-size: 1.4rem;
    cursor: pointer;
    z-index: 1;
    &:hover { color: #222; }
  }

  .form-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;

    h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #666; }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: #444;
    }

    input[type="text"],
    input[type="date"],
    input[type="url"],
    select,
    textarea {
      display: block;
      width: 100%;
      margin-top: 0.25rem;
      padding: 0.5rem 0.75rem;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      color: #222;
      font-size: 0.9rem;
      &:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
    }
  }

  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    input { width: auto; margin: 0; cursor: pointer; }
  }

  /* ── 드래그 앤 드롭 ────────────────── */
  .drop-zone {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    position: relative;
    transition: border-color 0.2s, background 0.2s;

    &:hover, &.drag-over {
      border-color: #2563eb;
      background: #f0f4ff;
    }

    &.has-image { padding: 1rem; }

    .drop-text { margin: 0; color: #888; }
    .drop-hint { margin: 0.5rem 0 0; font-size: 0.8rem; color: #aaa; }
    .pending-hint { color: #f59e0b; font-weight: 500; }

    .file-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }

    .preview-img {
      max-width: 200px;
      max-height: 200px;
      border-radius: 8px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
  }

  /* ── 수록곡 목록 ────────────────────── */
  .track-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;

    .track-num { color: #999; font-size: 0.85rem; width: 1.5rem; text-align: right; flex-shrink: 0; }
    input { flex: 1; margin-top: 0; }
  }

  .link-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;

    select {
      flex-shrink: 0;
      width: auto;
      padding: 0.5rem 0.6rem;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      color: #222;
      font-size: 0.9rem;
    }
    input { flex: 1; margin-top: 0; }
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    justify-content: flex-end;
  }

  /* ── 미디어 피커 ───────────────────── */
  .media-picker { max-width: 800px; }
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
    max-height: 400px;
    overflow-y: auto;
  }
  .media-item {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    padding: 0;
    overflow: hidden;
    transition: border-color 0.2s;
    &:hover { border-color: #2563eb; }
    img { width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block; }
    .media-name {
      display: block;
      padding: 0.3rem;
      font-size: 0.7rem;
      color: #888;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .empty { color: #999; text-align: center; padding: 1rem; }

  /* ── 아티스트 선택 ─────────────────── */
  .selected-artists {
    display: flex; flex-wrap: wrap; gap: 0.4rem;
    margin-bottom: 0.5rem;
  }
  .artist-tag {
    display: inline-flex; align-items: center; gap: 0.3rem;
    background: #e0edff; color: #1a5276;
    padding: 0.25rem 0.5rem; border-radius: 20px;
    font-size: 0.85rem;
    small { color: #5b8fad; margin-left: 0.1rem; }
  }
  .tag-remove {
    background: none; border: none; cursor: pointer;
    font-size: 1rem; color: #888; padding: 0 0.15rem;
    line-height: 1;
    &:hover { color: #c0392b; }
  }
  .artist-search-wrap {
    position: relative;
    input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; }
  }
  .artist-dropdown {
    position: absolute; top: 100%; left: 0; right: 0;
    background: #fff; border: 1px solid #ddd; border-top: none;
    border-radius: 0 0 6px 6px;
    max-height: 180px; overflow-y: auto;
    list-style: none; margin: 0; padding: 0;
    z-index: 20; box-shadow: 0 4px 8px rgba(0,0,0,0.08);
    li button {
      display: block; width: 100%; text-align: left;
      padding: 0.5rem 0.75rem; border: none; background: none;
      cursor: pointer; font-size: 0.9rem;
      small { color: #888; }
      &:hover { background: #f0f4ff; }
    }
    .no-result { padding: 0.5rem 0.75rem; color: #999; font-size: 0.85rem; }
  }
</style>
