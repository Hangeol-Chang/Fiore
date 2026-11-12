<script>
  import Button from '$lib/components/ui/Button.svelte';
  import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte';
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
  import FocusPointModal from '$lib/components/artists/FocusPointModal.svelte';
  import { uploadMediaFile, fetchWithRetry } from '$lib/utils/uploadMedia.js';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  // ── 상태 ──────────────────────────────────
  let artists = $state([]);
  let roles = $state([]);
  let instruments = $state([]);
  let concerts = $state([]);
  let loading = $state(false);
  let editing = $state(null);       // 편집 중인 아티스트 객체
  let showForm = $state(false);  let roleFilter = $state(null);    // role 필터 (null = 전체)
  let groupMemberQuery = $state('');
  let concertQuery = $state('');
  // ── 폼 데이터 ──────────────────────────────
  let form = $state({
    name: '',
    name_en: '',
    headline: '',
    role_id: null,
    instrument_id: null,
    group_artist_ids: [],
    description: '',
    career: [],
    repertoire: [],
    videos: [],
    links: [],
    image_list: [],
    notice: '',
    sort_order: 0,
    image_media_id: null,
    image_focus_y: 50,
    concert_ids: [],
  });

  const LINK_ICONS = ['instagram', 'youtube', 'facebook', 'twitter', 'threads', 'blog', 'soundcloud', 'website'];

  // ── 미디어 선택 ────────────────────────────
  let mediaList = $state([]);
  let showMediaPicker = $state(false);
  let selectedImageUrl = $state('');
  let saving = $state(false);
  let saveError = $state('');
  let imageUploading = $state(false);
  let imageDragOver = $state(false);
  let subImageUploading = $state(false);
  let subImageDragOver = $state(false);
  let showSubMediaPicker = $state(false);
  let showFocusModal = $state(false);
  /** 아직 업로드 안 된 프로필 이미지 File 객체 (저장 시 업로드) */
  let pendingProfileFile = $state(null);
  /** 아직 업로드 안 된 서브 이미지 File 객체 목록 (저장 시 업로드) */
  let pendingSubImageFiles = $state([]);

  // ── 초기 로드 ──────────────────────────────
  $effect(() => {
    loadArtists();
    loadRoles();
    loadInstruments();
    loadConcerts();
  });

  async function loadArtists() {
    loading = true;
    try {
      const res = await fetch(`${API}/api/artists?active_only=false`);
      artists = await res.json();
    } catch (e) {
      console.error('Failed to load artists:', e);
    }
    loading = false;
  }

  async function loadRoles() {
    try {
      const res = await fetch(`${API}/api/roles`);
      roles = await res.json();
    } catch (e) {
      console.error('Failed to load roles:', e);
    }
  }

  async function loadConcerts() {
    try {
      const res = await fetch(`${API}/api/concerts?active_only=false`);
      concerts = await res.json();
    } catch (e) {
      console.error('Failed to load concerts:', e);
    }
  }

  async function loadInstruments() {
    try {
      const res = await fetch(`${API}/api/instruments`);
      instruments = await res.json();

      if (!editing && (form.instrument_id === null || form.instrument_id === undefined || form.instrument_id === '')) {
        form.instrument_id = getDefaultPianoInstrumentId();
      }
    } catch (e) {
      console.error('Failed to load instruments:', e);
    }
  }

  async function loadMedia() {
    try {
      const res = await fetch(`${API}/api/media?category=artist&limit=100`);
      const data = await res.json();
      mediaList = data.items || [];
    } catch (e) {
      console.error('Failed to load media:', e);
    }
  }

  // ── 폼 초기화 ──────────────────────────────
  function getDefaultPianoInstrumentId() {
    const piano = instruments.find(i => i.name_en?.toLowerCase() === 'piano');
    return piano ? piano.id : null;
  }

  function resetForm() {
    form = {
      name: '',
      name_en: '',
      headline: '',
      role_id: null,
      instrument_id: getDefaultPianoInstrumentId(),
      group_artist_ids: [],
      description: '',
      career: [],
      repertoire: [],
      videos: [], links: [], image_list: [], notice: '', sort_order: 0, image_media_id: null, image_focus_y: 50, concert_ids: [],
    };
    selectedImageUrl = '';
    pendingProfileFile = null;
    pendingSubImageFiles = [];
    editing = null;
    showForm = false;
    saving = false;
    saveError = '';
  }

  function openCreate() {
    resetForm();
    groupMemberQuery = '';
    concertQuery = '';
    showForm = true;
  }

  function openEdit(artist) {
    editing = artist;
    form = {
      name: artist.name || '',
      name_en: artist.name_en || '',
      headline: artist.headline || '',
      role_id: artist.role_id || null,
      instrument_id: artist.instrument_id ?? getDefaultPianoInstrumentId(),
      group_artist_ids: artist.group_artist_ids ? [...artist.group_artist_ids] : [],
      description: artist.description || '',
      career: artist.career ? artist.career.map(c => ({ ...c })) : [],
      repertoire: (artist.repertoire || [])
        .filter(s => Array.isArray(s.items))
        .map(s => ({ section: s.section || '', items: s.items.map(it => ({ title: it.title || '', composer: it.composer || '', featured: !!it.featured })) })),
      videos: artist.videos ? [...artist.videos] : [],
      links: artist.links ? artist.links.map(l => ({ ...l })) : [],
      image_list: artist.image_list ? [...artist.image_list] : [],
      notice: artist.notice || '',
      sort_order: artist.sort_order || 0,
      image_media_id: null,
      image_focus_y: artist.image_focus_y ?? 50,
      concert_ids: (artist.concerts || []).map(c => c.id),
    };
    selectedImageUrl = artist.image_url || '';
    groupMemberQuery = '';
    concertQuery = '';
    showForm = true;
  }

  // ── Career 관리 ────────────────────────────
  function addCareer() {
    form.career = [...form.career, { date: '', content: '' }];
  }

  function removeCareer(idx) {
    form.career = form.career.filter((_, i) => i !== idx);
  }

  // ── Repertoire 관리 ────────────────────────
  function addRepSection() {
    form.repertoire = [...form.repertoire, { section: '', items: [] }];
  }

  function removeRepSection(si) {
    form.repertoire = form.repertoire.filter((_, i) => i !== si);
  }

  function addRepItem(si) {
    form.repertoire[si].items = [...form.repertoire[si].items, { title: '', composer: '', featured: false }];
  }

  function removeRepItem(si, ii) {
    form.repertoire[si].items = form.repertoire[si].items.filter((_, i) => i !== ii);
  }

  // 드래그 앤 드롭: 섹션끼리, 같은 섹션 안의 곡끼리 순서 변경
  let repDrag = $state(null); // { type: 'section'|'item', si, ii }

  function moveInArray(arr, from, to) {
    const next = [...arr];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  function repDragStart(e, drag) {
    e.stopPropagation();
    repDrag = drag;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Firefox 필수
  }

  function repDrop(e, target) {
    e.stopPropagation();
    e.preventDefault();
    const d = repDrag;
    repDrag = null;
    if (!d || d.type !== target.type) return;
    if (d.type === 'section') {
      if (d.si !== target.si) form.repertoire = moveInArray(form.repertoire, d.si, target.si);
    } else if (d.si === target.si && d.ii !== target.ii) {
      form.repertoire[d.si].items = moveInArray(form.repertoire[d.si].items, d.ii, target.ii);
    }
  }

  function repDragOver(e, type) {
    if (repDrag?.type === type) e.preventDefault();
  }

  // ── Video 관리 ─────────────────────────────
  function addVideo() {
    form.videos = [...form.videos, { id: '', description: '' }];
  }

  function removeVideo(idx) {
    form.videos = form.videos.filter((_, i) => i !== idx);
  }

  // ── Link 관리 ──────────────────────────────
  function addLink() {
    form.links = [...form.links, { label: '', icon: LINK_ICONS[0], link: '' }];
  }

  function removeLink(idx) {
    form.links = form.links.filter((_, i) => i !== idx);
  }

  // ── Image List 관리 ────────────────────────
  function removeSubImage(idx) {
    const img = form.image_list[idx];
    if (!img.media_id) {
      pendingSubImageFiles = pendingSubImageFiles.filter(f => f._previewUrl !== img.url);
      URL.revokeObjectURL(img.url);
    }
    form.image_list = form.image_list.filter((_, i) => i !== idx);
  }

  async function handleSubImageDrop(e) {
    e.preventDefault();
    subImageDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    addSubImageLocally(file);
  }

  async function handleSubImageFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    addSubImageLocally(file);
    e.target.value = '';
  }

  function addSubImageLocally(file) {
    const previewUrl = URL.createObjectURL(file);
    file._previewUrl = previewUrl;
    pendingSubImageFiles = [...pendingSubImageFiles, file];
    form.image_list = [...form.image_list, { media_id: null, url: previewUrl }];
  }

  async function openSubMediaPicker() {
    await loadMedia();
    showSubMediaPicker = true;
  }

  function selectSubMedia(media) {
    if (!form.image_list.find(img => img.media_id === media.id)) {
      form.image_list = [...form.image_list, { media_id: media.id, url: media.thumb_url || media.url }];
    }
    showSubMediaPicker = false;
  }

  /** 저장 시 호출: pending 서브 이미지를 실제 업로드하고 image_list 갱신 */
  async function flushPendingSubImages() {
    if (pendingSubImageFiles.length === 0) return;
    for (const file of pendingSubImageFiles) {
      const media = await uploadMediaFile(API, file, 'artist');
      form.image_list = form.image_list.map(img =>
        img.url === file._previewUrl ? { media_id: media.id, url: media.url } : img
      );
      URL.revokeObjectURL(file._previewUrl);
    }
    pendingSubImageFiles = [];
  }

  // ── Concert 토글 ───────────────────────────
  function toggleConcert(concertId) {
    if (form.concert_ids.includes(concertId)) {
      form.concert_ids = form.concert_ids.filter(id => id !== concertId);
    } else {
      form.concert_ids = [...form.concert_ids, concertId];
    }
  }

  function isGroupRoleSelected() {
    const roleId = Number(form.role_id);
    const role = roles.find(r => Number(r.id) === roleId);
    return role?.name === 'group';
  }

  function toggleGroupArtist(artistId) {
    if (form.group_artist_ids.includes(artistId)) {
      form.group_artist_ids = form.group_artist_ids.filter(id => id !== artistId);
    } else {
      form.group_artist_ids = [...form.group_artist_ids, artistId];
    }
  }

  function getGroupMemberOptions() {
    const editingId = editing?.id;
    return artists.filter(a => a.id !== editingId);
  }

  function getFilteredGroupMemberOptions() {
    const query = groupMemberQuery.trim().toLowerCase();
    if (!query) return getGroupMemberOptions();

    return getGroupMemberOptions().filter(option => {
      const name = String(option.name || '').toLowerCase();
      const role = String(option.role_name || getRoleName(option.role_id) || '').toLowerCase();
      return name.includes(query) || role.includes(query);
    });
  }

  function getFilteredConcertOptions() {
    const query = concertQuery.trim().toLowerCase();
    if (!query) return concerts;

    return concerts.filter(concert => {
      const title = String(concert.title || '').toLowerCase();
      const date = String(concert.date || '').toLowerCase();
      return title.includes(query) || date.includes(query);
    });
  }

  // ── 미디어 선택 ────────────────────────────
  async function openMediaPicker() {
    await loadMedia();
    showMediaPicker = true;
  }

  function selectMedia(media) {
    form.image_media_id = media.id;
    selectedImageUrl = media.thumb_url || media.url;
    showMediaPicker = false;
  }

  // ── 드래그 앤 드롭 이미지 업로드 ──────────
  async function handleImageDrop(e) {
    e.preventDefault();
    imageDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setProfileImageLocally(file);
  }

  async function handleImageFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageLocally(file);
    e.target.value = '';
  }

  function setProfileImageLocally(file) {
    if (pendingProfileFile?._previewUrl) URL.revokeObjectURL(pendingProfileFile._previewUrl);
    const previewUrl = URL.createObjectURL(file);
    file._previewUrl = previewUrl;
    pendingProfileFile = file;
    form.image_media_id = null;
    selectedImageUrl = previewUrl;
  }

  /** 저장 시 호출: pending 프로필 이미지를 실제 업로드 */
  async function flushPendingProfileImage() {
    if (!pendingProfileFile) return;
    const media = await uploadMediaFile(API, pendingProfileFile, 'artist');
    form.image_media_id = media.id;
    selectedImageUrl = media.url;
    URL.revokeObjectURL(pendingProfileFile._previewUrl);
    pendingProfileFile = null;
  }

  // ── 저장 ───────────────────────────────────
  async function saveArtist() {
    if (saving) return;
    saving = true;
    saveError = '';

    try {
      // 1. pending 이미지 먼저 업로드
      await flushPendingProfileImage();
      await flushPendingSubImages();
    } catch (e) {
      saving = false;
      saveError = '이미지 업로드 실패: ' + (e?.message || e);
      return;
    }

    const formData = new FormData();
    formData.append('name', form.name);
    if (form.name_en) formData.append('name_en', form.name_en);
    if (form.headline) formData.append('headline', form.headline);
    if (form.role_id) formData.append('role_id', String(form.role_id));
    if (form.instrument_id !== null && form.instrument_id !== undefined && form.instrument_id !== '') {
      formData.append('instrument_id', String(form.instrument_id));
    }
    if (form.description) formData.append('description', form.description);
    if (form.career.length > 0) formData.append('career', JSON.stringify(form.career));
    // 항상 전송: 빈 배열이어야 전체 삭제가 서버에 반영됨
    formData.append('repertoire', JSON.stringify(
      form.repertoire
        .map(s => ({
          section: s.section.trim(),
          items: s.items
            .map(it => ({ title: it.title.trim(), composer: it.composer.trim(), featured: !!it.featured }))
            .filter(it => it.title),
        }))
        .filter(s => s.section && s.items.length > 0)
    ));
    if (form.videos.length > 0) formData.append('videos', JSON.stringify(form.videos));
    if (form.links.length > 0) formData.append('links', JSON.stringify(form.links));
    if (form.image_list.length > 0) formData.append('image_list', JSON.stringify(form.image_list));
    if (form.notice) formData.append('notice', form.notice);
    formData.append('sort_order', String(form.sort_order));
    if (form.image_media_id) formData.append('image_media_id', String(form.image_media_id));
    formData.append('image_focus_y', String(form.image_focus_y ?? 50));
    const safeGroupArtistIds = isGroupRoleSelected()
      ? (form.group_artist_ids || []).filter(id => !editing || id !== editing.id)
      : [];
    formData.append('group_artist_ids', JSON.stringify(safeGroupArtistIds));
    if (form.concert_ids.length > 0) formData.append('concert_ids', JSON.stringify(form.concert_ids));

    try {
      const url = editing
        ? `${API}/api/artists/${editing.id}`
        : `${API}/api/artists`;
      const method = editing ? 'PUT' : 'POST';

      await fetchWithRetry(url, { method, body: formData });

      resetForm();
      await loadArtists();
    } catch (e) {
      saving = false;
      saveError = '저장 실패: ' + (e?.message || e);
    }
  }

  async function deleteArtist(artist) {
    if (!confirm(`"${artist.name}" 아티스트를 삭제하시겠습니까?`)) return;
    try {
      await fetch(`${API}/api/artists/${artist.id}`, { method: 'DELETE' });
      await loadArtists();
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  }

  function getRoleName(roleId) {
    const role = roles.find(r => r.id === roleId);
    return role ? role.label || role.name : '-';
  }

  // ── 필터링 ──────────────────────────────
  let filteredArtists = $derived(
    roleFilter === null 
      ? artists 
      : artists.filter(a => a.role_id === roleFilter)
  );
</script>

<svelte:head>
  <title>아티스트 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>아티스트 관리</h1>
    </div>
    <div class="header-right">
      <label class="filter-label">
        역할 필터:
        <select bind:value={roleFilter} class="filter-select">
          <option value={null}>전체 ({artists.length})</option>
          {#each roles as role}
            <option value={role.id}>
              {role.label || role.name} ({artists.filter(a => a.role_id === role.id).length})
            </option>
          {/each}
        </select>
      </label>
      <Button onclick={openCreate}>+ 아티스트 추가</Button>
    </div>
  </header>

  <!-- ── 아티스트 목록 ────────────────────── -->
  {#if loading}
    <p class="loading">로딩 중...</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>순서</th>
            <th>이미지</th>
            <th>이름</th>
            <th>역할</th>
            <th>상태</th>
            <th>콘서트</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredArtists as artist}
            <tr>
              <td>{artist.sort_order}</td>
              <td>
                {#if artist.thumb_url || artist.image_url}
                  <ResponsiveImage src={artist.thumb_url || artist.image_url} alt={artist.name} class="thumb" sizes="48px" />
                {:else}
                  <div class="thumb-placeholder"></div>
                {/if}
              </td>
              <td class="name-cell">{artist.name}</td>
              <td>{getRoleName(artist.role_id)}</td>
              <td>
                <span class="badge" class:active={artist.is_active}>
                  {artist.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td>{(artist.concerts || []).length}개</td>
              <td>
                <div class="actions">
                  <Button variant="secondary" class="sm" onclick={() => openEdit(artist)}>편집</Button>
                  <Button variant="secondary" class="sm danger" onclick={() => deleteArtist(artist)}>삭제</Button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ── 편집 / 생성 폼 ───────────────────── -->
  <SlidePanel
    open={showForm}
    title={editing ? '아티스트 편집' : '새 아티스트'}
    sections={[{ id: 'info', label: '기본 정보' }, { id: 'images', label: '이미지' }, { id: 'inst', label: '악기와 역할' }, { id: 'concerts', label: '연결된 콘서트' }]}
    snapshot={() => [form, selectedImageUrl]}
    {saving}
    error={saveError}
    canSave={!(!form.name)}
    saveLabel={editing ? '수정' : '등록'}
    suspended={showMediaPicker || showSubMediaPicker || showFocusModal}
    onsave={saveArtist}
    onclose={resetForm}
  >
<div class="form-section" data-section="info">
          <h3>기본 정보</h3>
          <label>
            이름 (한글) *
            <input type="text" bind:value={form.name} placeholder="홍길동" required />
          </label>
          <label>
            이름 (영어)
            <input type="text" bind:value={form.name_en} placeholder="Hong Gildong" />
          </label>
          <label>
            한 줄 소개 (Headline)
            <input type="text" bind:value={form.headline} placeholder="피아니스트, 작곡가" maxlength="200" />
          </label>
          <label>
            역할
            <select bind:value={form.role_id}>
              <option value={null}>선택 안 함</option>
              {#each roles as role}
                <option value={role.id}>{role.label || role.name}</option>
              {/each}
            </select>
          </label>

          <label>
            악기
            <select bind:value={form.instrument_id}>
              {#if instruments.length === 0}
                <option value={null}>악기 로딩 중...</option>
              {:else}
                {#each instruments as instrument}
                  <option value={instrument.id}>
                    {instrument.name_ko || instrument.name_en}
                    {instrument.abbreviation ? ` (${instrument.abbreviation})` : ''}
                  </option>
                {/each}
              {/if}
            </select>
          </label>

          {#if isGroupRoleSelected()}
            <label>
              그룹 멤버 선택
              <div class="search-row">
                <span>검색</span>
                <input
                  class="inline-search-input"
                  type="text"
                  bind:value={groupMemberQuery}
                  placeholder="이름 또는 역할로 검색"
                />
              </div>
              <div class="concert-list" style="margin-top:0.4rem;">
                {#each getFilteredGroupMemberOptions() as option}
                  <label class="concert-check">
                    <input
                      type="checkbox"
                      checked={form.group_artist_ids.includes(option.id)}
                      onchange={() => toggleGroupArtist(option.id)}
                    />
                    {option.name} ({option.role_name || getRoleName(option.role_id) || '-'})
                  </label>
                {/each}
                {#if getFilteredGroupMemberOptions().length === 0}
                  <p class="empty">검색 결과가 없습니다.</p>
                {/if}
              </div>
              <small style="display:block;margin-top:0.35rem;color:var(--color-green-700);">
                artist / performer / group_artist 모두 추가할 수 있습니다.
              </small>
            </label>
          {/if}

          <label>
            정렬 순서
            <input type="number" bind:value={form.sort_order} />
          </label>
        </div>

        <!-- 프로필 이미지 -->
        <div class="form-section" data-section="images">
          <h3>프로필 이미지</h3>
          <div
            class="drop-zone"
            class:drag-over={imageDragOver}
            class:has-image={!!selectedImageUrl}
            ondrop={handleImageDrop}
            ondragover={(e) => { e.preventDefault(); imageDragOver = true; }}
            ondragleave={() => imageDragOver = false}
            role="button"
            tabindex="0"
          >
            {#if imageUploading}
              <p class="drop-text">업로드 중...</p>
            {:else if selectedImageUrl}
              <ResponsiveImage src={selectedImageUrl} alt="preview" class="preview-img" sizes="160px" />
              {#if pendingProfileFile}
                <p class="drop-hint pending-hint">저장 시 업로드됩니다</p>
              {:else}
                <p class="drop-hint">다른 이미지를 드래그하여 교체</p>
              {/if}
            {:else}
              <p class="drop-text">이미지를 드래그하거나 클릭하여 선택</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
            <input
              type="file"
              accept="image/*"
              onchange={handleImageFileSelect}
              class="file-input"
            />
          </div>
          <div class="profile-image-actions">
            <Button variant="secondary" class="sm" type="button" onclick={openMediaPicker}>
              미디어 라이브러리에서 선택
            </Button>
            <Button variant="secondary" class="sm" type="button" disabled={!selectedImageUrl} onclick={() => (showFocusModal = true)}>
              가로 배너 위치 설정 ({form.image_focus_y ?? 50}%)
            </Button>
          </div>
        </div>

        <!-- 소개 -->
        <div class="form-section" data-section="inst">
          <h3>소개 (Description)</h3>
          <textarea bind:value={form.description} rows="4" placeholder="아티스트 소개"></textarea>
        </div>

        <!-- 경력 -->
        <div class="form-section">
          <h3>경력 (Career)</h3>
          {#each form.career as item, i}
            <div class="career-row">
              <input type="text" bind:value={item.date} placeholder="YYYY.MM" class="career-date" />
              <input type="text" bind:value={item.content} placeholder="경력 내용" />
              <Button variant="secondary" class="sm danger" onclick={() => removeCareer(i)}>×</Button>
            </div>
          {/each}
          <Button variant="secondary" class="sm" type="button" onclick={addCareer}>+ 경력 추가</Button>
        </div>

        <!-- 레퍼토리 -->
        <div class="form-section">
          <h3>레퍼토리 (Repertoire)</h3>
          <p class="rep-hint">☰ 를 끌어서 순서 변경 · ★ 체크 = 대표곡</p>
          {#each form.repertoire as sec, si (sec)}
            <div
              class="rep-section"
              role="group"
              ondragover={(e) => repDragOver(e, 'section')}
              ondrop={(e) => repDrop(e, { type: 'section', si })}
            >
              <div class="rep-section-head">
                <span
                  class="rep-handle"
                  role="button"
                  tabindex="-1"
                  aria-label="섹션 순서 변경"
                  draggable="true"
                  ondragstart={(e) => repDragStart(e, { type: 'section', si })}
                  ondragend={() => (repDrag = null)}
                >☰</span>
                <input type="text" bind:value={sec.section} placeholder="섹션명 (Solo, Ensemble, Concerto ...)" />
                <Button variant="secondary" class="sm danger" type="button" onclick={() => removeRepSection(si)}>×</Button>
              </div>

              {#each sec.items as item, ii (item)}
                <div
                  class="rep-row"
                  role="group"
                  ondragover={(e) => repDragOver(e, 'item')}
                  ondrop={(e) => repDrop(e, { type: 'item', si, ii })}
                >
                  <span
                    class="rep-handle"
                    role="button"
                    tabindex="-1"
                    aria-label="곡 순서 변경"
                    draggable="true"
                    ondragstart={(e) => repDragStart(e, { type: 'item', si, ii })}
                    ondragend={() => (repDrag = null)}
                  >☰</span>
                  <input type="text" bind:value={item.composer} placeholder="작곡가" class="rep-composer-input" />
                  <input type="text" bind:value={item.title} placeholder="곡명" />
                  <label class="rep-featured" title="대표곡">
                    <input type="checkbox" bind:checked={item.featured} /> ★
                  </label>
                  <Button variant="secondary" class="sm danger" type="button" onclick={() => removeRepItem(si, ii)}>×</Button>
                </div>
              {/each}
              <Button variant="secondary" class="sm" type="button" onclick={() => addRepItem(si)}>+ 곡 추가</Button>
            </div>
          {/each}
          <Button variant="secondary" class="sm" type="button" onclick={addRepSection}>+ 섹션 추가</Button>
        </div>

        <!-- 공지 -->
        <div class="form-section">
          <h3>공지 (Notice)</h3>
          <textarea bind:value={form.notice} rows="3" placeholder="공지사항"></textarea>
        </div>

        <!-- YouTube 동영상 -->
        <div class="form-section">
          <h3>동영상 (Video)</h3>
          {#each form.videos as video, i}
            <div class="video-row">
              <input type="text" bind:value={video.id} placeholder="YouTube ID 또는 영상 URL" />
              <input type="text" bind:value={video.description} placeholder="설명" />
              <Button variant="secondary" class="sm danger" onclick={() => removeVideo(i)}>×</Button>
            </div>
          {/each}
          <Button variant="secondary" class="sm" type="button" onclick={addVideo}>+ 동영상 추가</Button>
        </div>

        <!-- 링크 (SNS 등) -->
        <div class="form-section">
          <h3>링크 (Links)</h3>
          {#each form.links as link, i}
            <div class="link-row">
              <select bind:value={link.icon}>
                {#each LINK_ICONS as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
              <input type="text" bind:value={link.label} placeholder="표시 이름 (예: Instagram)" />
              <input type="text" bind:value={link.link} placeholder="https://..." />
              <Button variant="secondary" class="sm danger" onclick={() => removeLink(i)}>×</Button>
            </div>
          {/each}
          <Button variant="secondary" class="sm" type="button" onclick={addLink}>+ 링크 추가</Button>
        </div>

        <!-- 서브 이미지 목록 -->
        <div class="form-section">
          <h3>서브 이미지 목록 (Image List)</h3>
          <p style="font-size: 0.85rem; color: var(--color-green-700); margin-bottom: 0.75rem;">프로필 이미지 외 추가 이미지를 등록할 수 있습니다.</p>
          
          {#if form.image_list.length > 0}
            <div class="sub-image-list">
              {#each form.image_list as img, i}
                <div class="sub-image-item">
                  <ResponsiveImage src={img.url} alt="서브 이미지 {i + 1}" sizes="120px" />
                  <Button variant="secondary" class="sm danger" onclick={() => removeSubImage(i)}>×</Button>
                </div>
              {/each}
            </div>
          {/if}

          <div
            class="drop-zone sub-drop"
            class:drag-over={subImageDragOver}
            ondrop={handleSubImageDrop}
            ondragover={(e) => { e.preventDefault(); subImageDragOver = true; }}
            ondragleave={() => subImageDragOver = false}
            role="button"
            tabindex="0"
          >
            {#if subImageUploading}
              <p class="drop-text">업로드 중...</p>
            {:else}
              <p class="drop-text">+ 이미지 추가 (드래그 또는 클릭)</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
            <input
              type="file"
              accept="image/*"
              onchange={handleSubImageFileSelect}
              class="file-input"
            />
          </div>
          <Button variant="secondary" class="sm" type="button" style="margin-top:0.5rem" onclick={openSubMediaPicker}>
            미디어에서 선택
          </Button>
        </div>

        <!-- 콘서트 연결 -->
        <div class="form-section" data-section="concerts">
          <h3>연결된 콘서트</h3>
          <div class="search-row">
            <span>검색</span>
            <input
              class="inline-search-input"
              type="text"
              bind:value={concertQuery}
              placeholder="콘서트명 또는 날짜로 검색"
            />
          </div>
          <div class="concert-list">
            {#each getFilteredConcertOptions() as concert}
              <label class="concert-check">
                <input
                  type="checkbox"
                  checked={form.concert_ids.includes(concert.id)}
                  onchange={() => toggleConcert(concert.id)}
                />
                {concert.title} ({concert.date || '날짜 미정'})
              </label>
            {/each}
            {#if getFilteredConcertOptions().length === 0}
              <p class="empty">검색 결과가 없습니다.</p>
            {/if}
          </div>
        </div>
  </SlidePanel>
  

  <!-- ── 가로 배너 위치 설정 모달 ──────────── -->
  {#if showFocusModal && selectedImageUrl}
    <FocusPointModal
      imageUrl={selectedImageUrl}
      initialFocusY={form.image_focus_y ?? 50}
      onSave={(y) => (form.image_focus_y = y)}
      onClose={() => (showFocusModal = false)}
    />
  {/if}

  <!-- ── 서브 이미지 미디어 피커 모달 ──────── -->
  {#if showSubMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showSubMediaPicker = false)}>✕</button>
        <h2>서브 이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button class="media-item" onclick={() => selectSubMedia(media)}>
              <ResponsiveImage src={media.thumb_url || media.url} alt={media.alt_text || media.original_filename} sizes="120px" />
              <span class="media-name">{media.original_filename}</span>
            </button>
          {/each}
          {#if mediaList.length === 0}
            <p class="empty">업로드된 아티스트 이미지가 없습니다.</p>
          {/if}
        </div>
        <Button variant="secondary" onclick={() => (showSubMediaPicker = false)}>닫기</Button>
      </div>
    </div>
  {/if}

  <!-- ── 미디어 피커 모달 ──────────────────── -->
  {#if showMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showMediaPicker = false)}>✕</button>
        <h2>이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button class="media-item" onclick={() => selectMedia(media)}>
              <ResponsiveImage src={media.thumb_url || media.url} alt={media.alt_text || media.original_filename} sizes="120px" />
              <span class="media-name">{media.original_filename}</span>
            </button>
          {/each}
          {#if mediaList.length === 0}
            <p class="empty">업로드된 아티스트 이미지가 없습니다.</p>
          {/if}
        </div>
        <Button variant="secondary" onclick={() => (showMediaPicker = false)}>닫기</Button>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
.rep-hint { font-size: 0.8rem; color: var(--color-green-700); margin: 0 0 0.5rem; }

.rep-section {
    border: 1px solid var(--color-green-200);
    padding: 0.6rem;
    margin-bottom: 0.75rem;
  }

.rep-section-head,
  .rep-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    input[type='text'] { flex: 1; min-width: 0; }
  }

.rep-row .rep-composer-input { flex: 0 0 160px; }

.rep-handle { cursor: grab; color: var(--color-green-700); user-select: none; padding: 0 0.25rem; }

.rep-featured { display: inline-flex; align-items: center; gap: 0.15rem; white-space: nowrap; cursor: pointer; }
</style>
