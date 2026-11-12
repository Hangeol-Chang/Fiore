<script>
  import Button from '$lib/components/ui/Button.svelte';
  import SlidePanel from '$lib/components/ui/SlidePanel.svelte';
  import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

  const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

  const STATUS_LABEL = { pending: '승인 대기', approved: '승인 완료', rejected: '거절됨' };
  // '공연'은 일반 대관 신청 폼에는 노출되지 않는 관리자 전용 카테고리 (콘서트 등록 시 자동 연동)
  const RENTAL_TYPES = ['레슨, 연습', '모임 대관', '공연 대관', '공연'];

  // ── 상태 ──────────────────────────────────
  let items = $state([]);
  let loading = $state(false);
  let statusFilter = $state('all'); // all | pending | approved | rejected
  let editing = $state(null);
  let showForm = $state(false);
  let saving = $state(false);
  let saveError = $state('');

  let form = $state({
    date: '',
    start_time: '',
    end_time: '',
    rental_type: RENTAL_TYPES[0],
    name: '',
    phone: '',
    email: '',
    memo: '',
    status: 'approved',
  });

  $effect(() => { loadItems(); });

  const filteredItems = $derived(
    statusFilter === 'all' ? items : items.filter((i) => i.status === statusFilter)
  );

  async function loadItems() {
    loading = true;
    try {
      const res = await fetch(`${API}/api/rentals/admin`);
      items = await res.json();
    } catch (e) {
      console.error('Failed to load rental bookings:', e);
    }
    loading = false;
  }

  function resetForm() {
    form = {
      date: '', start_time: '', end_time: '', rental_type: RENTAL_TYPES[0],
      name: '', phone: '', email: '', memo: '', status: 'approved',
    };
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
      date: item.date || '',
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      rental_type: item.rental_type || RENTAL_TYPES[0],
      name: item.name || '',
      phone: item.phone || '',
      email: item.email || '',
      memo: item.memo || '',
      status: item.status || 'pending',
    };
    showForm = true;
  }

  async function saveItem() {
    if (editing?.concert_id) {
      saveError = '콘서트와 연동된 대관 일정이라 여기서 저장할 수 없습니다. 공연 관리 페이지에서 수정해 주세요.';
      return;
    }
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      saveError = '종료 시간은 시작 시간보다 늦어야 합니다. 시간을 고쳐 주세요.';
      return;
    }
    if (saving) return;
    saving = true;
    saveError = '';

    const formData = new FormData();
    formData.append('date', form.date);
    formData.append('start_time', form.start_time);
    formData.append('end_time', form.end_time);
    formData.append('rental_type', form.rental_type || '');
    formData.append('name', form.name || '');
    formData.append('phone', form.phone || '');
    formData.append('email', form.email || '');
    formData.append('memo', form.memo || '');
    formData.append('status', form.status);

    try {
      const url = editing ? `${API}/api/rentals/admin/${editing.id}` : `${API}/api/rentals/admin`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error(await res.text());
      resetForm();
      await loadItems();
    } catch (e) {
      saving = false;
      saveError = '저장 실패: ' + e.message + '.';
    }
  }

  async function setStatus(item, status) {
    try {
      const formData = new FormData();
      formData.append('status', status);
      const res = await fetch(`${API}/api/rentals/admin/${item.id}/status`, { method: 'PATCH', body: formData });
      if (!res.ok) throw new Error(await res.text());
      await loadItems();
    } catch (e) {
      alert('상태 변경 실패: ' + e.message);
    }
  }

  async function deleteItem(item) {
    if (item.concert_id) {
      alert('콘서트와 연동된 대관 일정입니다. 공연 관리 페이지에서 콘서트를 삭제해주세요.');
      return;
    }
    if (!confirm(`${item.date} ${item.start_time}~${item.end_time} 대관 예약을 삭제하시겠습니까?`)) return;
    try {
      await fetch(`${API}/api/rentals/admin/${item.id}`, { method: 'DELETE' });
      await loadItems();
    } catch (e) {
      alert('삭제 실패: ' + e.message);
    }
  }
</script>

