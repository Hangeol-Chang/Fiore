<script>
    import { ChevronLeft, ChevronRight } from 'lucide-svelte';
    import StatusMessage from '$lib/components/ui/StatusMessage.svelte';
    import { onMount } from 'svelte';
    import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
    import MoreButton from '@/components/common/moreButton.svelte';
    import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';

    const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

    // ── 날짜 파싱 / 기간 판별 ──────────────────────────────
    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);

    function parseConcertDate(dateStr) {
        if (!dateStr) return null;
        const iso = dateStr.match(/(\d{4})-(\d{2})-(\d{2})(?:[\sT](\d{2}:\d{2}))?/);
        if (iso) return { year: +iso[1], month: +iso[2] - 1, day: +iso[3] };
        const kr = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
        if (kr) return { year: +kr[1], month: +kr[2] - 1, day: +kr[3] };
        return null;
    }

    function isConcertPast(dateStr) {
        const d = parseConcertDate(dateStr);
        if (!d) return false;
        return new Date(d.year, d.month, d.day) < todayDateOnly;
    }

    // ── 캐러셀 상태 ──────────────────────────────────────
    let rawConcerts = $state([]);
    let loading = $state(true);

    // 아직 기간이 안 지난 공연만 + 날짜 오름차순
    const upcomingConcerts = $derived(
        rawConcerts
            .filter(c => !isConcertPast(c.date))
            .sort((a, b) => {
                const da = parseConcertDate(a.date);
                const db = parseConcertDate(b.date);
                if (!da || !db) return 0;
                return new Date(da.year, da.month, da.day) - new Date(db.year, db.month, db.day);
            })
    );

    // ── 캐러셀: 한 번에 한 공연, 화살표/점/자동 넘김 ─────
    const AUTO_MS = 5000;
    let index = $state(0);
    let paused = $state(false);
    const count = $derived(upcomingConcerts.length);
    const current = $derived(upcomingConcerts[index] ?? null);

    const go = (i) => { index = count ? (i + count) % count : 0; };

    // index가 바뀔 때마다 타이머를 새로 걸어 수동 조작 후 다시 5초를 센다
    $effect(() => {
        index;
        if (paused || count < 2) return;
        const t = setTimeout(() => go(index + 1), AUTO_MS);
        return () => clearTimeout(t);
    });

    onMount(async () => {
        try {
            const res = await fetch(`${API}/api/concerts/?active_only=false&summary=true`);
            if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
            rawConcerts = await res.json();
        } catch (e) {
            console.error('콘서트 로딩 실패:', e);
        } finally {
            loading = false;
        }
    });
</script>

<section>
    <h1 class="section-title-center">Concerts</h1>
    <MoreButton href="/concerts" />

    <div class="show-wrapper">
        {#if loading}
            <div class="card-skeleton"></div>
        {:else if !current}
            <StatusMessage kind="empty" message="예정된 공연이 없습니다." />
        {:else}
            <div
                class="carousel"
                role="region"
                aria-roledescription="carousel"
                aria-label="Concert Carousel"
                onmouseenter={() => (paused = true)}
                onmouseleave={() => (paused = false)}
                onfocusin={() => (paused = true)}
                onfocusout={() => (paused = false)}
            >
                <div class="viewport">
                    <div class="track" style="transform: translateX(-{index * 100}%)">
                        {#each upcomingConcerts as c, i (c.id)}
                            <div class="slide" aria-hidden={i !== index} inert={i !== index}>
                                <div class="concert-show">
                                    <a class="poster" href="/concerts/{c.id}" aria-label={c.title}>
                                        {#if c.poster_thumb_url || c.poster_mid_url || c.poster_url}
                                            <ResponsiveImage
                                                src={c.poster_url}
                                                thumb={c.poster_thumb_url} mid={c.poster_mid_url} large={c.poster_large_url}
                                                width={c.poster_width} height={c.poster_height}
                                                sizes="(max-width: 768px) 80vw, 360px"
                                                alt={c.title}
                                            />
                                        {:else}
                                            <div class="poster-placeholder"></div>
                                        {/if}
                                    </a>
                                    <div class="info">
                                        <p class="idx">{String(i + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</p>
                                        <h3>{c.title}</h3>
                                        <p class="date">{c.date}</p>
                                        {#if c.location}<p class="loc">{c.location}</p>{/if}
                                        <a class="view-detail" href="/concerts/{c.id}">view detail +</a>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                {#if count > 1}
                    <div class="controls">
                        <button class="arrow" onclick={() => go(index - 1)} aria-label="이전 공연">
                            <ChevronLeft size={22} />
                        </button>
                        <div class="dots">
                            {#each upcomingConcerts as c, i (c.id)}
                                <button class:on={i === index} onclick={() => go(i)} aria-label="{i + 1}번째 공연" aria-current={i === index}></button>
                            {/each}
                        </div>
                        <button class="arrow" onclick={() => go(index + 1)} aria-label="다음 공연">
                            <ChevronRight size={22} />
                        </button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</section>

<style lang="scss">
    .show-wrapper {
        max-width: var(--content-max);
        margin: 3rem auto 0;
        padding: 0 5vw;
    }

    .viewport { overflow: hidden; }

    .track {
        display: flex;
        transition: transform var(--dur-slow) ease;
    }

    .slide { flex: 0 0 100%; min-width: 0; box-sizing: border-box; padding: 0 var(--space-3); } /* 좌우 여백: 다음 슬라이드 가장자리가 비쳐 보이지 않게 */

    .concert-show {
        display: grid;
        grid-template-columns: minmax(200px, 360px) 1fr;
        gap: var(--space-5);
        align-items: start;

        @media (--tablet) {
            grid-template-columns: 1fr;
            gap: var(--space-4);
        }
    }

    .poster {
        display: block;

        :global(img),
        .poster-placeholder {
            display: block;
            width: 100%;
            height: auto; /* img height 속성(힌트)이 aspect-ratio를 덮어쓰는 것 방지 */
            aspect-ratio: 3 / 4;
            object-fit: cover;
            background: var(--color-green-100);
        }

        @media (--tablet) {
            max-width: 360px;
            margin: 0 auto;
            width: 100%;
        }
    }

    .info {
        display: flex;
        flex-direction: column;

        p { margin: 0 0 var(--space-1); }

        h3 {
            font-weight: 100;
            font-size: clamp(28px, 4vw, 48px);
            line-height: 1.15;
            margin: var(--space-2) 0;
            text-align: left;
        }

        .idx { font-size: 13px; letter-spacing: 0.2em; color: var(--color-green-500); }
        .date { font-size: 20px; font-weight: 200; }
        .loc { color: var(--color-placeholder); }
    }

    .view-detail {
        align-self: flex-end;
        margin-top: var(--space-3);
        font-size: 0.85rem;
        font-weight: 300;
        letter-spacing: 0.1em;
        text-transform: lowercase;
        color: var(--color-green-700);
        text-decoration: none;
    }

    .controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        margin-top: var(--space-5);
    }

    .arrow {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: 0;
        background: none;
        color: var(--color-green-700);
        cursor: pointer;

        &:hover { color: var(--color-green-500); }
    }

    .dots {
        display: flex;
        gap: var(--space-2);

        button {
            width: 8px;
            height: 8px;
            padding: 0;
            border: 0;
            border-radius: 50%;
            background: var(--color-green-200);
            cursor: pointer;
            transition: background var(--dur-fast);

            &.on { background: var(--color-green-500); }
        }
    }

    .card-skeleton {
        width: 100%;
        max-width: 360px;
        aspect-ratio: 3 / 4;
        background: var(--color-green-100);
    }
</style>
