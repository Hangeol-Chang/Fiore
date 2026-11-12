<script>
    import HeroSection from './HeroSection.svelte';

    let {
        title = '',
        subtitle='',

        filters = [],
        activeFilter = '',
        onFilter = () => {},
        /** @type {string|null} 배경 이미지 경로 (없으면 compact 모드) */
        image = null,
        maxHeight = '700px',
        imageMaxWidth = '1400px',
        aspectRatio = '16/9',
        /** bgAnchor: 이미지를 제목보다 아래 Y 위치에 노출 */
        bgAnchor = 'center',


        scrollAction = true, // 스크롤 시 배경 이미지 위치 조정 여부

        heroTitle = "",
        heroSubtitle = "",

    } = $props();
</script>

<section class="nav-section" class:has-image={image}>
    <h1>{title}</h1>
    <h3>{subtitle}</h3>

    {#if filters.length > 0}
        <nav class="filter-nav">
            {#each filters as filter}
                <button
                    class="filter-btn"
                    class:active={activeFilter === filter}
                    onclick={() => onFilter(filter)}
                >
                    {filter}
                </button>
            {/each}
        </nav>
    {/if}
    {#if image}
        <HeroSection
            {image}
            {maxHeight}
            {imageMaxWidth}
            {aspectRatio}
            {bgAnchor}
            title={heroTitle}
            subtitle={heroSubtitle}
            {scrollAction}
        >
        </HeroSection>
    {/if}
</section>

<style lang="scss">
    .nav-section {
        position: relative;
        width: 100%;
        min-height: 500px;
        background-color: var(--color-surface);
        color: var(--color-on-surface);

        display: flex;
        flex-direction: column;
        padding: 4rem 0 0;

        h1 {
            font-family: Pretendard, sans-serif;
            font-weight: 100;
            margin: 2rem 0 1.5rem;
            text-align: center;

            letter-spacing: 4rem;
            padding-left: 4rem;
            @media (max-width: 1024px) { letter-spacing: 2rem; padding-left: 2rem; }
            @media (max-width: 600px)  { letter-spacing: 1rem; padding-left: 1rem; }
        }
        h3 {
            font-family: Pretendard, sans-serif;
            font-weight: 200;
            margin: 0 0 2rem;
            text-align: center;

            letter-spacing: 0.5em;
        }
    }

    .filter-nav {
        display: flex;
        justify-content: center;
        gap: clamp(1.5rem, 5vw, 5rem);
        padding: 0 5vw 1rem;
        width: 100%;
        border-bottom: 1px solid var(--color-border);
    }

    .filter-btn {
        font-family: Pretendard, sans-serif;
        font-size: clamp(0.9rem, 1.5vw, 1.1rem);
        font-weight: 300;
        letter-spacing: 0.08em;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5rem 0;
        color: var(--color-on-surface);
        position: relative;
        transition: color var(--dur-fast);

        &::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0;
            width: 0; height: 1px;
            background: currentColor;
            transition: width var(--dur-fast) ease;
        }

        &:hover {
            color: var(--color-green-500);
            &::after { width: 100%; }
        }
        &.active {
            color: var(--color-green-500);
            font-weight: 600;
            &::after { width: 100%; }
        }
    }
</style>