<svelte:head>
  <title>대관 관리 - Admin</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <a href="/admin" class="back-link">← Admin</a>
      <h1>대관 관리</h1>
    </div>
    <Button onclick={openCreate}>+ 대관 계획 등록</Button>
  </header>

  <div class="filter-tabs">
    {#each [['all', '전체'], ['pending', '승인 대기'], ['approved', '승인 완료'], ['rejected', '거절됨']] as [value, label]}
      <button
        type="button"
        class="filter-tab"
        class:active={statusFilter === value}
        aria-pressed={statusFilter === value}
        onclick={() => (statusFilter = value)}
      >
        {label}
        {#if value !== 'all'}
          <span class="count">{items.filter((i) => i.status === value).length}</span>
        {/if}
      </button>
    {/each}
  </div>

  {#if loading}
    <p class="loading">로딩 중...</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>날짜</th>
            <th>시간</th>
            <th>유형</th>
            <th>신청자</th>
            <th>연락처</th>
            <th>출처</th>
            <th>상태</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredItems as item}
            <tr>
              <td>{item.date}</td>
              <td>{item.start_time} ~ {item.end_time}</td>
              <td>{item.rental_type || '-'}</td>
              <td class="name-cell">{item.name || '-'}</td>
              <td>
                {item.phone || '-'}
                {#if item.email}<br /><span class="email-cell">{item.email}</span>{/if}
              </td>
              <td>
                <span class="badge source">{item.source === 'admin' ? '관리자 등록' : '온라인 신청'}</span>
                {#if item.concert_id}
                  <span class="badge concert-linked">콘서트 연동</span>
                {/if}
              </td>
              <td>
                <span class="badge status-{item.status}">{STATUS_LABEL[item.status] || item.status}</span>
              </td>
              <td>
                <div class="actions">
                  {#if item.concert_id}
                    <Button variant="secondary" class="sm" href="/admin/concerts">공연 관리로 이동</Button>
                  {:else}
                    {#if item.status === 'pending'}
                      <Button class="sm" onclick={() => setStatus(item, 'approved')}>승인</Button>
                      <Button variant="secondary" class="sm danger" onclick={() => setStatus(item, 'rejected')}>거절</Button>
                    {/if}
                    <Button variant="secondary" class="sm" onclick={() => openEdit(item)}>편집</Button>
                    <Button variant="secondary" class="sm danger" onclick={() => deleteItem(item)}>삭제</Button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
          {#if filteredItems.length === 0}
            <tr><td colspan="8" class="empty">해당하는 대관 예약이 없습니다.</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ── 편집 / 등록 폼 ──────────────────── -->
  <SlidePanel
    open={showForm}
    title={editing ? '대관 예약 편집' : '대관 계획 등록'}
    sections={[{ id: 'schedule', label: '일정' }, { id: 'applicant', label: '신청자 정보' }]}
    snapshot={() => form}
    {saving}
    error={saveError}
    canSave={!(!form.date || !form.start_time || !form.end_time)}
    saveLabel={editing ? '수정' : '등록'}
    suspended={false}
    onsave={saveItem}
    onclose={resetForm}
  >
<div class="form-section" data-section="schedule">
          <h3>일정</h3>
          <div class="row-3">
            <label>
              날짜 *
              <input type="date" bind:value={form.date} required />
            </label>
            <label>
              시작 시간 *
              <input type="time" bind:value={form.start_time} required />
            </label>
            <label>
              종료 시간 *
              <input type="time" bind:value={form.end_time} required />
            </label>
          </div>
          <label>
            대관 유형
            <select bind:value={form.rental_type}>
              {#each RENTAL_TYPES as t}
                <option value={t}>{t}</option>
              {/each}
            </select>
          </label>
          <label>
            상태
            <select bind:value={form.status}>
              <option value="pending">승인 대기</option>
              <option value="approved">승인 완료</option>
              <option value="rejected">거절됨</option>
            </select>
          </label>
        </div>

        <div class="form-section" data-section="applicant">
          <h3>신청자 정보 (구두 신청 등, 선택 입력)</h3>
          <div class="row-2">
            <label>
              성함
              <input type="text" bind:value={form.name} placeholder="홍길동" />
            </label>
            <label>
              연락처
              <input type="tel" bind:value={form.phone} placeholder="010-0000-0000" />
            </label>
          </div>
          <label>
            이메일
            <input type="email" bind:value={form.email} placeholder="example@email.com" />
          </label>
          <label>
            메모
            <textarea bind:value={form.memo} placeholder="전달받은 경로, 특이사항 등" style="min-height:80px"></textarea>
          </label>
        </div>
  </SlidePanel>
  
</div>

<style lang="scss">
.filter-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

.filter-tab {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface);
    color: var(--color-green-700);
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;

    &:hover { background: var(--color-green-50); }
    &.active { background: var(--color-green-500); border-color: var(--color-green-500); color: var(--color-surface); }
  }

.count {
    font-size: 0.75rem;
    opacity: 0.8;
  }

.email-cell { color: var(--color-green-700); font-size: 0.8rem; }

.badge.source { border-style: dashed; }

.badge.concert-linked { margin-left: 0.3rem; border-style: dotted; }

.badge.status-pending { border-style: dashed; }

.badge.status-approved { background: var(--color-green-100); }

.badge.status-rejected { border: 3px double var(--color-green-700); }
</style>
