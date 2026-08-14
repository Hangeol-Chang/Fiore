<script>
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
      alert('콘서트와 연동된 대관 일정입니다. 공연 관리 페이지에서 수정해주세요.');
      return;
    }
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

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
      alert('저장 실패: ' + e.message);
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
    <button class="btn-primary" onclick={openCreate}>+ 대관 계획 등록</button>
  </header>

  <div class="filter-tabs">
    {#each [['all', '전체'], ['pending', '승인 대기'], ['approved', '승인 완료'], ['rejected', '거절됨']] as [value, label]}
      <button
        type="button"
        class="filter-tab"
        class:active={statusFilter === value}
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
              <td class="actions">
                {#if item.concert_id}
                  <a class="btn-sm btn-edit" href="/admin/concerts">공연 관리로 이동</a>
                {:else}
                  {#if item.status === 'pending'}
                    <button class="btn-sm btn-approve" onclick={() => setStatus(item, 'approved')}>승인</button>
                    <button class="btn-sm btn-reject" onclick={() => setStatus(item, 'rejected')}>거절</button>
                  {/if}
                  <button class="btn-sm btn-edit" onclick={() => openEdit(item)}>편집</button>
                  <button class="btn-sm btn-delete" onclick={() => deleteItem(item)}>삭제</button>
                {/if}
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
  {#if showForm}
    <div class="modal-overlay">
      <div class="modal" role="none" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header-row">
          <h2>{editing ? '대관 예약 편집' : '대관 계획 등록'}</h2>
          <div class="modal-header-actions">
            <button class="btn-primary btn-save-top" onclick={saveItem} disabled={!form.date || !form.start_time || !form.end_time}>
              {editing ? '수정' : '등록'}
            </button>
            <button class="modal-close" onclick={resetForm}>✕</button>
          </div>
        </div>

        <div class="form-section">
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

        <div class="form-section">
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

        <div class="form-actions">
          <button class="btn-primary" onclick={saveItem} disabled={!form.date || !form.start_time || !form.end_time}>
            {editing ? '수정' : '등록'}
          </button>
          <button class="btn-secondary" onclick={resetForm}>취소</button>
        </div>
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
    margin-bottom: 1.5rem;

    .header-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .back-link { color: #888; text-decoration: none; &:hover { color: #222; } }
    h1 { margin: 0; font-size: 1.5rem; color: #111; }
  }

  .filter-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .filter-tab {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 999px;
    background: #fff;
    color: #555;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;

    &:hover { background: #f3f4f6; }
    &.active { background: #2563eb; border-color: #2563eb; color: #fff; }
  }
  .count {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .loading { text-align: center; color: #999; padding: 3rem; }

  .table-wrap { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #eee; }
    th { color: #888; font-weight: 500; font-size: 0.85rem; }
    tbody tr:hover { background: #f8f9fa; }
  }

  .name-cell { font-weight: 600; color: #111; }
  .email-cell { color: #888; font-size: 0.8rem; }

  .badge {
    padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem;
    background: #eee; color: #666;
    display: inline-block;
  }
  .badge.source { background: #eef2ff; color: #4338ca; }
  .badge.concert-linked { background: #f3e8ff; color: #7e22ce; margin-left: 0.3rem; }
  .badge.status-pending { background: #fef3c7; color: #92400e; }
  .badge.status-approved { background: #dcfce7; color: #166534; }
  .badge.status-rejected { background: #fee2e2; color: #991b1b; }

  .actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
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
  .btn-sm { padding: 0.3rem 0.7rem; font-size: 0.85rem; border-radius: 4px; border: none; cursor: pointer; display: inline-block; text-decoration: none; }
  .btn-edit { background: #2563eb; color: #fff; &:hover { background: #1d4ed8; } }
  .btn-delete { background: #dc3545; color: #fff; &:hover { background: #c82333; } }
  .btn-approve { background: #16a34a; color: #fff; &:hover { background: #15803d; } }
  .btn-reject { background: #ea580c; color: #fff; &:hover { background: #c2410c; } }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 2rem; overflow-y: auto; z-index: 1000;
  }
  .modal {
    background: #fff; border: 1px solid #e0e0e0; border-radius: 12px;
    padding: 2rem; width: 100%; max-width: 600px; max-height: 90vh;
    overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); position: relative;
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
    position: absolute; top: 0.75rem; right: 0.75rem;
    background: none; border: none; color: #888; font-size: 1.4rem; cursor: pointer; z-index: 1;
    &:hover { color: #222; }
  }

  .form-section {
    margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee;
    h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #666; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #444; }
    input[type="text"], input[type="date"], input[type="time"], input[type="tel"], input[type="email"], select, textarea {
      display: block; width: 100%; margin-top: 0.25rem;
      padding: 0.5rem 0.75rem; background: #fff; border: 1px solid #d1d5db;
      border-radius: 6px; color: #222; font-size: 0.9rem;
      &:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    }
    textarea { resize: vertical; font-family: inherit; }
  }

  .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }

  .form-actions {
    display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;
  }
</style>
