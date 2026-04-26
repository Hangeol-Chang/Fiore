<script>
    import { PIANOLIFE_BACKEND_URL } from "$env/static/public";
    import HeroSection from "@/components/common/HeroSection.svelte";

    const API = PIANOLIFE_BACKEND_URL || "http://localhost:8000";

    let concours = $state(null);
    let loading = $state(true);
    let error = $state(null);

    $effect(() => {
        const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

        fetch(`${API}/api/concours/?active_only=true`)
            .then(res => {
                if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
                return res.json();
            })
            .then(list => {
                if (!Array.isArray(list) || list.length === 0) return;

                // 각 콩쿠르의 "가장 빠른 미래 일정" 날짜 계산
                function getSoonestDate(c) {
                    const dates = [];
                    for (const s of (c.schedule_items || [])) {
                        if (s.end_date && s.end_date >= today) dates.push(s.end_date);
                        else if (s.start_date && s.start_date >= today) dates.push(s.start_date);
                    }
                    return dates.length ? dates.sort()[0] : null;
                }

                const sorted = [...list].sort((a, b) => {
                    const da = getSoonestDate(a) ?? '9999-99-99';
                    const db = getSoonestDate(b) ?? '9999-99-99';
                    return da.localeCompare(db);
                });

                concours = sorted[0];
            })
            .catch(err => { error = err.message; })
            .finally(() => { loading = false; });
    });

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return dateStr;
        return `${m[1]}. ${+m[2]}. ${+m[3]}.`;
    }

    function formatScheduleDate(s) {
        if (s.end_date) return `${formatDate(s.start_date)} ~ ${formatDate(s.end_date)}`;
        return formatDate(s.start_date);
    }

    const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // schedule_items 중 description에 "접수"가 포함된 항목의 기간 안에 있으면 활성
    // 해당 항목이 없으면 항상 활성
    let isRegistrationOpen = $derived((() => {
        if (!concours?.register_link) return false;
        const regItems = (concours.schedule_items || []).filter(s => s.description?.includes('접수') || s.description?.includes('지원'));
        if (!regItems.length) return true;
        return regItems.some(s => {
            const end = s.end_date || s.start_date;
            return today >= s.start_date && today <= end;
        });
    })());

    function inView(node, { threshold = 0.15 } = {}) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    node.classList.add('visible');
                    observer.disconnect();
                }
            },
            { threshold }
        );
        observer.observe(node);
        return { destroy() { observer.disconnect(); } };
    }
</script>

<svelte:head>
    <title>{concours ? concours.title : '콩쿠르'} - Fiore</title>
</svelte:head>

