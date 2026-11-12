<script>
    import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
    import LogoAreaWave from '$lib/components/logo/LogoAreaWave.svelte';
    let { artist } = $props();
    let wave = $state();
</script>

{#if artist.role_name === "artist" || artist.role_name === "group"}
<a href="/artists/{artist.id}" class="artist-card"
    onpointerenter={() => wave.start()} onpointerleave={() => wave.stop()}
    onfocus={(e) => e.currentTarget.matches(':focus-visible') && wave.start()} onblur={() => wave.stop()}>
    <div class="card-image-wrapper">
        {#if artist.thumb_url || artist.mid_url || artist.image_url}
            <ResponsiveImage src={artist.image_url} thumb={artist.thumb_url} mid={artist.mid_url} large={artist.large_url} width={artist.width} height={artist.height} sizes="(max-width: 768px) 50vw, 25vw" alt={artist.name} class="card-image" />
        {:else}
            <div class="card-image-placeholder"></div>
        {/if}
        <LogoAreaWave bind:this={wave} />
    </div>

    <div class="card-info">
        <h3 class="name-en">{artist.name_en ?? ''}</h3>
        <h4 class="name-kr">{artist.name}</h4>
        <span class="view-detail">view detail +</span>
    </div>
</a>
{:else}
<div class="artist-card no-link">
    <div class="card-image-wrapper">
        {#if artist.thumb_url || artist.mid_url || artist.image_url}
            <ResponsiveImage src={artist.image_url} thumb={artist.thumb_url} mid={artist.mid_url} large={artist.large_url} width={artist.width} height={artist.height} sizes="(max-width: 768px) 50vw, 25vw" alt={artist.name} class="card-image" />
        {:else}
            <div class="card-image-placeholder"></div>
        {/if}
    </div>

    <div class="card-info">
        <h3 class="name-en">{artist.name_en ?? ''}</h3>
        <h4 class="name-kr">{artist.name}</h4>
    </div>
</div>
{/if}

<style lang="scss">
.artist-card {
    display: block;
    position: relative;
    overflow: hidden;
    border-radius: 2px;
    aspect-ratio: 3 / 4;
    cursor: pointer;

    &:focus-visible {
        outline: 2px solid var(--color-green-500);
        outline-offset: -2px;
    }

    &.no-link {
        cursor: default;
    }

}

.card-image-wrapper {
    position: absolute;
    inset: 0;
}

.card-image-wrapper :global(.card-image) {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-image-placeholder {
    width: 100%;
    height: 100%;
    background: #1a1a1a;
}

.card-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1.5rem 1.2rem;
    z-index: 2;

    @media (--tablet) {
        padding: 0.9rem 0.8rem;
    }

    .name-en {
        font-size: 1.4rem;
        font-weight: 100;
        letter-spacing: 0.08em;
        margin: 0 0 0.15rem;
        color: white;

        @media (--tablet) {
            font-size: 1.05rem;
            margin: 0 0 0.05rem;
        }
    }

    .name-kr {
        font-size: 1.2rem;
        font-weight: 300;
        color: white;
        margin: 0 0 0.5rem;

        @media (--tablet) {
            font-size: 0.9rem;
            margin: 0 0 0.2rem;
        }
    }

    .view-detail {
        font-size: 0.85rem;
        font-weight: 300;
        letter-spacing: 0.1em;
        color: white;
        text-transform: lowercase;

        @media (--tablet) {
            font-size: 0.7rem;
        }
    }
}
</style>
