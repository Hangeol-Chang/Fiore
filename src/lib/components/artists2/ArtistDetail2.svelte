<script>
    import ArtistCard from "$lib/components/artists/ArtistCard.svelte";
    import ArtistInlineDetail from "$lib/components/artists/ArtistInlineDetail.svelte";
    import { slide } from "svelte/transition";

    let { artist } = $props();
    let activeTab = $state('profile');

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top, behavior: 'smooth' });
            activeTab = id;
        }
    };

    const careerLines = $derived(
        artist.career
            ? artist.career.split('\n').map(l => l.trim()).filter(Boolean)
            : []
    );

    const videos = $derived(artist.videos || []);
    const isGroupArtist = $derived(artist.role_name === 'group');
    const groupMembers = $derived(artist.group_artists || []);
    let expandedMemberId = $state(null);
    let membersGridEl = $state(null);
    let memberColumns = $state(1);

    const expandedMember = $derived(groupMembers.find((member) => member.id === expandedMemberId) || null);
    const expandedMemberIndex = $derived(groupMembers.findIndex((member) => member.id === expandedMemberId));
    const expandedRowEndIndex = $derived(
        expandedMemberIndex < 0
            ? -1
            : Math.min(
                groupMembers.length - 1,
                (Math.floor(expandedMemberIndex / memberColumns) + 1) * memberColumns - 1,
            )
    );

    function updateMemberColumns() {
        if (!membersGridEl) return;
        const style = getComputedStyle(membersGridEl);
        const parsed = style.gridTemplateColumns.split(' ').filter(Boolean).length;
        memberColumns = Math.max(1, parsed || 1);
    }

    function observeMembersGrid(node) {
        const observer = new ResizeObserver(() => {
            updateMemberColumns();
        });
        observer.observe(node);
        updateMemberColumns();
        return {
            destroy() {
                observer.disconnect();
            },
        };
    }

    function toggleMemberInline(member) {
        if (member.role_name !== 'group_artist') return;
        expandedMemberId = expandedMemberId === member.id ? null : member.id;
    }

    let currentVideoIndex = $state(0);
    let dragOffset = $state(0);
    let isDragging = $state(false);
    let dragStartX = 0;
    let viewportEl = $state(null);

    $effect(() => {
        const _ = artist.id ?? artist.name;
        currentVideoIndex = 0;
        expandedMemberId = null;
    });

    function prevVideo() {
        if (currentVideoIndex > 0) currentVideoIndex--;
    }
    function nextVideo() {
        if (currentVideoIndex < videos.length - 1) currentVideoIndex++;
    }
    function handlePointerDown(e) {
        isDragging = true;
        dragStartX = e.clientX;
        dragOffset = 0;
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    function handlePointerMove(e) {
        if (!isDragging) return;
        dragOffset = e.clientX - dragStartX;
    }
    function getSlidePx() {
        if (!viewportEl) return 0;
        const slide = viewportEl.querySelector('.carousel-slide');
        if (!slide) return viewportEl.offsetWidth;
        const style = getComputedStyle(slide);
        return slide.offsetWidth
            + (parseFloat(style.marginLeft) || 0)
            + (parseFloat(style.marginRight) || 0);
    }
    function handlePointerUp() {
        if (!isDragging) return;
        isDragging = false;
        const step = getSlidePx();
        if (step > 0) {
            const threshold = step * 0.25;
            if (dragOffset < -threshold && currentVideoIndex < videos.length - 1) {
                currentVideoIndex++;
            } else if (dragOffset > threshold && currentVideoIndex > 0) {
                currentVideoIndex--;
            }
        }
        dragOffset = 0;
    }

    const concerts = $derived(
        (artist.concerts || [])
            .slice()
            .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
            .slice(0, 4)
    );

    const detailTabs = $derived([
        'profile',
        ...(videos.length > 0 ? ['video'] : []),
        ...(concerts.length > 0 ? ['concert'] : []),
        ...(isGroupArtist ? ['members'] : []),
        ...(artist.notice ? ['notice'] : []),
    ]);

    const focusY = $derived(artist.image_focus_y ?? 50);
</script>

<div class="artist-detail-page">
    <!-- 히어로: 좌우 분할 – 텍스트와 이미지를 명확히 분리해 그라데이션 마스크 없이 구성 -->
    <section class="hero">
        <div class="hero-media">
            <img
                src={artist.mid_url || artist.image_url}
                alt={artist.name}
                style="object-position: center {focusY}%;"
            />
        </div>

        <div class="hero-info">
            <div class="hero-info-inner">
                <span class="eyebrow">{isGroupArtist ? 'Ensemble' : 'Artist'}</span>
                <h1 class="name-en">{artist.name_en ?? ''}</h1>
                <h2 class="name-kr">{artist.name}</h2>

                {#if artist.headline}
                    <p class="headline">{@html artist.headline}</p>
                {/if}

                <button class="scroll-cue" onclick={() => scrollToSection('profile')}>
                    <span>Profile</span>
                    <span class="scroll-cue-arrow">&darr;</span>
                </button>
            </div>
        </div>
    </section>

    <!-- 본문 -->
    <div class="content-container">
        <main class="main-content">
            <!-- Profile -->
            <section id="profile" class="detail-section">
                {#if careerLines.length > 0}
                    <div class="career-group">
                        <h3 class="section-header">Career</h3>
                        <ul class="career-list">
                            {#each careerLines as item}
                                <li class="career-item">• {item}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                {#if artist.description}
                    <div class="description-text">
                        <p>{artist.description}</p>
                    </div>
                {/if}
            </section>

            <!-- Video -->
            {#if videos.length > 0}
            <section id="video" class="detail-section video-section">
                <h3 class="section-header">Video</h3>
                <div class="video-carousel">
                    <button
                        class="carousel-btn carousel-prev"
                        onclick={prevVideo}
                        disabled={currentVideoIndex === 0}
                        aria-label="이전 영상"
                    >&#8249;</button>

                    <div class="carousel-outer">
                    <div
                        class="carousel-viewport"
                        class:dragging={isDragging}
                        role="region"
                        aria-label="비디오 캐러셀"
                        bind:this={viewportEl}
                        onpointerdown={handlePointerDown}
                        onpointermove={handlePointerMove}
                        onpointerup={handlePointerUp}
                        onpointercancel={handlePointerUp}
                    >
                        <div
                            class="carousel-track"
                            style="transform: translateX(calc({-currentVideoIndex * getSlidePx()}px + {dragOffset}px)); transition: {isDragging ? 'none' : 'transform 0.35s ease'};"
                        >
                            {#each videos as v}
                                <div class="carousel-slide">
                                    <div class="video-wrap">
                                        <iframe
                                            src="https://www.youtube.com/embed/{v.id}"
                                            title={v.description ?? v.id}
                                            frameborder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowfullscreen
                                        ></iframe>
                                        {#if v.description}
                                            <p class="video-desc">{v.description}</p>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                    </div>

                    <button
                        class="carousel-btn carousel-next"
                        onclick={nextVideo}
                        disabled={currentVideoIndex === videos.length - 1}
                        aria-label="다음 영상"
                    >&#8250;</button>
                </div>

                {#if videos.length > 1}
                <div class="carousel-dots">
                    {#each videos as _, i}
                        <button
                            class="dot"
                            class:active={i === currentVideoIndex}
                            onclick={() => currentVideoIndex = i}
                            aria-label="영상 {i + 1}"
                        ></button>
                    {/each}
                </div>
                {/if}
            </section>
            {/if}

            <!-- Concert -->
            {#if concerts.length > 0}
            <section id="concert" class="detail-section">
                <h3 class="section-header">Concert</h3>
                <div class="concert-grid">
                    {#each concerts as c}
                        <a href="/concerts/{c.id}" class="concert-card">
                            <div class="concert-poster">
                                {#if c.poster_url}
                                    <img src={c.poster_url} alt={c.title} />
                                {:else}
                                    <div class="concert-poster-placeholder"></div>
                                {/if}
                            </div>
                            <div class="concert-card-info">
                                {#if c.date}
                                    <span class="concert-date">{c.date}</span>
                                {/if}
                                <span class="concert-title">{c.title}</span>
                            </div>
                        </a>
                    {/each}
                </div>
            </section>
            {/if}

            <!-- Members (Group 전용) -->
            {#if isGroupArtist}
            <section id="members" class="detail-section">
                <h3 class="section-header">Members</h3>
                {#if groupMembers.length > 0}
                    <div class="members-grid" bind:this={membersGridEl} use:observeMembersGrid>
                        {#each groupMembers as member, index (member.id)}
                            <div
                                class="member-slot"
                                class:active={expandedMemberId === member.id}
                                class:dimmed={expandedMemberId !== null && expandedMemberId !== member.id}
                            >
                                {#if member.role_name === 'group_artist'}
                                    <button
                                        type="button"
                                        class="member-card-trigger"
                                        class:active={expandedMemberId === member.id}
                                        onclick={() => toggleMemberInline(member)}
                                        aria-expanded={expandedMemberId === member.id}
                                        aria-controls={`member-inline-detail-${member.id}`}
                                    >
                                        <ArtistCard artist={member} />
                                    </button>
                                {:else}
                                    <ArtistCard artist={member} />
                                {/if}
                            </div>

                            {#if expandedMember && index === expandedRowEndIndex}
                                <div
                                    id={`member-inline-detail-${expandedMember.id}`}
                                    class="member-inline-panel full-width"
                                    in:slide={{ duration: 240 }}
                                    out:slide={{ duration: 220 }}
                                >
                                    <ArtistInlineDetail artist={expandedMember} />
                                </div>
                            {/if}
                        {/each}
                    </div>
                {:else}
                    <p class="members-empty">등록된 그룹 멤버가 없습니다.</p>
                {/if}
            </section>
            {/if}

            <!-- Notice -->
            {#if artist.notice}
            <section id="notice" class="detail-section">
                <h3 class="section-header">Notice</h3>
                <div class="notice-text">
                    <p>{artist.notice}</p>
                </div>
            </section>
            {/if}
        </main>

        <!-- 우: 섹션 내비게이션 (PC) -->
        <nav class="right-nav">
            <ul class="nav-list">
                {#each detailTabs as tab}
                    <li class:active={activeTab === tab}>
                        <button onclick={() => scrollToSection(tab)}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    </li>
                {/each}
            </ul>
        </nav>
    </div>
</div>

<style lang="scss">
    .artist-detail-page {
        width: 100%;
    }

    /* ── Hero: 좌우 분할, 그라데이션 마스크 없음 ── */
    .hero {
        display: flex;
        min-height: 88vh;
        background: #fff;

        @media (--tablet) {
            flex-direction: column;
            min-height: auto;
        }
    }

    .hero-media {
        position: relative;
        overflow: hidden;
        aspect-ratio: 3 / 4;
        flex: 0 0 680px;
        max-width: 58%;
        margin-left: auto;

        @media (--tablet) {
            flex-basis: auto;
            max-width: 100%;
            width: 100%;
            margin: 0 auto;
            aspect-ratio: 18 / 9;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
    }

    .hero-info {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        flex: 1 1 200px;
        min-width: 200px;
        padding: 5rem 4vw 3rem;

        @media (--tablet) {
            flex-basis: auto;
            padding: 2.5rem 1rem 3.5rem;
        }
    }

    .hero-info-inner {
        max-width: 460px;
        width: 100%;

        .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            font-weight: 400;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #8BBad4;
            margin-bottom: 1.5rem;
        }

        .name-en {
            font-weight: 100;
            letter-spacing: 0.05em;
            color: #111;
            font-size: 2.6rem;
            line-height: 1.1;
            margin: 0 0 0.6rem;

            @media (--tablet) {
                font-size: 2rem;
            }
        }

        .name-kr {
            font-weight: 200;
            letter-spacing: 0.3em;
            color: rgba(0, 0, 0, 0.45);
            font-size: 1.15rem;
            margin: 0 0 2.25rem;
        }

        .headline {
            font-family: 'GounBatang', serif;
            font-weight: 300;
            font-size: 1.05rem;
            line-height: 1.9;
            color: rgba(0, 0, 0, 0.75);
            border-top: 1px solid rgba(0, 0, 0, 0.12);
            padding-top: 1.75rem;
            margin: 0 0 2.5rem;
        }

        .scroll-cue {
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            color: rgba(0, 0, 0, 0.4);
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            transition: color 0.2s ease;

            &:hover {
                color: #000;
            }

            .scroll-cue-arrow {
                display: inline-block;
                animation: bob 1.6s ease-in-out infinite;
            }
        }
    }

    @keyframes bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(4px); }
    }

    /* ── 본문 컨테이너 ──────────────────── */
    .content-container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 4rem 1.5rem 0 0;
        display: grid;
        grid-template-columns: 1fr 120px;
        position: relative;
        gap: 2rem;

        @media (--desktop) {
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }
    }

    .main-content {
        min-width: 0;
    }

    .detail-section {
        margin-top: 0;
        margin-bottom: 5rem;
        scroll-margin-top: 120px;

        @media(--tablet) {
            margin-left: 1rem;
            margin-right: 1rem;
        }
    }

    .section-header {
        font-size: 1.1rem;
        font-weight: 600;
        color: #333;
        border-bottom: 1px solid #eee;
        padding-bottom: 0.75rem;
        margin-bottom: 1.5rem;
    }

    /* ── Profile ────────────────────────── */
    .career-group {
        margin-bottom: 2rem;

        .career-list {
            list-style: none;

            .career-item {
                font-size: 0.9rem;
                font-weight: 300;
                line-height: 1.9;
                color: #333;
            }
        }
    }

    .description-text {
        font-size: 0.92rem;
        line-height: 1.9;
        font-weight: 300;
        color: #555;

        p {
            white-space: pre-wrap;
        }
    }

    .members-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(140px, 1fr));
        gap: 1rem;

        @media (--desktop) {
            grid-template-columns: repeat(3, minmax(100px, 1fr));
            gap: 0.75rem;
        }

        @media (--mobile) {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.6rem;
        }
    }

    .member-slot {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        transition: opacity 0.22s ease, filter 0.22s ease;

        &.dimmed {
            opacity: 0.34;
            filter: grayscale(0.3) saturate(0.65);
        }
    }

    .member-card-trigger {
        border: 0;
        padding: 0;
        background: transparent;
        text-align: left;
        border-radius: 2px;
        width: 100%;
        transition: box-shadow 0.2s ease, outline-color 0.2s ease;
    }

    .member-inline-panel {
        margin-top: 1.5rem;

        &.full-width {
            grid-column: 1 / -1;
            margin-top: 0.4rem;
        }
    }

    .members-empty {
        color: #888;
        font-size: 0.9rem;
        font-weight: 300;
    }

    /* ── Video Carousel ─────────────────── */
    .video-section {
        padding-bottom: 1.5rem;
    }

    .video-carousel {
        --peek: 48px;
        --slide-gap: 14px;
        display: flex;
        align-items: center;
        gap: 1rem;

        @media (--tablet) {
            --peek: 28px;
            --slide-gap: 10px;
            gap: 0;
        }
    }

    .carousel-outer {
        flex: 1;
        overflow: hidden;
        min-width: 0;
    }

    .carousel-viewport {
        overflow: visible;
        touch-action: pan-y;
        cursor: grab;
        user-select: none;

        &:active {
            cursor: grabbing;
        }
    }

    .carousel-track {
        display: flex;
        will-change: transform;
        padding-left: calc(var(--peek) - var(--slide-gap) / 2);
    }

    .carousel-slide {
        flex: 0 0 calc(100% - 2 * var(--peek));
        margin: 0 calc(var(--slide-gap) / 2);
        box-sizing: border-box;
    }

    .video-wrap {
        iframe {
            width: 100%;
            aspect-ratio: 16/9;
            border: none;
            display: block;
        }
        .video-desc {
            font-size: 0.82rem;
            color: #888;
            margin-top: 0.4rem;
            margin-left: 0;
            text-wrap: none;
        }
    }

    .carousel-viewport.dragging .video-wrap iframe {
        pointer-events: none;
    }

    .carousel-btn {
        width: 40px;
        height: 40px;
        border: 1px solid #ddd;
        background: white;
        font-size: 1.75rem;
        cursor: pointer;
        display: flex;
        height: 40px;

        text-align: center;
        justify-content: center;
        transition: background 0.2s, opacity 0.2s;
        color: #444;
        padding: 0;

        &:hover:not(:disabled) {
            background: #f0f0f0;
        }

        &:disabled {
            opacity: 0.25;
            cursor: default;
        }

        @media (--tablet) {
            display: none;
        }

        &.carousel-prev {
            border-radius: 0 20px 20px 0;
            border-left: none;
        }
        &.carousel-next {
            border-radius: 20px 0 0 20px;
            border-right: none;
        }
    }

    .carousel-dots {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 1rem;

        .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            border: none;
            background: #ccc;
            padding: 0;
            cursor: pointer;
            transition: background 0.2s, transform 0.2s;

            &.active {
                background: #333;
                transform: scale(1.4);
            }
        }
    }

    /* ── Concert ────────────────────────── */
    .concert-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;

        @media (--tablet) {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
        }

        @media (--mobile) {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
        }
    }

    .concert-card {
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: opacity 0.2s;

        &:hover { opacity: 0.75; }

        .concert-poster {
            width: 100%;
            aspect-ratio: 2/3;
            overflow: hidden;
            background: #111;

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }

            .concert-poster-placeholder {
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1a1a1a, #333);
            }
        }

        .concert-card-info {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;

            .concert-date {
                font-size: 0.75rem;
                color: #aaa;
                font-weight: 300;
            }

            .concert-title {
                font-size: 0.85rem;
                font-weight: 300;
                color: #222;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
        }
    }

    /* ── Notice ─────────────────────────── */
    .notice-text {
        font-size: 0.92rem;
        line-height: 1.9;
        font-weight: 300;
        color: #444;
        white-space: pre-wrap;
    }

    /* ── 우 내비게이션 (PC) ─────────────── */
    .right-nav {
        display: block;
        width: 120px;
        flex-shrink: 0;
        position: sticky;
        top: 250px;
        align-self: start;
        text-align: right;

        @media (--desktop) {
            display: none;
        }

        .nav-list {
            list-style: none;
            padding: 0;
            margin: 0;

            li {
                margin-bottom: 1.5rem;

                button {
                    background: none;
                    border: none;
                    font-size: 1rem;
                    font-weight: 300;
                    color: #bbb;
                    cursor: pointer;
                    transition: color 0.2s;
                    text-transform: capitalize;

                    &:hover { color: #222; }
                }

                &.active button {
                    color: #000;
                    font-weight: 500;
                }
            }
        }
    }
</style>
