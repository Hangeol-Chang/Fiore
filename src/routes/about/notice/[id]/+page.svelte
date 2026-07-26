<script>
    import { page } from '$app/stores';
    import { marked } from 'marked';
    import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

    const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

    let notice = $state(null);
    let loading = $state(true);
    let error = $state(null);

    function formatDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString();
    }

    $effect(() => {
        const id = $page.params.id;
        loading = true;
        fetch(`${API}/api/notices/${id}`)
            .then(r => {
                if (!r.ok) throw new Error('공지사항을 찾을 수 없습니다.');
                return r.json();
            })
            .then(data => { notice = data; })
            .catch(err => { error = err.message; })
            .finally(() => { loading = false; });
    });
</script>

<svelte:head>
    <title>{notice?.title ?? 'Notice'} - Fiore</title>
</svelte:head>

<div class="notice-detail-section">
    {#if loading}
        <div class="status-msg">불러오는 중…</div>
    {:else if error}
        <div class="status-msg error">{error}</div>
    {:else if notice}
        <div class="notice-text-wrap">
            <a class="back-link" href="/about/notice">← 목록으로</a>

            <div class="notice-header">
                <h1 class="notice-title">{notice.title}</h1>
                <div class="notice-date">{formatDate(notice.created_at)}</div>
            </div>
        </div>

        {#if notice.image_mid_url || notice.image_url}
            <div class="notice-image-wrap">
                <img class="notice-image" src={notice.image_mid_url || notice.image_url} alt={notice.title} />
            </div>
        {/if}

        <div class="notice-text-wrap">
            <div class="notice-content markdown-body">
                {@html marked.parse(notice.content || '')}
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    .notice-detail-section {
        max-width: 1280px;
        margin: 0 auto;
        padding: 8rem 2rem 6rem;

        @media (--tablet) {
            padding: 6rem 1.5rem 4rem;
        }
    }

    .notice-text-wrap {
        max-width: 800px;
        margin: 0 auto;
    }

    .back-link {
        display: inline-block;
        margin-bottom: 1.5rem;
        color: #888;
        text-decoration: none;
        font-size: 0.9rem;

        &:hover { color: #333; }
    }

    .notice-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
        margin: 0 0 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid #eee;
    }

    .notice-title {
        font-weight: 300;
        letter-spacing: 0.03em;
        margin: 0;
    }

    .notice-date {
        flex-shrink: 0;
        color: #999;
        font-size: 0.85rem;
        margin: 0;
    }

    .notice-image-wrap {
        display: flex;
        justify-content: center;
        margin-bottom: 2rem;
    }

    .notice-image {
        display: block;
        width: 100%;
        max-width: 1280px;
        height: auto;
        object-fit: contain;
        border-radius: 8px;
    }

    .notice-content {
        overflow-wrap: break-word;
    }

    .status-msg {
        padding: 6rem 2rem;
        text-align: center;
        color: #999;
        font-size: 0.95rem;

        &.error { color: #c0392b; }
    }
</style>
