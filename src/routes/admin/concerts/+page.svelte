<script>
  import Button from '$lib/components/ui/Button.svelte';
  import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte';
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
  import { uploadMediaFile, fetchWithRetry } from '$lib/utils/uploadMedia.js';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  // ── 상태 ──────────────────────────────────
  let concerts = $state([]);
  let artists = $state([]);
  let loading = $state(false);
  let editing = $state(null);
  let showForm = $state(false);

  // ── 폼 데이터 ──────────────────────────────
  let form = $state({
    title: '',
    date: '',
    time: '',
    end_time: '',
    brief_description: '',
    reserve_link: '',
    cost: '',
    refund_policy: '',
    location: '',
    location_data: null,
    poster_media_id: null,
    banner_image_media_id: null,
    program: [],
    image_list: [],
    artist_ids: [],
    is_active: true,
  });

  // ── 미디어 선택 ────────────────────────────
  let mediaList = $state([]);
  let showMediaPicker = $state(false);
  let showSubMediaPicker = $state(false);
  let showBannerMediaPicker = $state(false);
  let selectedPosterUrl = $state('');
  let selectedBannerUrl = $state('');
  let saving = $state(false);
  let saveError = $state('');

  // ── 드래그 앤 드롭 ────────────────────────────
  let imageUploading = $state(false);
  let imageDragOver = $state(false);
  /** 아직 업로드 안 된 포스터 File 객체 (저장 시 업로드) */
  let pendingPosterFile = $state(null);
  // ── 배너 이미지 ────────────────────────────
  let bannerDragOver = $state(false);
  /** 아직 업로드 안 된 배너 File 객체 (저장 시 업로드) */
  let pendingBannerFile = $state(null);
  // ── 서브 이미지 ────────────────────────────
  let subImageUploading = $state(false);
  let subImageDragOver = $state(false);
  /** 아직 업로드 안 된 서브 이미지 File 객체 목록 (저장 시 업로드) */
  let pendingSubImageFiles = $state([]);
  // ── 장소 검색 ────────────────────────────
  let placeQuery = $state('');
  let placeResults = $state([]);
  let placeSearching = $state(false);
  let showPlaceResults = $state(false);
  // ── 초기 로드 ──────────────────────────────
  $effect(() => {
    loadConcerts();
    loadArtists();
  });

  async function loadConcerts() {
    loading = true;
    try {
      // 리스트 로딩 속도를 높이기 위해 사진/세부정보를 제외한 요약본만 비동기로 가져옴
      const res = await fetch(`${API}/api/concerts?active_only=false&summary=true`);
      concerts = await res.json();
    } catch (e) {
      console.error('Failed to load concerts:', e);
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
      title: '', date: '', time: '', end_time: '', brief_description: '', reserve_link: '', cost: '', refund_policy: '',
      location: '', location_data: null, poster_media_id: null, banner_image_media_id: null, program: [], image_list: [], artist_ids: [], is_active: true,
    };
    selectedPosterUrl = '';
    selectedBannerUrl = '';
    pendingPosterFile = null;
    pendingBannerFile = null;
    pendingSubImageFiles = [];
    placeQuery = '';
    placeResults = [];
    showPlaceResults = false;
    editing = null;
    showForm = false;
    saving = false;
    saveError = '';
  }

  function openCreate() {
    resetForm();
    showForm = true;
  }

  async function openEdit(concertSummary) {
    loading = true;
    let concert = concertSummary;
    try {
      const res = await fetch(`${API}/api/concerts/${concertSummary.id}`);
      if (res.ok) {
        concert = await res.json();
      }
    } catch (e) {
      console.error('상세 정보 로드 실패:', e);
    }
    loading = false;

    editing = concert;
    // date 분리: "2026-03-15 19:30" → date="2026-03-15", time="19:30"
    let dateStr = '';
    let timeStr = '';
    if (concert.date) {
      const parts = concert.date.split(' ');
      dateStr = parts[0] || '';
      timeStr = parts[1] || '';
    }
    form = {
      title: concert.title || '',
      date: dateStr,
      time: timeStr,
      end_time: concert.end_time || '',
      brief_description: concert.brief_description || '',
      reserve_link: concert.reserve_link || '',
      cost: concert.cost || '',
      refund_policy: concert.refund_policy || '',
      location: concert.location || '',
      location_data: concert.location_data || null,
      poster_media_id: null,
      banner_image_media_id: null,
      program: migrateOldProgram(concert.program || []),
      image_list: concert.image_list ? [...concert.image_list] : [],
      artist_ids: (concert.artists || []).map(a => a.id),
      is_active: concert.is_active ?? true,
    };
    selectedPosterUrl = concert.poster_url || '';
    selectedBannerUrl = concert.banner_image_url || '';
    placeQuery = '';
    placeResults = [];
    showPlaceResults = false;
    _syncPlayerState();
    showForm = true;
  }

  // ── Program 관리 (섹션 기반) ────────────────
  // form.program = [{ section: "1부", items: [{ composer, title: ["곡1","곡2"], player_ids }] }]

  // 연주자 검색 상태: [secIdx][itemIdx]
  let programPlayerQuery = $state([]);   // programPlayerQuery[secIdx][itemIdx]
  let programPlayerOpen  = $state([]);   // programPlayerOpen[secIdx][itemIdx]

  function _syncPlayerState() {
    programPlayerQuery = form.program.map(sec =>
      (sec.items || []).map(() => '')
    );
    programPlayerOpen = form.program.map(sec =>
      (sec.items || []).map(() => false)
    );
  }

  function addSection() {
    form.program = [...form.program, { section: '', items: [] }];
    _syncPlayerState();
  }

  function removeSection(sIdx) {
    form.program = form.program.filter((_, i) => i !== sIdx);
    _syncPlayerState();
  }

  function addItem(sIdx) {
    const sec = form.program[sIdx];
    form.program[sIdx] = { ...sec, items: [...(sec.items || []), { composer: '', title: [''], player_ids: [] }] };
    _syncPlayerState();
  }

  function removeItem(sIdx, iIdx) {
    const sec = form.program[sIdx];
    form.program[sIdx] = { ...sec, items: sec.items.filter((_, i) => i !== iIdx) };
    _syncPlayerState();
  }

  function addTitleLine(sIdx, iIdx) {
    const item = form.program[sIdx].items[iIdx];
    const newTitles = [...(item.title || ['']), ''];
    form.program[sIdx].items[iIdx] = { ...item, title: newTitles };
    form.program = [...form.program]; // trigger reactivity
  }

  function removeTitleLine(sIdx, iIdx, tIdx) {
    const item = form.program[sIdx].items[iIdx];
    const newTitles = item.title.filter((_, i) => i !== tIdx);
    form.program[sIdx].items[iIdx] = { ...item, title: newTitles.length ? newTitles : [''] };
    form.program = [...form.program];
  }

  function addProgramPlayer(sIdx, iIdx, artistId) {
    const item = form.program[sIdx].items[iIdx];
    if (!(item.player_ids || []).includes(artistId)) {
      form.program[sIdx].items[iIdx] = { ...item, player_ids: [...(item.player_ids || []), artistId] };
    }
    if (!form.artist_ids.includes(artistId)) {
      form.artist_ids = [...form.artist_ids, artistId];
    }
    programPlayerQuery[sIdx][iIdx] = '';
    programPlayerOpen[sIdx][iIdx]  = false;
    form.program = [...form.program];
  }

  function removeProgramPlayer(sIdx, iIdx, artistId) {
    const item = form.program[sIdx].items[iIdx];
    form.program[sIdx].items[iIdx] = { ...item, player_ids: (item.player_ids || []).filter(id => id !== artistId) };
    form.program = [...form.program];
  }

  function getProgramPlayerResults(sIdx, iIdx) {
    const q = (programPlayerQuery[sIdx]?.[iIdx] || '').trim().toLowerCase();
    if (!q) return [];
    const taken = form.program[sIdx]?.items[iIdx]?.player_ids || [];
    return artists.filter(a =>
      !taken.includes(a.id) &&
      ((a.name || '').toLowerCase().includes(q) || (a.name_en || '').toLowerCase().includes(q))
    );
  }

  /** 구형(flat 배열) → 새 섹션 구조로 마이그레이션 */
  function migrateOldProgram(oldProgram) {
    if (!oldProgram || oldProgram.length === 0) return [];
    // 이미 새 형식인지 확인
    if (oldProgram[0] && 'section' in oldProgram[0]) return oldProgram;

    // 구형: composer만 있고 title 없는 것을 섹션 헤더로 간주
    const sections = [];
    let current = null;
    for (const p of oldProgram) {
      if (!p.title || p.title === 'Intermission') continue; // Intermission 스킵
      if (!p.title && p.composer) {
        // 섹션 헤더
        current = { section: p.composer, items: [] };
        sections.push(current);
      } else {
        if (!current) { current = { section: '', items: [] }; sections.push(current); }
        current.items.push({
          composer: p.composer || '',
          title: [p.title || ''],
          player_ids: p.player_ids || (p.player_id ? [p.player_id] : []),
        });
      }
    }
    return sections.length ? sections : [{ section: '', items: oldProgram.map(p => ({
      composer: p.composer || '',
      title: [p.title || ''],
      player_ids: p.player_ids || [],
    })) }];
  }

  // ── 미디어 선택 ────────────────────────────
  async function openMediaPicker() {
    await loadMedia();
    showMediaPicker = true;
  }

  function selectMedia(media) {
    form.poster_media_id = media.id;
    selectedPosterUrl = media.thumb_url || media.url;
    showMediaPicker = false;
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

  // ── 서브 이미지 관리 ───────────────────────
  function removeSubImage(idx) {
    // pending 이미지인 경우 (media_id가 없고 pending 배열에 있는 경우)
    const img = form.image_list[idx];
    if (!img.media_id) {
      // pendingSubImageFiles에서도 제거 (url로 매칭)
      pendingSubImageFiles = pendingSubImageFiles.filter(f => f._previewUrl !== img.url);
      URL.revokeObjectURL(img.url);
    }
    form.image_list = form.image_list.filter((_, i) => i !== idx);
  }

  function handleSubImageDrop(e) {
    e.preventDefault();
    subImageDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) addSubImageLocally(file);
  }

  function handleSubImageFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) addSubImageLocally(file);
    e.target.value = '';
  }

  function addSubImageLocally(file) {
    const previewUrl = URL.createObjectURL(file);
    file._previewUrl = previewUrl;
    pendingSubImageFiles = [...pendingSubImageFiles, file];
    // image_list에 미리보기 항목 추가 (media_id 없음 → 저장 시 업로드)
    form.image_list = [...form.image_list, { media_id: null, url: previewUrl }];
  }

  /** 저장 시 호출: pending 서브 이미지를 실제 업로드하고 image_list 갱신 */
  async function flushPendingSubImages() {
    if (pendingSubImageFiles.length === 0) return;
    
    // 비동기 병렬 업로드 (Promise.all)
    const uploadPromises = pendingSubImageFiles.map(async (file) => {
      const media = await uploadMediaFile(API, file, 'concert');
      return { file, media };
    });

    const results = await Promise.all(uploadPromises);

    // previewUrl → 실제 url + media_id 교체
    for (const { file, media } of results) {
      form.image_list = form.image_list.map(img =>
        img.url === file._previewUrl ? { media_id: media.id, url: media.url, thumb_url: media.thumb_url } : img
      );
      URL.revokeObjectURL(file._previewUrl);
    }
    
    pendingSubImageFiles = [];
  }

  // ── 드래그 앤 드롭 업로드 ──────────────────────
  function handleImageDrop(e) {
    e.preventDefault();
    imageDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) setPosterLocally(file);
  }

  function handleImageFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) setPosterLocally(file);
    e.target.value = '';
  }

  function setPosterLocally(file) {
    // 기존 pending 파일이 있으면 해제
    if (pendingPosterFile?._previewUrl) URL.revokeObjectURL(pendingPosterFile._previewUrl);
    const previewUrl = URL.createObjectURL(file);
    file._previewUrl = previewUrl;
    pendingPosterFile = file;
    // form.poster_media_id는 저장 시 채워짐
    form.poster_media_id = null;
    selectedPosterUrl = previewUrl;
  }

  /** 저장 시 호출: pending 포스터를 실제 업로드 */
  async function flushPendingPoster() {
    if (!pendingPosterFile) return;
    const media = await uploadMediaFile(API, pendingPosterFile, 'concert');
    form.poster_media_id = media.id;
    selectedPosterUrl = media.thumb_url || media.url;
    URL.revokeObjectURL(pendingPosterFile._previewUrl);
    pendingPosterFile = null;
  }

  // ── 배너 이미지 드래그 앤 드롭 ─────────────────
  function handleBannerDrop(e) {
    e.preventDefault();
    bannerDragOver = false;
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

  async function openBannerMediaPicker() {
    await loadMedia();
    showBannerMediaPicker = true;
  }

  function selectBannerMedia(media) {
    form.banner_image_media_id = media.id;
    selectedBannerUrl = media.thumb_url || media.url;
    showBannerMediaPicker = false;
  }

  /** 저장 시 호출: pending 배너 이미지를 실제 업로드 */
  async function flushPendingBanner() {
    if (!pendingBannerFile) return;
    const media = await uploadMediaFile(API, pendingBannerFile, 'concert');
    form.banner_image_media_id = media.id;
    selectedBannerUrl = media.thumb_url || media.url;
    URL.revokeObjectURL(pendingBannerFile._previewUrl);
    pendingBannerFile = null;
  }

  // ── 저장 ───────────────────────────────────
  async function saveConcert() {
    if (saving) return;
    saving = true;
    saveError = '';

    try {
      // 1. pending 이미지 먼저 병렬로 비동기 업로드
      await Promise.all([
        flushPendingPoster(),
        flushPendingBanner(),
        flushPendingSubImages()
      ]);
    } catch (e) {
      saving = false;
      saveError = '이미지 업로드 실패: ' + (e?.message || e);
      return;
    }

    const combinedDate = form.time
      ? `${form.date} ${form.time}`
      : form.date;

    const formData = new FormData();
    formData.append('title', form.title);
    if (combinedDate) formData.append('date', combinedDate);
    formData.append('end_time', form.end_time || '');
    if (form.brief_description) formData.append('brief_description', form.brief_description);
    formData.append('reserve_link', form.reserve_link || '');
    formData.append('cost', form.cost || '');
    formData.append('refund_policy', form.refund_policy || '');
    // 빈 값도 항상 전송 — 지운 경우 DB에서도 지워지도록
    formData.append('location', form.location || '');
    formData.append('location_data', form.location_data ? JSON.stringify(form.location_data) : '');
    if (form.poster_media_id) formData.append('poster_media_id', String(form.poster_media_id));
    if (form.banner_image_media_id) formData.append('banner_image_media_id', String(form.banner_image_media_id));
    if (form.program.length > 0) {
      const programPayload = form.program.map(sec => ({
        section: sec.section || '',
        items: (sec.items || []).map(({ composer, title, player_ids }) => ({
          composer: composer || '',
          title: Array.isArray(title)
            ? title.map(t => String(t ?? '')).filter(t => t.trim())
            : [String(title ?? '')],
          player_ids: player_ids || [],
        })),
      }));
      formData.append('program', JSON.stringify(programPayload));
    }
    formData.append('image_list', JSON.stringify(form.image_list));
    formData.append('artist_ids', JSON.stringify(form.artist_ids));
    formData.append('is_active', String(form.is_active));

    try {
      const url = editing
        ? `${API}/api/concerts/${editing.id}`
        : `${API}/api/concerts`;
      const method = editing ? 'PUT' : 'POST';

      await fetchWithRetry(url, { method, body: formData });

      resetForm();
      await loadConcerts();
    } catch (e) {
      saving = false;
      saveError = '저장 실패: ' + (e?.message || e);
    }
  }

  async function deleteConcert(concert) {
    if (!confirm(`"${concert.title}" 콘서트를 삭제하시겠습니까?`)) return;
    try {
      await fetch(`${API}/api/concerts/${concert.id}`, { method: 'DELETE' });
      await loadConcerts();
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  }

  function getArtistName(playerId) {
    const artist = artists.find(a => a.id === playerId);
    return artist ? artist.name : '';
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

  // ── 장소 검색 ──────────────────────────────
  let placeSearchTimer;

  function onPlaceInput() {
    clearTimeout(placeSearchTimer);
    if (!placeQuery.trim()) {
      placeResults = [];
      showPlaceResults = false;
      return;
    }
    placeSearchTimer = setTimeout(() => searchPlaces(), 400);
  }

  async function searchPlaces() {
    if (!placeQuery.trim()) return;
    placeSearching = true;
    showPlaceResults = true;
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(placeQuery)}`);
      const data = await res.json();
      placeResults = data.items || [];
    } catch (e) {
      console.error('Place search failed:', e);
      placeResults = [];
    }
    placeSearching = false;
  }

  function selectPlace(place) {
    form.location = place.title;
    form.location_data = {
      title: place.title,
      address: place.address,
      roadAddress: place.roadAddress,
      mapx: place.mapx,
      mapy: place.mapy,
      link: place.link,
      category: place.category,
    };
    placeQuery = '';
    placeResults = [];
    showPlaceResults = false;
  }

  function clearPlace() {
    form.location = '';
    form.location_data = null;
  }
</script>

<svelte:head>
  <title>공연 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>공연 관리</h1>
    </div>
    <Button onclick={openCreate}>+ 공연 추가</Button>
  </header>

  <!-- ── 콘서트 목록 ─────────────────────── -->
  {#if loading}
    <p class="loading">로딩 중...</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>포스터</th>
            <th>제목</th>
            <th>날짜/시간</th>
            <th>장소</th>
            <th>아티스트</th>
            <th>상태</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {#each concerts as concert}
            <tr>
              <td>
                {#if concert.poster_thumb_url || concert.poster_url}
                  <ResponsiveImage src={concert.poster_thumb_url || concert.poster_url} alt={concert.title} class="thumb" loading="lazy" sizes="48px" />
                {:else}
                  <div class="thumb-placeholder"></div>
                {/if}
              </td>
              <td class="name-cell">{concert.title}</td>
              <td>{concert.date || '-'}</td>
              <td>{concert.location || '-'}</td>
              <td>{concert.artists_count ?? (concert.artists || []).length}명</td>
              <td>
                <span class="badge" class:active={concert.is_active}>
                  {concert.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td>
                <div class="actions">
                  <Button variant="secondary" class="sm" onclick={() => openEdit(concert)}>편집</Button>
                  <Button variant="secondary" class="sm danger" onclick={() => deleteConcert(concert)}>삭제</Button>
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
    title={editing ? '공연 편집' : '새 공연'}
    sections={[{ id: 'info', label: '기본 정보' }, { id: 'images', label: '이미지' }, { id: 'detail', label: '설명과 예매' }, { id: 'program', label: '프로그램' }, { id: 'artists', label: '연결 아티스트' }]}
    snapshot={() => [form, selectedPosterUrl, selectedBannerUrl]}
    {saving}
    error={saveError}
    canSave={!(!form.title)}
    saveLabel={editing ? '수정' : '등록'}
    suspended={showMediaPicker || showSubMediaPicker || showBannerMediaPicker}
    onsave={saveConcert}
    onclose={resetForm}
  >
<div class="form-section" data-section="info">
          <h3>기본 정보</h3>
          <label>
            제목 *
            <input type="text" bind:value={form.title} placeholder="공연 제목" required />
          </label>
          <label>
            날짜
            <input type="date" bind:value={form.date} />
          </label>
          <div class="row-2">
            <label>
              시작 시간
              <input type="time" bind:value={form.time} />
            </label>
            <label>
              종료 시간
              <input type="time" bind:value={form.end_time} />
            </label>
          </div>
          <p style="font-size: 0.8rem; color: var(--color-green-700); margin: -0.25rem 0 0.75rem;">
            날짜/시작/종료 시간이 모두 입력되면 대관 관리에 "공연" 일정으로 자동 등록됩니다.
          </p>
          <label>
            장소
          </label>
          {#if form.location_data}
            <div class="selected-place">
              <div class="place-info">
                <strong>{form.location_data.title}</strong>
                <span class="place-address">{form.location_data.roadAddress || form.location_data.address}</span>
                {#if form.location_data.category}
                  <span class="place-category">{form.location_data.category}</span>
                {/if}
              </div>
              <Button variant="secondary" class="sm danger" type="button" onclick={clearPlace}>×</Button>
            </div>
          {:else}
            <div class="place-search-wrap">
              <input
                type="text"
                bind:value={placeQuery}
                oninput={onPlaceInput}
                placeholder="장소 검색 (네이버 지도)"
              />
              {#if showPlaceResults}
                <div class="place-dropdown">
                  {#if placeSearching}
                    <div class="place-item loading">검색 중...</div>
                  {:else if placeResults.length === 0}
                    <div class="place-item empty">검색 결과가 없습니다</div>
                  {:else}
                    {#each placeResults as place}
                      <button type="button" class="place-item" onclick={() => selectPlace(place)}>
                        <strong>{place.title}</strong>
                        <span>{place.roadAddress || place.address}</span>
                        {#if place.category}
                          <span class="place-cat">{place.category}</span>
                        {/if}
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
            <input type="text" bind:value={form.location} placeholder="또는 직접 입력" style="margin-top: 0.5rem;" />
          {/if}
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={form.is_active} />
            활성 상태
          </label>
        </div>

        <!-- 포스터 (드래그 앤 드롭) -->
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
            {#if imageUploading}
              <p class="drop-text">업로드 중...</p>
            {:else if selectedPosterUrl}
              <ResponsiveImage src={selectedPosterUrl} alt="poster preview" class="preview-img poster-preview" sizes="160px" />
              {#if pendingPosterFile}
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

        <!-- 배너 이미지 (Banner Image) -->
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
            <Button variant="secondary" type="button" onclick={openBannerMediaPicker}>
              미디어에서 선택
            </Button>
            {#if selectedBannerUrl}
              <Button variant="secondary" type="button" onclick={() => { selectedBannerUrl = ''; form.banner_image_media_id = null; pendingBannerFile = null; }}>
                제거
              </Button>
            {/if}
          </div>
        </div>

        <!-- 서브 이미지 목록 -->
        <div class="form-section">
          <h3>서브 이미지 목록 (Image List)</h3>
          <p style="font-size: 0.85rem; color: var(--color-green-700); margin-bottom: 0.75rem;">포스터 외 추가 이미지를 등록할 수 있습니다.</p>

          {#if form.image_list.length > 0}
            <div class="sub-image-list">
              {#each form.image_list as img, i}
                <div class="sub-image-item">
                  <ResponsiveImage src={img.thumb_url || img.url} alt="서브 이미지 {i + 1}" sizes="120px" />
                  <Button variant="secondary" class="sm danger" onclick={() => removeSubImage(i)}>×</Button>
                </div>
              {/each}
            </div>
          {/if}

          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="drop-zone sub-drop"
            class:drag-over={subImageDragOver}
            ondrop={handleSubImageDrop}
            ondragover={(e) => { e.preventDefault(); subImageDragOver = true; }}
            ondragleave={() => subImageDragOver = false}
          >
            <input type="file" accept="image/*" class="file-input" onchange={handleSubImageFileSelect} />
            {#if subImageUploading}
              <p class="drop-text">업로드 중...</p>
            {:else}
              <p class="drop-text">+ 이미지 추가 (드래그 또는 클릭)</p>
              <p class="drop-hint">저장 버튼을 누를 때 업로드됩니다</p>
            {/if}
          </div>
          <Button variant="secondary" type="button" style="margin-top:0.5rem" onclick={openSubMediaPicker}>
            미디어에서 선택
          </Button>
        </div>

        <!-- 간단한 설명 -->
        <div class="form-section" data-section="detail">
          <h3>간단한 설명</h3>
          <textarea bind:value={form.brief_description} rows="3" placeholder="공연 소개"></textarea>
        </div>

        <!-- 예매 링크 -->
        <div class="form-section">
          <h3>예매 링크</h3>
          <input type="url" bind:value={form.reserve_link} placeholder="https://..." />
        </div>

        <!-- 티켓 가격 -->
        <div class="form-section">
          <h3>티켓 가격</h3>
          <input type="text" bind:value={form.cost} placeholder="예) 전석 30,000원" />
        </div>

        <!-- 환불 규정 -->
        <div class="form-section">
          <h3>환불 규정</h3>
          <p style="font-size: 0.8rem; color: var(--color-green-700); margin: -0.25rem 0 0.75rem;">
            비워두면 기본 환불 규정 문구가 표시됩니다.
          </p>
          <textarea bind:value={form.refund_policy} rows="5" placeholder={'방문일 기준\n8일전 100% 환불\n7일전 90% 환불\n4-6일전 80% 환불\n1-3일전 70% 환불\n당일 환불 불가'}></textarea>
        </div>

        <!-- 프로그램 -->
        <div class="form-section" data-section="program">
          <h3>프로그램 (Program)</h3>

          {#each form.program as sec, sIdx}
            <div class="program-section">
              <div class="section-header-row">
                <input
                  type="text"
                  class="section-name-input"
                  bind:value={sec.section}
                  placeholder="섹션 이름 (예: 1부, 2부)"
                />
                <Button variant="secondary" class="sm danger" type="button" onclick={() => removeSection(sIdx)}>섹션 삭제</Button>
              </div>

              {#each (sec.items || []) as item, iIdx}
                <div class="program-row">
                  <div class="prog-left">
                    <input type="text" bind:value={item.composer} placeholder="작곡가" class="composer-input" />

                    <div class="title-lines">
                      {#each (item.title || ['']) as t, tIdx}
                        <div class="title-line">
                          <input
                            type="text"
                            value={t}
                            oninput={e => { item.title[tIdx] = e.target.value; form.program = [...form.program]; }}
                            placeholder="곡명"
                          />
                          {#if (item.title || ['']).length > 1}
                            <Button variant="secondary" class="sm" type="button" onclick={() => removeTitleLine(sIdx, iIdx, tIdx)}>−</Button>
                          {/if}
                        </div>
                      {/each}
                      <Button variant="secondary" class="sm" type="button" onclick={() => addTitleLine(sIdx, iIdx)}>+ 곡명 추가</Button>
                    </div>

                    <!-- 연주자 검색 -->
                    <div class="prog-player-search">
                      <input
                        type="text"
                        placeholder="연주자 검색..."
                        value={programPlayerQuery[sIdx]?.[iIdx] || ''}
                        oninput={e => { if (!programPlayerQuery[sIdx]) programPlayerQuery[sIdx] = []; programPlayerQuery[sIdx][iIdx] = e.target.value; programPlayerOpen[sIdx][iIdx] = true; }}
                        onfocus={() => { if (!programPlayerOpen[sIdx]) programPlayerOpen[sIdx] = []; programPlayerOpen[sIdx][iIdx] = true; }}
                      />
                      {#if programPlayerOpen[sIdx]?.[iIdx] && getProgramPlayerResults(sIdx, iIdx).length > 0}
                        <ul class="artist-dropdown">
                          {#each getProgramPlayerResults(sIdx, iIdx) as a}
                            <li>
                              <button type="button" onclick={() => addProgramPlayer(sIdx, iIdx, a.id)}>
                                {a.name}{#if a.name_en} <small>({a.name_en})</small>{/if}
                              </button>
                            </li>
                          {/each}
                        </ul>
                      {/if}
                      {#if (programPlayerQuery[sIdx]?.[iIdx] || '').trim() && getProgramPlayerResults(sIdx, iIdx).length === 0 && programPlayerOpen[sIdx]?.[iIdx]}
                        <ul class="artist-dropdown"><li class="no-result">결과 없음</li></ul>
                      {/if}
                    </div>

                    <div class="program-players">
                      {#each (item.player_ids || []) as pid}
                        {@const pa = artists.find(a => a.id === pid)}
                        {#if pa}
                          <span class="artist-tag small">
                            {pa.name}
                            <button type="button" class="tag-remove" onclick={() => removeProgramPlayer(sIdx, iIdx, pid)}>&times;</button>
                          </span>
                        {/if}
                      {/each}
                    </div>
                  </div>
                  <Button variant="secondary" class="sm danger" type="button" onclick={() => removeItem(sIdx, iIdx)}>×</Button>
                </div>
              {/each}

              <Button variant="secondary" class="sm" type="button" onclick={() => addItem(sIdx)}>+ 곡 추가</Button>
            </div>
          {/each}

          <Button variant="secondary" class="sm" type="button" style="margin-top:0.75rem" onclick={addSection}>+ 섹션 추가</Button>
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
        <h2>포스터 이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button class="media-item" onclick={() => selectMedia(media)}>
              <ResponsiveImage src={media.thumb_url || media.url} alt={media.alt_text || media.original_filename} sizes="120px" />
              <span class="media-name">{media.original_filename}</span>
            </button>
          {/each}
          {#if mediaList.length === 0}
            <p class="empty">업로드된 콘서트 이미지가 없습니다.</p>
          {/if}
        </div>
        <Button variant="secondary" onclick={() => (showMediaPicker = false)}>닫기</Button>
      </div>
    </div>
  {/if}

  <!-- ── 서브 이미지 미디어 피커 모달 ───────── -->
  {#if showSubMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showSubMediaPicker = false)}>✕</button>
        <h2>서브 이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            {@const already = form.image_list.some(img => img.media_id === media.id)}
            <button
              class="media-item"
              class:already-selected={already}
              onclick={() => selectSubMedia(media)}
              disabled={already}
            >
              <ResponsiveImage src={media.thumb_url || media.url} alt={media.alt_text || media.original_filename} sizes="120px" />
              <span class="media-name">{already ? '✓ 추가됨' : media.original_filename}</span>
            </button>
          {/each}
          {#if mediaList.length === 0}
            <p class="empty">업로드된 콘서트 이미지가 없습니다.</p>
          {/if}
        </div>
        <Button variant="secondary" onclick={() => (showSubMediaPicker = false)}>닫기</Button>
      </div>
    </div>
  {/if}

  <!-- ── 배너 이미지 미디어 피커 모달 ──────── -->
  {#if showBannerMediaPicker}
    <div class="modal-overlay">
      <div class="modal media-picker" role="none" onclick={(e) => e.stopPropagation()}>
        <button class="modal-close" onclick={() => (showBannerMediaPicker = false)}>✕</button>
        <h2>배너 이미지 선택</h2>
        <div class="media-grid">
          {#each mediaList as media}
            <button
              type="button"
              class="media-item"
              class:already-selected={form.banner_image_media_id === media.id}
              onclick={() => selectBannerMedia(media)}
            >
              <ResponsiveImage src={media.thumb_url || media.url} alt={media.original_filename} sizes="120px" />
              <span class="media-name">{media.original_filename}</span>
            </button>
          {/each}
          {#if mediaList.length === 0}
            <p class="empty">업로드된 콘서트 이미지가 없습니다.</p>
          {/if}
        </div>
        <Button variant="secondary" onclick={() => (showBannerMediaPicker = false)}>닫기</Button>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
.drop-zone.banner-drop {
    padding: 1rem;
    border-style: dashed;
    aspect-ratio: 16 / 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    &.has-image { padding: 0.5rem; }
  }



.program-section {
    border: 1px solid var(--color-green-200);
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    background: var(--color-green-50);
  }

.section-header-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;

    .section-name-input {
      flex: 1;
      font-weight: 600;
      font-size: 0.95rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 0.4rem 0.6rem;
      color: var(--color-on-surface);
    }
  }

.program-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    align-items: flex-start;
    background: var(--color-surface);
    border: 1px solid var(--color-green-200);
    border-radius: 6px;
    padding: 0.6rem;

    .prog-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .composer-input {
      width: 100%;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-size: 0.85rem;
      background: var(--color-surface);
      color: var(--color-on-surface);
    }

    .title-lines {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .title-line {
      display: flex;
      gap: 0.3rem;
      align-items: center;

      input {
        flex: 1;
        padding: 0.4rem 0.6rem;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        font-size: 0.85rem;
        background: var(--color-surface);
        color: var(--color-on-surface);
      }
    }

    

    

    .prog-player-search {
      position: relative;
      input {
        width: 100%; padding: 0.4rem 0.6rem;
        border: 1px solid var(--color-border); border-radius: 4px;
        font-size: 0.85rem; background: var(--color-surface); color: var(--color-on-surface);
      }
    }

    .program-players {
      display: flex; gap: 0.4rem; flex-wrap: wrap;
    }

    
  }

.artist-tag.small { font-size: 0.8rem; padding: 0.15rem 0.4rem; }

.place-search-wrap {
    position: relative;
    margin-top: 0.25rem;
  }

.place-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-top: none;
    border-radius: 0 0 6px 6px;
    z-index: 10;
    max-height: 250px;
    overflow-y: auto;
  }

.place-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.6rem 0.75rem;
    border: none;
    border-bottom: 1px solid var(--color-green-200);
    background: none;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--color-on-surface);

    &:hover { background: var(--color-green-50); }
    &.loading, &.empty { cursor: default; color: var(--color-green-700); &:hover { background: none; } }

    strong { display: block; font-size: 0.9rem; color: var(--color-on-surface); margin-bottom: 0.15rem; }
    span { display: block; font-size: 0.8rem; color: var(--color-green-700); }
    .place-cat { font-size: 0.75rem; color: var(--color-green-700); margin-top: 0.1rem; }
  }

.selected-place {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--color-green-50);
    border: 1px solid var(--color-border);
    border-radius: 8px;

    .place-info {
      flex: 1;
      strong { display: block; font-size: 0.95rem; color: var(--color-on-surface); margin-bottom: 0.2rem; }
      .place-address { display: block; font-size: 0.85rem; color: var(--color-green-700); }
      .place-category { display: block; font-size: 0.75rem; color: var(--color-green-700); margin-top: 0.15rem; }
    }
  }
</style>
