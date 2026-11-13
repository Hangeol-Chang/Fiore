<script>
    import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
    let { concert } = $props();
    let imageLoaded = $state(false);

    const hasPoster = $derived(
        concert.poster_thumb_url || concert.poster_mid_url || concert.poster_large_url || concert.poster_url
    );

    /** "2025-03-15 19:30" 또는 "2025년 3월 15일" → "2025년 3월 15일" */
    const dateText = $derived.by(() => {
        const s = concert.date ?? '';
        const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return `${iso[1]}년 ${+iso[2]}월 ${+iso[3]}일`;
        return s;
    });
</script>

<a class="prev-card" href="/concerts/{concert.id}">
    <div class="poster" class:is-loaded={imageLoaded}>
        {#if hasPoster}
            <ResponsiveImage
                src={concert.poster_url}
                thumb={concert.poster_thumb_url} mid={concert.poster_mid_url} large={concert.poster_large_url}
                sizes="(max-width: 640px) 50vw, 240px"
                alt=""
                onload={() => { imageLoaded = true; }}
            />
        {/if}
    </div>
    <h3 class="title">{concert.title}</h3>
    <span class="date">{dateText}</span>
</a>

<style lang="scss">
    .prev-card {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        color: inherit;
        text-decoration: none;
        min-width: 0;

        &:focus-visible {
            outline: 2px solid var(--color-on-surface);
            outline-offset: 4px;
        }
    }

    .poster {
        aspect-ratio: 3 / 4;
        overflow: hidden;
        background: var(--color-green-100);

        :global(img) {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            opacity: 0;
            transition: opacity 0.25s ease, transform 0.3s;
        }

        &.is-loaded :global(img) { opacity: 1; }
    }

    .prev-card:hover .poster :global(img) { transform: scale(1.04); }

    @media (prefers-reduced-motion: reduce) {
        .poster :global(img) { transition: none; }
        .prev-card:hover .poster :global(img) { transform: none; }
    }

    .title {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 400;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .date {
        font-size: 0.8rem;
        font-weight: 300;
        color: var(--color-green-700);
    }
</style>
