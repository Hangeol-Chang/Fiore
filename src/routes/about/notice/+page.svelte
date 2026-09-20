<script>
    import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

    const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

    let notices = $state([]);
    let loading = $state(true);
    let error = $state(null);

    const PAGE_SIZE = 10;
    let currentPage = $state(1);

    const totalPages = $derived(Math.max(1, Math.ceil(notices.length / PAGE_SIZE)));

    const pagedNotices = $derived(
        notices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    );

    function goToPage(p) {
        if (p < 1 || p > totalPages) return;
        currentPage = p;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString();
    }

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    function isNew(dateStr) {
        if (!dateStr) return false;
        return Date.now() - new Date(dateStr).getTime() < THREE_DAYS_MS;
    }

    $effect(() => {
        fetch(`${API}/api/notices?active_only=true`)
            .then(r => r.json())
            .then(data => { notices = data; })
            .catch(err => { error = err.message; })
            .finally(() => { loading = false; });
    });
</script>

<svelte:head>
    <title>Notice - Fiore</title>
</svelte:head>

<div>
    <section class="notice-section">
        <h1>Notice</h1>

        <div class="notice-board">
            <div class="board-header">
                <span class="col-num">No.</span>
                <span class="col-title">제목</span>
                <span class="col-views">조회수</span>
                <span class="col-date">날짜</span>
            </div>

            {#if loading}
                <div class="status-msg">불러오는 중…</div>
            {:else if error}
                <div class="status-msg error">{error}</div>
            {:else if pagedNotices.length === 0}
                <div class="status-msg">등록된 공지사항이 없습니다.</div>
            {:else}
                {#each pagedNotices as notice (notice.id)}
                    <a class="board-row" href="/about/notice/{notice.id}">
                        <span class="col-num">
                            {#if notice.is_pinned}
                                <svg class="pin-icon" viewBox="0 0 24 24" width="14" height="14" aria-label="상단 고정"><title>상단 고정</title><path fill="currentColor" d="M14.15 2.85a1 1 0 0 1 1.41 0l5.59 5.59a1 1 0 0 1 0 1.41l-2.83 2.83a1 1 0 0 1-1.41 0l-.4-.4-3.06 3.06.7 3.51a1 1 0 0 1-.27.91l-1 1a1 1 0 0 1-1.41 0l-3.7-3.7-4.6 4.6a1 1 0 0 1-1.41-1.41l4.6-4.6-3.7-3.7a1 1 0 0 1 0-1.41l1-1a1 1 0 0 1 .91-.27l3.51.7 3.06-3.06-.4-.4a1 1 0 0 1 0-1.41z"/></svg>
                            {:else}{notice.id}{/if}
                        </span>
                        <span class="col-title">
                            <span class="title-text">{notice.title}</span>
                            {#if isNew(notice.created_at)}<span class="new-badge">new</span>{/if}
                        </span>
                        <span class="col-views">{notice.view_count ?? 0}</span>
                        <span class="col-date">{formatDate(notice.created_at)}</span>
                    </a>
                {/each}
            {/if}
        </div>

        {#if totalPages > 1}
            <nav class="pagination" aria-label="페이지네이션">
                <button class="page-arrow" onclick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>‹</button>
                {#each Array(totalPages) as _, i}
                    <button
                        class="page-num"
                        class:active={currentPage === i + 1}
                        onclick={() => goToPage(i + 1)}
                    >
                        {i + 1}
                    </button>
                {/each}
                <button class="page-arrow" onclick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>›</button>
            </nav>
        {/if}
    </section>
</div>

<style lang="scss">
    .notice-section {
        max-width: 1000px;
        margin: 0 auto;
        padding: 8rem 2rem 6rem;

        @media (--tablet) {
            padding: 6rem 1.5rem 4rem;
        }

        h1 {
            font-weight: 200;
            letter-spacing: 0.05em;
            margin-bottom: 2rem;
        }
    }

    .notice-board {
        border-top: 2px solid #333;
    }

    .board-header {
        display: grid;
        grid-template-columns: 80px 1fr 90px 140px;
        padding: 0.9rem 1rem;
        border-bottom: 1px solid #ddd;
        font-size: 0.85rem;
        font-weight: 500;
        color: #555;

        @media (--tablet) {
            grid-template-columns: 50px 1fr 70px 90px;
        }
    }

    .board-row {
        display: grid;
        grid-template-columns: 80px 1fr 90px 140px;
        padding: 0.9rem 1rem;
        border-bottom: 1px solid #eee;
        text-decoration: none;
        color: #333;
        font-size: 0.9rem;
        transition: background-color 0.2s ease;

        &:hover {
            background-color: #f7f7f7;
        }

        @media (--tablet) {
            grid-template-columns: 50px 1fr 70px 90px;
            font-size: 0.85rem;
        }
    }

    .col-num,
    .col-views,
    .col-date {
        color: #888;
        text-align: center;
    }

    .col-title {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        overflow: hidden;
        min-width: 0;

        span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }

    .pin-icon {
        color: #999;
        vertical-align: middle;
    }

    .new-badge {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        padding: 0.05rem 0.4rem;
        border-radius: 3px;
        background: #e53e3e;
        color: #fff;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1;
    }

    .status-msg {
        padding: 6rem 2rem;
        text-align: center;
        color: #999;
        font-size: 0.95rem;

        &.error { color: #c0392b; }
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        margin-top: 2.5rem;

        button {
            border: none;
            background: none;
            cursor: pointer;
            font-size: 0.9rem;
            color: #555;
            padding: 0.4rem 0.7rem;
            border-radius: 4px;
            transition: background-color 0.2s ease, color 0.2s ease;

            &:hover:not(:disabled) {
                background-color: #f0f0f0;
            }

            &:disabled {
                opacity: 0.3;
                cursor: default;
            }
        }

        .page-num.active {
            background-color: #333;
            color: #fff;
        }
    }
</style>
