<script>
  import Button from '$lib/components/ui/Button.svelte';
  import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte';
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
  import { uploadMediaFile, fetchWithRetry } from '$lib/utils/uploadMedia.js';

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
  let saving = $state(false);
  let saveError = $state('');

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
      const res = await fetch(`${API}/api/media?limit=200`);
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
    saving = false;
    saveError = '';
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
    const media = await uploadMediaFile(API, pendingCoverFile, 'album');
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
    if (saving) return;
    saving = true;
    saveError = '';

    try {
      await flushPendingCover();
    } catch (e) {
      saving = false;
      saveError = '이미지 업로드 실패: ' + (e?.message || e);
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

      await fetchWithRetry(url, { method, body: formData });

      resetForm();
      await loadAlbums();
    } catch (e) {
      saving = false;
      saveError = '저장 실패: ' + (e?.message || e);
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
    <Button onclick={openCreate}>+ 앨범 추가</Button>
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
                  <ResponsiveImage src={album.cover_thumb_url || album.cover_url} alt={album.title} class="thumb" loading="lazy" sizes="48px" />
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
              <td>
                <div class="actions">
                  <Button variant="secondary" class="sm" onclick={() => openEdit(album)}>편집</Button>
                  <Button variant="secondary" class="sm danger" onclick={() => deleteAlbum(album)}>삭제</Button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ── 편집 / 생성 폼 ──────────────────── -->
  <SlidePanel
    open={showForm}
    title={editing ? '앨범 편집' : '새 앨범'}
    sections={[{ id: 'info', label: '기본 정보' }, { id: 'cover', label: '앨범아트' }, { id: 'tracks', label: '수록곡과 링크' }, { id: 'artists', label: '연결 아티스트' }]}
    snapshot={() => [form, selectedCoverUrl]}
    {saving}
    error={saveError}
    canSave={!(!form.title)}
    saveLabel={editing ? '수정' : '등록'}
    suspended={showMediaPicker}
    onsave={saveAlbum}
    onclose={resetForm}
  >
<div class="form-section" data-section="info">
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
        <div class="form-section" data-section="cover">
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
              <ResponsiveImage src={selectedCoverUrl} alt="cover preview" class="preview-img" sizes="160px" />
              {#if pendingCoverFile}
                <p class="drop-hint pending-hint">저장 시 업로드됩니다</p>
              {/if}
            {:else}
              <p class="drop-text">이미지를 드래그하거나 클릭하여 선택</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
          </div>
          <Button variant="secondary" type="button" style="margin-top:0.5rem" onclick={openMediaPicker}>
            미디어에서 선택
          </Button>
        </div>

        <!-- 수록곡 목록 -->
        <div class="form-section" data-section="tracks">
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
              <Button variant="secondary" class="sm danger" type="button" onclick={() => removeTrack(i)}>×</Button>
            </div>
          {/each}
          <Button variant="secondary" class="sm" type="button" style="margin-top:0.5rem" onclick={addTrack}>+ 곡 추가</Button>
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
              <Button variant="secondary" class="sm danger" type="button" onclick={() => removeLink(i)}>×</Button>
            </div>
          {/each}
          <Button variant="secondary" class="sm" type="button" style="margin-top:0.5rem" onclick={addLink} disabled={availableLinkKeys.length === 0}>+ 링크 추가</Button>
        </div>

        <!-- 연결 아티스트 -->
        <div class="form-section" data-section="artists">
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
  </SlidePanel>
  

  <!-- ── 미디어 피커 모달 ─────────────────── -->
  {#if showMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showMediaPicker = false)}>✕</button>
        <h2>앨범아트 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button class="media-item" onclick={() => selectMedia(media)}>
              <ResponsiveImage src={media.thumb_url || media.url} alt={media.alt_text || media.original_filename} sizes="120px" />
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


