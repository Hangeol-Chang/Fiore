<script>
    import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { onMount } from 'svelte';
    import { Calendar, ExternalLink, X } from 'lucide-svelte';
    import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

    const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

    let { audition } = $props();

    let showModal = $state(false);

    onMount(() => {
        fetch(`${API}/api/auditions/${audition.id}/view`, { method: 'POST' }).catch(() => {});
    });

    function parseDateStr(dateStr) {
        if (!dateStr) return null;
        const iso = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return { year: +iso[1], month: +iso[2], day: +iso[3] };
        const kr = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
        if (kr) return { year: +kr[1], month: +kr[2], day: +kr[3] };
        return null;
    }

    function formatDate(dateStr) {
        const d = parseDateStr(dateStr);
        if (!d) return dateStr ?? '';
        return `${d.year}년 ${d.month}월 ${d.day}일`;
    }

    const periodLabel = $derived.by(() => {
        const s = formatDate(audition.start_date);
        const e = formatDate(audition.end_date);
        if (s && e) return `${s} ~ ${e}`;
        if (s) return `${s} ~`;
        if (e) return `~ ${e}`;
        return '';
    });

    const contentLines = $derived(audition.content ? audition.content.split('\n') : []);
</script>

<div class="audition-card">
    <div class="card-poster">
        {#if audition.poster_mid_url || audition.poster_url}
            <ResponsiveImage
                role="none"
                src={audition.poster_url}
                thumb={audition.poster_thumb_url} mid={audition.poster_mid_url} large={audition.poster_large_url}
                sizes="160px"
                alt={audition.title}
                onclick={() => showModal = true}
            />
        {:else}
            <div class="poster-placeholder"></div>
        {/if}
    </div>
    <div class="card-body">
        <div class="card-top-row">
            <h3 role="none" class="card-title" onclick={() => showModal = true}>
                {audition.title}
            </h3>
            {#if audition.apply_link}
                <Button href={audition.apply_link} target="_blank" rel="noopener noreferrer" class="apply-btn">
                    지원하기 <ExternalLink size={13} />
                </Button>
            {/if}
        </div>
        {#if periodLabel}
            <span class="meta-item">
                <Calendar size={13} />
                {periodLabel}
            </span>
        {/if}
        {#if audition.brief_description}
            <p class="card-brief">{audition.brief_description}</p>
        {/if}
        {#if audition.content}
            <Button variant="secondary" class="more-btn" onclick={() => showModal = true}>view detail</Button>
        {/if}
        <span class="view-count">views {audition.view_count ?? 0}</span>
    </div>
</div>

<!-- 상세 모달 -->
{#if showModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => showModal = false}>
        <div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
            <button class="modal-close" onclick={() => showModal = false} aria-label="닫기">
                <X size={18} />
            </button>

            <div class="modal-header">
                {#if audition.poster_mid_url || audition.poster_url}
                    <ResponsiveImage class="modal-poster" src={audition.poster_url} thumb={audition.poster_thumb_url} mid={audition.poster_mid_url} large={audition.poster_large_url} sizes="(max-width: 450px) 100vw, 200px" alt={audition.title} />
                {/if}
                <div class="modal-header-info">
                    <div style="display:flex; align-items:center; justify-content: space-between;">
                        <h2 class="modal-title">{audition.title}</h2>
                        {#if audition.apply_link}
                            <Button href={audition.apply_link} target="_blank" rel="noopener noreferrer" class="apply-btn">
                                지원하기 <ExternalLink size={13} />
                            </Button>
                        {/if}
                    </div>
                    {#if periodLabel}
                        <span class="meta-item">
                            <Calendar size={13} />
                            {periodLabel}
                        </span>
                    {/if}
                    {#if audition.brief_description}
                        <p class="modal-brief">{audition.brief_description}</p>
                    {/if}

                </div>
            </div>

            {#if contentLines.length > 0}
                <div class="modal-content">
                    <p class="modal-text">
                        {#each contentLines as line, i}
                            {line}{#if i < contentLines.length - 1}<br />{/if}
                        {/each}
                    </p>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style lang="scss">
.audition-card {
    display: flex;
    flex-direction: row;
    border: 0.5px solid var(--color-green-200);
    background: var(--color-surface);
    min-height: 160px;

    &:hover {
        border-color: var(--color-green-500);
    }
}

.card-poster {
    flex: 0 0 160px;
    overflow: hidden;
    background: var(--color-green-100);
    align-self: stretch;
    cursor: pointer;

    :global(img) {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.3s;

        &:hover {
            transform: scale(1.05);
        }
    }

    .poster-placeholder {
        width: 100%;
        height: 100%;
        min-height: 160px;
        background: var(--color-green-100);
    }
}

.card-body {
    flex: 1;
    padding: 1.5rem 1.75rem;
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 0.4rem;

    @media(--mobile) { padding: 1rem 1.1rem; }
}

.card-top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.1rem;
}

.card-title {
    font-size: 1.45rem;
    font-weight: 300;
    color: var(--color-on-surface);
    margin: 0;
    line-height: 1.3;
    cursor: pointer;

    @media(--tablet) { font-size: 1.2rem; }
    @media(--mobile) { font-size: 1rem; }
}

.view-count {
    align-self: flex-end;
    margin-top: auto;
    font-size: 0.7rem;
    font-weight: 300;
    color: var(--color-green-600);
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    font-weight: 300;
    color: var(--color-green-700);
    line-height: 1;
}

.card-brief {
    font-size: 0.85rem;
    font-weight: 300;
    line-height: 1.6;
    color: var(--color-green-700);
    margin: 0.2rem 0 0;
    white-space: pre-line;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}


/* ── 모달 ──────────────────────────────── */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    z-index: 500;
    overflow-y: auto;
}

.modal {
    background: var(--color-surface);
    width: 100%;
    max-width: 680px;
    max-height: 85vh;
    overflow-y: auto;
    position: relative;
    border: 1px solid var(--color-border);
    animation: modal-in 0.2s ease;

    @media(--mobile) {
        max-height: 95vh;
        margin: auto 0 0;
    }
}

@keyframes modal-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
}

.modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    color: var(--color-green-700);
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    z-index: 1;
    transition: color 0.15s;

    &:hover { color: #111; }
}

.modal-header {
    display: flex;
    gap: 1.5rem;
    padding: 2rem;
    border-bottom: 1px solid var(--color-green-200);

    @media(--tablet) {
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }
}

:global(.modal-poster) {
    flex: 0 0 200px;
    width: 200px;
    height: 280px;
    object-fit: cover;

    @media(--mobile) {
        width: 100%;
        height: 240px;
        flex: none;
    }
}

.modal-header-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
}

.modal-title {
    font-size: 1.5rem;
    font-weight: 300;
    color: var(--color-on-surface);
    margin: 0;
    line-height: 1.3;
    padding-right: 1.5rem;
}

.modal-brief {
    font-size: 0.88rem;
    font-weight: 300;
    color: var(--color-green-700);
    margin: 1rem 0 0 0;
    line-height: 1.6;
    white-space: pre-line;
}

.modal-content {
    padding: 1.75rem 2rem;
}

.modal-text {
    font-size: 0.88rem;
    font-weight: 300;
    line-height: 1.85;
    color: var(--color-on-surface);
    margin: 0;
    white-space: pre-line;
}
</style>
