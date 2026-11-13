<script>
    import { untrack } from 'svelte';
    import { ChevronLeft, ChevronRight } from 'lucide-svelte';
    import StatusMessage from '$lib/components/ui/StatusMessage.svelte';
    import { PIANOLIFE_BACKEND_URL } from "$env/static/public";
    import concertHeroFallback from "@/assets/images/white.png";
    import concertBg from "@/assets/images/background/concert_bg4.webp";
    import PrevConcertCard from "@/components/concerts/PrevConcertCard.svelte";
    import ConcertCard from "@/components/concerts/ConcertCard.svelte";
    import NavSection from "@/components/common/NavSection.svelte";

    const API = PIANOLIFE_BACKEND_URL || "http://localhost:8000";

    // ── 지난 공연: 폭에 따라 열 수가 바뀌고, 한 페이지 = 열 × 2행 ──
    const PREV_ROWS = 2;
    const PREV_MIN_CARD = 180; // 카드 최소 너비(px)
    const PREV_GAP = 24;       // 카드 간격(px)
    const PREV_MIN_COLS = 2;
    const PREV_MAX_COLS = 5;
    const PREV_FETCH_MAX = 60; // 백엔드 limit 상한

    let upcomingConcerts = $state([]);
    let prevItems = $state([]);  // 지금까지 불러온 지난 공연(순서대로, 페이지 크기와 무관)
    let prevPage = $state(0);    // 현재 보이는 페이지 index
    let prevRect = $state(null); // 그리드가 들어갈 콘텐츠 영역 크기
    let loadingUpcoming = $state(true);
    let loadingPrev = $state(false);
    let hasMorePrev = $state(true);
    let prevError = $state(null);
    let error = $state(null);

    let prevController = null;
    let lastPrevSize = 0;

    const prevCols = $derived(
        prevRect?.width
            ? Math.min(PREV_MAX_COLS, Math.max(PREV_MIN_COLS, Math.floor((prevRect.width + PREV_GAP) / (PREV_MIN_CARD + PREV_GAP))))
            : 0
    );
    const prevSize = $derived(prevCols * PREV_ROWS);
    const prevPages = $derived.by(() => {
        const pages = [];
        if (!prevSize) return pages;
        for (let i = 0; i < prevItems.length; i += prevSize) pages.push(prevItems.slice(i, i + prevSize));
        return pages;
    });
    // 다음 페이지 첫 항목까지 이미 받아 둔 경우에만 다음 페이지가 있다
    const hasMultiplePrevPages = $derived(prevSize > 0 && prevItems.length > prevSize);
    const canPrevNext = $derived(prevSize > 0 && prevItems.length > (prevPage + 1) * prevSize);

    /** prevItems를 count+1건까지 채운다(+1은 다음 페이지 존재 확인용). 끝에 닿으면 hasMorePrev=false. */
    async function ensurePrev(count) {
        if (loadingPrev || !prevController) return;
        loadingPrev = true;
        prevError = null;
        try {
            while (hasMorePrev && prevItems.length < count) {
                const requested = Math.min(PREV_FETCH_MAX, count - prevItems.length + 1);
                const res = await fetch(
                    `${API}/api/concerts/?active_only=true&schedule=past&summary=true&limit=${requested}&offset=${prevItems.length}`,
                    { signal: prevController.signal }
                );
                if (!res.ok) throw new Error(`서버 오류(지난 공연): ${res.status}`);
                const data = await res.json();
                prevItems = [...prevItems, ...data];
                hasMorePrev = data.length === requested;
            }
        } catch (err) {
            if (err.name !== 'AbortError') prevError = err.message;
        } finally {
            loadingPrev = false;
        }
    }

    async function prevPageBack() {
        if (prevPage > 0) { prevPage--; return; }
        // 첫 페이지에서 이전 → 마지막 페이지로 (남은 공연을 모두 받아야 끝을 알 수 있다)
        await ensurePrev(Infinity);
        if (!prevError) prevPage = Math.max(0, Math.ceil(prevItems.length / prevSize) - 1);
    }

    async function prevPageNext() {
        if (!canPrevNext) {
            prevPage = 0; // 마지막 페이지에서 다음 → 첫 페이지로
            return;
        }
        await ensurePrev((prevPage + 2) * prevSize); // 다음 페이지를 다 받은 뒤 슬라이드
        if (!prevError) prevPage++;
    }

    function retryPrev() {
        return prevItems.length === 0 ? ensurePrev(prevSize) : prevPageNext();
    }

    // 폭이 바뀌어 페이지 크기가 달라지면, 지금 보던 첫 카드가 있는 페이지로 옮기고 필요한 만큼 채운다
    $effect(() => {
        const size = prevSize;
        if (!size || loadingUpcoming) return;
        untrack(() => {
            if (lastPrevSize && lastPrevSize !== size) prevPage = Math.floor((prevPage * lastPrevSize) / size);
            lastPrevSize = size;
            ensurePrev((prevPage + 1) * size);
        });
    });

    $effect(() => {
        const controller = new AbortController();
        prevController = controller;

        fetch(`${API}/api/concerts/?active_only=true&schedule=upcoming&summary=true`, { signal: controller.signal })
            .then(res => {
                if (!res.ok) throw new Error(`서버 오류(예정 공연): ${res.status}`);
                return res.json();
            })
            .then(data => {
                upcomingConcerts = data;
            })
            .catch(err => {
                if (err.name !== 'AbortError') error = err.message;
            })
            .finally(() => {
                // First paint 이후 지난 공연 로드를 시작해 초기 체감 속도를 높임
                loadingUpcoming = false;
            });

        return () => controller.abort();
    });

    // ── 달력 상태 ─────────────────────────────────────────
    const today = new Date();

    let viewYear = $state(today.getFullYear());
    let viewMonth = $state(today.getMonth()); // 0-indexed

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    /** "2025-03-15 19:30" 또는 "2025년 3월 15일" → { year, month(0-indexed), day, timeStr } */
    function parseConcertDate(dateStr) {
        if (!dateStr) return null;
        const iso = dateStr.match(/(\d{4})-(\d{2})-(\d{2})(?:[\sT](\d{2}:\d{2}))?/);
        if (iso) return { year: +iso[1], month: +iso[2] - 1, day: +iso[3], timeStr: iso[4] ?? '' };
        const kr = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*(\d{1,2}:\d{2}))?/);
        if (kr) return { year: +kr[1], month: +kr[2] - 1, day: +kr[3], timeStr: kr[4] ?? '' };
        return null;
    }

    /** 예정 공연 중 가장 가까운 것의 배너 or 포스터 이미지 */
    const heroImage = $derived.by(() => {
        const c = upcomingConcerts[0];
        return c ? (c.banner_large_url || c.banner_mid_url || c.poster_large_url || c.poster_mid_url || concertHeroFallback) : concertHeroFallback;
    });

    /** 현재 뷰 월에 공연이 있는 day(숫자) Set - 예정 공연만 */
    const concertDaysInView = $derived.by(() => {
        const set = new Set();
        for (const c of upcomingConcerts) {
            const d = parseConcertDate(c.date);
            if (d && d.year === viewYear && d.month === viewMonth) set.add(d.day);
        }
        return set;
    });

    /** 달력 셀 배열 (null = 앞 빈 칸, 숫자 = 날짜) */
    const calendarCells = $derived.by(() => {
        const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const cells = Array(firstDayOfWeek).fill(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    });

    function prevMonth() {
        if (viewMonth === 0) { viewMonth = 11; viewYear--; }
        else viewMonth--;
    }
    function nextMonth() {
        if (viewMonth === 11) { viewMonth = 0; viewYear++; }
        else viewMonth++;
    }
</script>

<svelte:head>
    <title>Concerts - Fiore</title>
</svelte:head>

<div>   
    <NavSection
        title="Concerts"
        bg
        bgDim={0.6}
        bgBottom={concertBg}
    />

    <section class="description-section">
        <h2 class="section-title-left">
            아티스트를 위한 무대,
            <br>
            당신을 위한 클래식
        </h2>
        <div class="description-content">
            <p>
                피오레 아트앤엔터는 뛰어난 연주력을 갖춘 젊은 신예 아티스트들이 세상 밖으로 힘차게 발돋움할 수 있도록 <bold>기회의 무대</bold>를 엽니다.
                다채로운 <bold>독주회</bold>와 <bold>감각적인 테마 기획 연주회</bold>를 통해, 아티스트는 자신의 성장을 증명하고 관객은 그 벅찬 열정을 가장 가까이에서 호흡합니다.
                <br />
                내일의 거장이 탄생하는 그 빛나는 순간.
                연주자의 깊은 <bold>몰입</bold>과 관객의 높은 <bold>만족</bold>이 공존하는 최상의 무대를 선사합니다.
            </p>
            <br />
            <p>
                Fiore Art &amp; Ent. opens a <bold>stage of opportunity</bold> for talented young artists ready to make their mark on the world.
                Through diverse <bold>solo recitals</bold> and thoughtfully curated <bold>themed concerts</bold>, we invite audiences to witness the growth of these rising stars and share in the emotion of their journey.
                <br />
                Experience the shining moment where future maestros are born.
                We promise a performance that <bold>resonates deeply</bold>, delivering <bold>perfection for the artist and satisfaction</bold> for the audience.
            </p>
        </div>
    </section>

    <!-- ── 예정 공연 (달력 + 카드) ─────────────────── -->
    <section class="section-heading">
        <h2 class="heading-title">Upcoming</h2>
        <p class="heading-sub">다양한 장르와 스타일의 클래식 공연을 선보입니다</p>
    </section>

    <!-- 이 section 안에서만 calendar가 sticky; section이 끝나면 자동으로 사라짐 -->
    <section class="concerts-section">
        <div class="calendar-view">
            <div class="calendar-header">
                <button class="nav-btn" onclick={prevMonth}>&#8592;</button>
                <span class="month-label">{MONTH_NAMES[viewMonth]} {viewYear}</span>
                <button class="nav-btn" onclick={nextMonth}>&#8594;</button>
            </div>
            <div class="calendar-grid">
                {#each DAY_LABELS as label}
                    <div class="day-label">{label}</div>
                {/each}
                {#each calendarCells as cell}
                    {#if cell === null}
                        <div class="day-cell empty"></div>
                    {:else}
                        <div class="day-cell"
                            class:has-concert={concertDaysInView.has(cell)}
                            class:is-today={cell === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()}
                        >
                            {cell}
                        </div>
                    {/if}
                {/each}
            </div>
        </div>

        <div class="concerts-card-wrapper">
            {#if loadingUpcoming}
                {#each { length: 3 } as _}
                    <div class="card-skeleton"></div>
                {/each}
            {:else if upcomingConcerts.length === 0}
                <StatusMessage kind="empty" message="예정된 공연이 없습니다." />
            {:else}
                {#each upcomingConcerts as concert (concert.id)}
                    <ConcertCard {concert} />
                {/each}
            {/if}
        </div>
    </section>

    <!-- ── 지난 공연 (달력 없음, full width) ──────────── -->
    <!-- 폭 측정용(높이 0). 열 수 계산에 쓰므로 데이터가 없어도 항상 렌더 -->
    <section class="prev-concerts-section prev-measure" bind:contentRect={prevRect} aria-hidden="true"></section>

    {#if prevItems.length > 0 || loadingPrev || prevError}
        <section class="section-heading section-heading--prev">
            <h2 class="heading-title">Prev.</h2>
        </section>

        <section class="prev-concerts-section">
            <div class="prev-viewport">
                <div class="prev-track" style="transform: translateX(-{prevPage * 100}%); --cols: {prevCols}">
                    {#each prevPages as page, i}
                        <div class="prev-page" inert={i !== prevPage} aria-hidden={i !== prevPage}>
                            {#each page as concert (concert.id)}
                                <PrevConcertCard {concert} />
                            {/each}
                        </div>
                    {/each}
                    {#if prevPages.length === 0 && loadingPrev}
                        <div class="prev-page">
                            {#each { length: prevSize } as _}
                                <div class="prev-skeleton"></div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>

            {#if prevPages.length > 0}
                <div class="prev-pager">
                    <button class="arrow" onclick={prevPageBack} disabled={!hasMultiplePrevPages || loadingPrev} aria-label="이전 페이지">
                        <ChevronLeft size={22} />
                    </button>
                    <span aria-live="polite">{prevPage + 1}{hasMorePrev ? '' : ` / ${prevPages.length}`}</span>
                    <button class="arrow" onclick={prevPageNext} disabled={!hasMultiplePrevPages || loadingPrev} aria-label="다음 페이지">
                        <ChevronRight size={22} />
                    </button>
                </div>
            {/if}

            {#if prevError}
                <div class="prev-error">
                    <StatusMessage kind="error" message={prevError} />
                    <button class="retry-btn" onclick={retryPrev}>다시 시도</button>
                </div>
            {/if}
        </section>
    {/if}
</div>

<style lang="scss">
    section {
        max-width: 1400px;
        margin: 0 auto;
    }

    .description-section {
        display: grid;
        grid-template-columns: 450px 1fr;
        padding: 4rem 2rem;
        gap: 2rem;

        @media(--desktop) {
            grid-template-columns: 1fr;
        }   
        @media(--tablet) {
            gap: 1.5rem;
        }
    }

    /* ── 섹션 헤딩 ──────────────────────── */
    .section-heading {
        padding: 0 2rem 1.5rem;
        border-bottom: 1px solid var(--color-green-200);

        &--prev {
            margin-top: 5rem;
        }

        .heading-title {
            font-size: 1.8rem;
            font-weight: 200;
            letter-spacing: 0.08em;
            margin: 0 0 0.3rem;
        }

        .heading-sub {
            font-size: 0.85rem;
            font-weight: 300;
            color: var(--color-green-700);
            margin: 0;
        }
    }

    /* ── 예정 공연 섹션 (2-col: 달력 | 카드) ─── */
    .concerts-section {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 3rem;
        padding: 2rem;
        align-items: start;
        margin-top: 1rem;

        @media(--desktop) {
            grid-template-columns: 240px 1fr;
            gap: 2rem;
        }
        @media(--tablet) {
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 1rem;
        }
        @media(--mobile) {
            gap: 1.5rem;
            padding: 0.5rem;
        }
    }

    /* ── 지난 공연 섹션 (full width) ────── */
    .prev-concerts-section {
        padding: 2rem 2rem 6rem;
        margin-top: 1rem;

        @media(--mobile) {
            padding: 1rem 0.75rem 4rem;
        }
    }

    .prev-viewport { overflow: hidden; }

    .prev-track {
        display: flex;
        transition: transform 0.5s ease-in-out;
        will-change: transform;
    }

    .prev-page {
        flex: 0 0 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
        gap: 2rem 1.5rem;
        align-content: start;

        @media(--mobile) { gap: 1.25rem 0.75rem; }
    }

    .prev-concerts-section.prev-measure {
        height: 0;
        margin-top: 0;
        padding-block: 0;
        overflow: hidden;
    }

    .prev-skeleton {
        aspect-ratio: 3 / 4;
        background: var(--color-green-100);
        animation: shimmer 1.4s infinite;
    }

    .prev-pager {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1.5rem;
        margin-top: 2.5rem;
        font-size: 0.85rem;
        font-weight: 300;
        letter-spacing: 0.06em;

        /* 메인 페이지 콘서트 캐러셀(dashboard.svelte)의 .arrow와 동일 */
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

            &:hover:not(:disabled) { color: var(--color-green-500); }
            &:disabled { opacity: 0.3; cursor: default; }
        }
    }

    .prev-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding-top: 1.5rem;
    }

    .retry-btn {
        background: none;
        border: 1px solid var(--color-green-200);
        padding: 0.5rem 1.25rem;
        cursor: pointer;
        color: inherit;
    }

    /* ── 캘린더 ─────────────────────────── */
    .calendar-view {
        position: sticky;
        top: 100px;
        border: 1px solid var(--color-green-200);
        padding: 1.25rem;
        margin: 0 auto;
        min-width: 280px;

        @media(--desktop) {
            min-width: 240px;
        }

        @media(--tablet) {
            position: static;
            min-width: 300px;
        }

        @media(--mobile) {
            min-width: 200px;
            padding: 0.5rem;
        }
    }

    .calendar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;

        .month-label {
            font-size: 0.9rem;
            font-weight: 400;
            letter-spacing: 0.04em;
        }

        .nav-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            color: var(--color-on-surface);
            padding: 0.25rem 0.5rem;
            line-height: 1;
            transition: color 0.15s;

            &:hover { color: #000; }
        }
    }

    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;

        @media(--mobile) {
            gap: 1px;
        }
    }

    .day-label {
        text-align: center;
        font-size: 0.6rem;
        font-weight: 500;
        color: var(--color-green-600);
        letter-spacing: 0.02em;
        padding-bottom: 0.4rem;
    }

    .day-cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.72rem;
        font-weight: 300;
        color: var(--color-on-surface);
        border-radius: var(--radius);

        &.has-concert {
            background: var(--color-on-surface);
            color: var(--color-on-primary);
            font-weight: 400;
        }

        &.is-today:not(.has-concert) {
            background: var(--color-green-100);
            font-weight: 500;
            color: var(--color-on-surface);
        }
    }

    /* ── 공통 카드 래퍼 ─────────────────── */
    .concerts-card-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;

        max-height: 800px;
        overflow-y: auto;
    }

    /* ── 스켈레톤 ───────────────────────── */
    .card-skeleton {
        height: 150px;
        border: 0.5px solid var(--color-green-200);
        margin-bottom: -0.5px;
        background: var(--color-green-100);
        animation: shimmer 1.4s infinite;
    }

    @keyframes shimmer {
        50% { opacity: 0.5; }
    }

    .empty-message {
        color: var(--color-green-600);
        font-size: 0.9rem;
        font-weight: 300;
        padding: 3rem 0;
        text-align: center;
    }
</style>
