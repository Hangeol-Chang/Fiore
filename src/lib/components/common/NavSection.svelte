<script>
    import HeroSection from './HeroSection.svelte';
    import bgImage from '$lib/assets/images/home/main_bg.webp';
    import LogoDivider from '$lib/components/ui/LogoDivider.svelte';

    let {
        title = '',
        subtitle='',

        filters = [],
        activeFilter = '',
        onFilter = () => {},
        /** @type {string|null} 배경 이미지 경로 (없으면 compact 모드) */
        image = null,
        /** main_bg.webp 배경 + 흰 글자·음각 효과 (이미지 없는 모드에서만) */
        bg = false,
        /** @type {string|null} bg 모드에서 아래쪽에 그라데이션으로 전환될 이미지 */
        bgBottom = null,
        /** bg 이미지 채도 (1 = 원본, 0 = 흑백) */
        bgSaturate = 1,
        /** 0~1: main_bg 위에 덮는 어두운 초록 오버레이 투명도 (채도 있는 짙은 초록) */
        bgDim = 0,
        maxHeight = '700px',
        imageMaxWidth = '1400px',
        aspectRatio = '16/9',
        /** bgAnchor: 이미지를 제목보다 아래 Y 위치에 노출 */
        bgAnchor = 'center',


        scrollAction = true, // 스크롤 시 배경 이미지 위치 조정 여부

        heroTitle = "",
        heroSubtitle = "",

    } = $props();

    // bgBottom 패럴랙스: 스크롤의 50%만큼 이미지가 따라 내려와 천천히 뒤로 들어가는 느낌
    let scrollY = $state(0);
</script>

<svelte:window bind:scrollY />

{#if bg && !image}
    <!-- 음각: 위·왼쪽 안쪽 가장자리를 회색으로 번지게 (홈 Hero와 같은 방식). 글자는 1px, 56px 마크는 1px ≈ 6.6 단위 -->
    <svg width="0" height="0" aria-hidden="true" style="position:absolute">
        <filter id="nav-engrave" x="-5%" y="-5%" width="110%" height="110%">
            <feOffset in="SourceAlpha" dx="1" dy="1" result="shifted" />
            <feComposite in="SourceAlpha" in2="shifted" operator="out" result="edge" />
            <feGaussianBlur in="edge" stdDeviation="0.8" result="soft" />
            <feFlood flood-color="#8a8a8a" result="gray" />
            <feComposite in="gray" in2="soft" operator="in" result="blurred" />
            <feComposite in="blurred" in2="SourceAlpha" operator="in" result="band" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="band" /></feMerge>
        </filter>
        <filter id="nav-engrave-mark" x="-5%" y="-5%" width="110%" height="110%">
            <feOffset in="SourceAlpha" dx="7" dy="7" result="shifted" />
            <feComposite in="SourceAlpha" in2="shifted" operator="out" result="edge" />
            <feGaussianBlur in="edge" stdDeviation="5" result="soft" />
            <feFlood flood-color="#8a8a8a" result="gray" />
            <feComposite in="gray" in2="soft" operator="in" result="blurred" />
            <feComposite in="blurred" in2="SourceAlpha" operator="in" result="band" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="band" /></feMerge>
        </filter>
    </svg>
{/if}

<section class="nav-section" class:has-image={image} class:bg={bg && !image} class:has-bottom={bg && !image && bgBottom} style:--bg-bottom={bgBottom ? `url(${bgBottom})` : null} style:--py={scrollY * 0.5}>
    {#if bg && !image}
        <div class="bg-img" style:background-image="url({bgImage})" style:filter={bgSaturate === 1 ? null : `saturate(${bgSaturate})`} style:--dim={bgDim}></div>
    {/if}
    <h1>{title}</h1>
    <h3>{subtitle}</h3>
    {#if !image}
        <LogoDivider light={bg} />
    {/if}

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
    .nav-section:not(.has-image) {
        min-height: 560px;
        padding-top: 9rem;
        padding-bottom: 3rem;
    }

    .nav-section.bg {
        background-color: var(--color-green-500);
        color: #fff;
        isolation: isolate;

        .bg-img {
            position: absolute;
            inset: 0;
            z-index: -1;
            background-size: cover;
            background-position: center;

            &::after {
                content: '';
                position: absolute;
                inset: 0;
                background: rgba(36, 45, 32, var(--dim, 0));
            }
        }

        h1, h3 {
            color: #fff;
            opacity: 0.9;
            filter: url(#nav-engrave);
        }

        /* 초록 배경 위라 필터 메뉴도 흰색, 활성은 굵기+밑줄로 구분 */
        .filter-nav { border-bottom: 0; margin-top: var(--space-5); }
        .filter-btn,
        .filter-btn:hover,
        .filter-btn.active { color: #fff; }
    }

    /* 위: main_bg 유지, 아래: bgBottom 이미지로 마스크 그라데이션 전환 */
    .nav-section.has-bottom {
        overflow: hidden;
        &::before {
            content: '';
            position: absolute;
            inset: 0;
            background: var(--bg-bottom) center / cover;
            transform: translateY(min(calc(var(--py, 0) * 1px), 30%));
            will-change: transform;
            filter: brightness(0.25);
            mask-image: linear-gradient(to bottom, transparent 25%, rgba(0, 0, 0, 1) 100%);
        }
        > :global(*) { position: relative; }
    }

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