{#if loading}
    <div class="state-box">
        <div class="skeleton-hero"></div>
        <div class="skeleton-body">
            <div class="skeleton-block tall"></div>
            <div class="skeleton-lines">
                {#each { length: 5 } as _}
                    <div class="skeleton-line"></div>
                {/each}
            </div>
        </div>
    </div>
{:else if error}
    <div class="state-box centered">
        <p class="state-msg">{error}</p>
    </div>
{:else if !concours}
    <div class="state-box centered">
        <p class="state-msg">현재 진행 중인 콩쿠르가 없습니다.</p>
    </div>
{:else}
    <div class="concours-detail-page">
        <div class="large-desktop-poster">
            <HeroSection
                image={concours.poster_url}
                scrollYOffset={200}
                aspectRatio="1/2"
                backgroundColor="transparent"
            />
        </div>

        <section class="main-content-section">
            <!-- 포스터 (sticky left) -->
            <div class="main-poster">
                {#if concours.poster_url}
                    <img
                        class="main-poster-image"
                        src={concours.poster_url}
                        alt={concours.title}
                        use:inView
                    />
                {:else}
                    <div class="poster-placeholder"></div>
                {/if}
            </div>

            <!-- 기본 정보 -->
            <div class="information-container">
                <div>
                    <div class="title-row">
                        <h1 class="concours-title">{concours.title}</h1>
                        {#if concours.register_link}
                            <span class="register-wrap" class:disabled={!isRegistrationOpen} data-tooltip="접수 기간이 아닙니다">
                                <a
                                    class="register-btn"
                                    href={isRegistrationOpen ? concours.register_link : undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-disabled={!isRegistrationOpen}
                                >Register</a>
                            </span>
                        {/if}
                    </div>

                    {#if concours.overview}
                        <div class="overview-block">
                            <h3 class="underbar">모집 개요</h3>
                            <p class="text-pre">{concours.overview}</p>
                        </div>
                    {/if}

                    {#if concours.description}
                        <div class="overview-block">
                            <h3 class="underbar">상세 설명</h3>
                            <p class="text-pre">{concours.description}</p>
                        </div>
                    {/if}

                    {#if concours.entry_fee}
                        <div class="fee-block">
                            <h3 class="underbar">참가비</h3>
                            <p class="text-pre">{concours.entry_fee}</p>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- 상세 섹션 -->
            <div class="content-container">

                <!-- 참가 부분 -->
                {#if concours.divisions?.length}
                    <div class="detail-section">
                        <h3 class="underbar">참가 부분</h3>
                        <ul>
                            {#each concours.divisions as div}
                                <li>{div}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                <!-- 일정 안내 -->
                {#if concours.schedule_items?.length}
                    <div class="detail-section">
                        <h3 class="underbar">일정 안내</h3>
                        <div class="schedule-table">
                            {#each concours.schedule_items as s}
                                <div class="schedule-row">
                                    <span class="schedule-desc">{s.description}</span>
                                    <span class="schedule-date">{formatScheduleDate(s)}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- 과제곡 -->
                {#if concours.repertoire?.length}
                    <div class="detail-section">
                        <h3 class="underbar">과제곡</h3>
                        <ul>
                            {#each concours.repertoire as rep, i}
                                <li>
                                    <span>{rep}</span>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                <!-- 대회 특전 -->
                {#if concours.prizes?.length}
                    <div class="detail-section">
                        <h3 class="underbar">대회 특전</h3>
                        <ul class="bullet-list">
                            {#each concours.prizes as prize}
                                <li>{prize}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                <!-- 규정 -->
                {#if concours.rules?.length}
                    <div class="detail-section">
                        <h3 class="underbar">규정</h3>
                        <ul class="bullet-list">
                            {#each concours.rules as rule}
                                <li>{rule}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                <!-- 하단 접수 버튼 -->
                {#if concours.register_link}
                    <div class="register-bottom">
                        <span class="register-wrap" class:disabled={!isRegistrationOpen} data-tooltip="접수 기간이 아닙니다">
                            <a
                                class="register-btn large"
                                href={isRegistrationOpen ? concours.register_link : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-disabled={!isRegistrationOpen}
                            >Register</a>
                        </span>
                    </div>
                {/if}

            </div>
        </section>
    </div>
{/if}

<style lang="scss">
    /* ── 로딩 / 에러 상태 ──────────────────── */
    .state-box {
        width: 100%;
        &.centered {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
        }
    }
    .state-msg {
        color: #999;
        font-weight: 300;
    }
    .skeleton-hero {
        width: 100%;
        aspect-ratio: 16/9;
        max-height: 700px;
        background: #e8e8e8;
        animation: shimmer 1.4s infinite;
        background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%);
        background-size: 200% 100%;
    }
    .skeleton-body {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 2rem;
        padding: 2rem;
        max-width: 1400px;
        margin: 0 auto;
    }
    .skeleton-block {
        background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
        border-radius: 4px;
        &.tall { aspect-ratio: 3/4; }
    }
    .skeleton-lines { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1rem; }
    .skeleton-line {
        height: 1rem; border-radius: 4px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
        &:nth-child(odd) { width: 80%; }
    }
    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    /* ── 페이지 ──────────────────────────── */
    .concours-detail-page {
        width: 100%;
    }

    .large-desktop-poster {
        display: block;
        @media(--desktop) {
            display: none;
            margin-bottom: 2rem;
        }
    }

    .main-content-section {
        display: grid;
        grid-template-columns: 400px 1fr;
        gap: 2rem;
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;

        @media(--desktop) {
            grid-template-columns: 1fr;
        }
        @media(--tablet) {
            gap: 1.5rem;
        }
        @media(--mobile) {
            gap: 1rem;
            padding: 1rem;
        }
    }

    /* ── 포스터 ──────────────────────────── */
    .main-poster {
        position: sticky;
        top: 80px;
        align-self: start;
        grid-row: 1 / -1;
            margin: 0 auto;


        @media(--desktop) {
            position: static;
            grid-row: 1 / 2;
        }

        .main-poster-image {
            width: 100%;
            max-width: 800px;
            height: auto;
            opacity: 0;
            transform: translateY(16px);
            transition: opacity 0.6s ease, transform 0.6s ease;

            &:global(.visible) {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .poster-placeholder {
            width: 100%;
            aspect-ratio: 3/4;
            background: linear-gradient(135deg, #e8e4f0, #d8d0e8);
        }
    }

    /* ── 기본 정보 ───────────────────────── */
    .information-container {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        padding-top: 0.5rem;
    }

    .title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.2rem;
        flex-wrap: wrap;
        margin-bottom: 1.5rem;
    }

    .concours-title {
        font-weight: 300;
        color: #111;
        margin: 0;
        line-height: 1.3;
        letter-spacing: 0.01em;
    }

    .register-wrap {
        position: relative;
        display: inline-block;

        &.disabled {
            cursor: not-allowed;

            .register-btn {
                pointer-events: none;
                border-color: #ccc;
                color: #bbb;
            }

            &::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: calc(100% + 6px);
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.75);
                color: #fff;
                font-size: 0.75rem;
                font-weight: 400;
                letter-spacing: 0.02em;
                white-space: nowrap;
                padding: 0.3rem 0.65rem;
                border-radius: 4px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.15s;
            }

            &:hover::after {
                opacity: 1;
            }
        }
    }

    .register-btn {
        display: inline-block;
        padding: 0.45rem 1.2rem;
        border: 1px solid #333;
        color: #333;
        font-size: 0.8rem;
        font-weight: 400;
        letter-spacing: 0.08em;
        text-decoration: none;
        white-space: nowrap;
        transition: background 0.2s, color 0.2s, border-color 0.2s;

        &:hover {
            background: #333;
            color: #fff;
        }

        &.large {
            padding: 0.5rem 2rem;
            font-size: 0.9rem;
        }
    }

    .register-bottom {
        display: flex;
        justify-content: flex-end;
        padding: 2rem 0 1rem;
    }

    .overview-block,
    .fee-block {
        margin-bottom: 1.5rem;
    }

    h3 {
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #555;
        margin: 0;
        margin-top : 3rem;
    }
    .underbar {
        padding-bottom: 0.5rem;
        border-bottom: 0.5px solid #eee;
        margin-bottom: 1rem;
    }

    .text-pre {
        margin: 0;
        white-space: pre-line;
        padding-left: 1rem;
    }

    /* ── 상세 섹션 컨테이너 ─────────────── */
    .content-container {
        display: flex;
        flex-direction: column;
        gap: 3rem;
        width: 100%;
        min-width: 0;
        padding: 0.5rem 0 4rem;
        grid-column: 2 / -1;

        @media(--desktop) {
            grid-column: 1 / -1;
        }
    }

    .detail-section {
        width: 100%;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        padding-left: 1rem;

        li {
            padding: 0.5rem 0 0.5rem 1rem;
            font-weight: 300;
        }
    }

    /* ── 일정 표 ─────────────────────────── */
    .schedule-table {
        display: flex;
        flex-direction: column;
        gap: 0;
    }
    .schedule-row {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 1.5rem;
        padding: 0.5rem 0 0.5rem 1rem;
        border-bottom: 0.5px solid #f0f0f0;
        align-items: baseline;

        @media(--mobile) {
            grid-template-columns: 1fr;
            gap: 0.25rem;
        }
    }
    .schedule-date {
        font-weight: 400;
        color: #888;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .schedule-desc {
        font-weight: 300;
        color: #333;
    }

    /* ── 불릿 목록 (특전/규정) ───────────── */
    .bullet-list {
        list-style: none;
        padding: 0;
        padding-left: 1rem;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0;

        li {
            padding: 0.75rem 0 0.75rem 1rem;
            // border-bottom: 0.5px solid #f0f0f0;
            position: relative;
            font-weight: 300;
            color: #444;
        }
    }
</style>
