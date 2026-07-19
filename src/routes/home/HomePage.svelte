<script>
    import { ChevronLeft, ChevronRight } from 'lucide-svelte';
    import { onMount } from 'svelte';

    // Asset Imports
    // import bgImage from '$lib/assets/images/home/home_wallpaper.png';
    import bgImage from '$lib/assets/images/about/membership_wallpaper.jpg';
    import Vision from '@/components/about/Vision.svelte';
    import ArtistsDashboard from '$routes/artists/dashboard.svelte';
    import ConcertsDashboard from '$routes/concerts/dashboard.svelte';
    import GalleryDashboard from '$routes/gallery/dashboard.svelte';
    
    import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

    const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

    // Banner Slides Data (dynamically fetched)
    // Start with loading placeholders so the slider is usable immediately
    let slides = $state([
        { type: 'main' },
        { type: 'loading', id: 'concert' },
        { type: 'loading', id: 'audition' },
        { type: 'loading', id: 'concours' },
    ]);

    let scrollY = $state(0);
    let currentSlide = $state(0);

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    }

    function goToSlide(index) {
        currentSlide = index;
    }

    // 슬라이드의 대표 이미지 (좌우에 뜨는 이전/다음 배너 미리보기용)
    function slideImage(slide) {
        if (!slide) return null;
        if (slide.type === 'main') return bgImage;
        if (slide.type === 'link') return slide.image;
        return null; // loading 상태는 미리보기 없음
    }

    onMount(async () => {
        const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

        const [concertsRes, auditionsRes, concoursRes] = await Promise.allSettled([
            fetch(`${API}/api/concerts?active_only=true`).then(r => r.json()),
            fetch(`${API}/api/auditions?active_only=true`).then(r => r.json()),
            fetch(`${API}/api/concours/?active_only=true`).then(r => r.json()),
        ]);

        const newSlides = [{ type: 'main' }];

        // 가장 가까운 예정 공연 1개 (date >= today)
        if (concertsRes.status === 'fulfilled' && Array.isArray(concertsRes.value)) {
            const upcoming = concertsRes.value
                .filter(c => c.date && c.date >= today)
                .sort((a, b) => a.date.localeCompare(b.date));
            if (upcoming.length > 0) {
                const c = upcoming[0];
                const image = c.banner_image_url || c.poster_url;
                if (image) newSlides.push({ type: 'link', image, link: `/concerts/${c.id}` });
            }
        }

        // 가장 가까운 오디션 1개 (end_date >= today)
        if (auditionsRes.status === 'fulfilled' && Array.isArray(auditionsRes.value)) {
            const upcoming = auditionsRes.value
                .filter(a => a.end_date && a.end_date >= today)
                .sort((a, b) => a.end_date.localeCompare(b.end_date));
            if (upcoming.length > 0) {
                const a = upcoming[0];
                const image = a.banner_image_url || a.poster_url;
                if (image) newSlides.push({ type: 'link', image, link: `/application/auditions/${a.id}` });
            }
        }

        // 활성화된 콩쿠르 1개 (가장 최근 등록)
        if (concoursRes.status === 'fulfilled' && Array.isArray(concoursRes.value)) {
            if (concoursRes.value.length > 0) {
                const c = concoursRes.value[0];
                const image = c.poster_url;
                if (image) newSlides.push({ type: 'link', image, link: `/application/concours` });
            }
        }

        slides = newSlides;
        // Clamp active index in case placeholders were removed
        if (currentSlide >= slides.length) currentSlide = slides.length - 1;
    });
</script>

<svelte:window bind:scrollY={scrollY} />

<div class="home-page">
    <!-- Main Banner Slider -->
    <div class="banner-slider-container">
        <div class="slider-track" style="transform: translateX(-{currentSlide * 100}%)">
            {#each slides as slide, index}
                {@const prevImg = slideImage(slides[(index - 1 + slides.length) % slides.length])}
                {@const nextImg = slideImage(slides[(index + 1) % slides.length])}
                <div class="slide-item">
                    {#if slide.type === 'main'}
                        <div class="main-banner">
                            <div class="banner-visual" style="--scroll-y: {scrollY}">
                                {#if prevImg}
                                    <div class="visual-side left" style="background-image: url({prevImg})"></div>
                                {/if}
                                {#if nextImg}
                                    <div class="visual-side right" style="background-image: url({nextImg})"></div>
                                {/if}
                                <div class="visual-sharp">
                                    <img src={bgImage} alt="Hero Background" />
                                    <div class="overlay"></div>
                                </div>
                            </div>

                            <div class="banner-content">
                                <h3 class="sub-title">예술가들의 음악이 피어나는 곳</h3>
                                <h1 class="main-title">Fiore에서 만나는 클래식의 감동</h1>
                            </div>
                        </div>
                    {:else if slide.type === 'loading'}
                        <!-- Loading Skeleton -->
                        <div class="loading-slide">
                            <div class="shimmer"></div>
                            <div class="loading-label">불러오는 중…</div>
                        </div>
                    {:else}
                        <!-- Link Banner -->
                        <a href={slide.link} class="link-banner banner-visual" style="--scroll-y: {scrollY}">
                            {#if prevImg}
                                <div class="visual-side left" style="background-image: url({prevImg})"></div>
                            {/if}
                            {#if nextImg}
                                <div class="visual-side right" style="background-image: url({nextImg})"></div>
                            {/if}
                            <div class="visual-sharp">
                                <img src={slide.image} alt="" />
                            </div>
                        </a>
                    {/if}
                </div>
            {/each}
        </div>

        <!-- Indicators -->
        <div class="indicators">
            {#each slides as _, i}
                <button
                    class="indicator-dot {currentSlide === i ? 'active' : ''}"
                    onclick={() => goToSlide(i)}
                    aria-label="Go to slide {i + 1}"
                ></button>
            {/each}
        </div>

        <!-- Navigation Controls (anchored to the 1280px banner edge) -->
        <button class="nav-btn prev" onclick={prevSlide} aria-label="Previous slide">
            <ChevronLeft size={28} color="#333" />
        </button>
        <button class="nav-btn next" onclick={nextSlide} aria-label="Next slide">
            <ChevronRight size={28} color="#333" />
        </button>
    </div>

    <ArtistsDashboard />
    <Vision />
    <ConcertsDashboard />
    <GalleryDashboard />
</div>

<style lang="scss">
    .home-page {
        // 직계 자식 요소 선택 (Vision, Dashboard 컴포넌트 등)
        & > :global(*:nth-child(2n)) {
            background-color: #f9f9f9;
        }
    }

    /* Slider Styles */
    $banner-max-width: 1280px;
    $banner-gap: 20px; // 메인 이미지와 좌우 사이드 이미지 사이 간격

    .banner-slider-container {
        position: relative;
        width: 100vw;
        height: 9/16 * 100vw; // 16:9 비율 유지
        max-height: 700px;
        margin-left: 0;
        background-color: rgba(255, 255, 255, 0.85);
        overflow: hidden;
    }

    .slider-track {
        display: flex;
        width: 100%;
        height: 100%;
        transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        will-change: transform;
        // z-index: -1; // Removed
    }

    .slide-item {
        min-width: 100%;
        height: 100%;
        position: relative;
    }

    .link-banner {
        display: block;
        width: 100%;
        height: 100%;
        position: relative;
        text-decoration: none;
    }

    /* Loading skeleton slide */
    .loading-slide {
        width: 100%;
        height: 100%;
        background: #111;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;

        .shimmer {
            position: absolute;
            inset: 0;
            background: linear-gradient(
                105deg,
                transparent 40%,
                rgba(255, 255, 255, 0.07) 50%,
                transparent 60%
            );
            background-size: 200% 100%;
            animation: shimmerMove 1.6s ease-in-out infinite;
        }

        .loading-label {
            position: relative;
            z-index: 1;
            color: rgba(255, 255, 255, 0.35);
            font-size: 0.9rem;
            letter-spacing: 0.15em;
        }
    }

    @keyframes shimmerMove {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    /* Navigation — anchored to the 1280px banner edge, sitting in the
       white translucent gutter once the viewport grows past it */
    .nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.6);
        backdrop-filter: blur(4px);
        border: none;
        cursor: pointer;
        padding: 0.6rem;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: background 0.3s, box-shadow 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 6;

        &:hover {
            background: rgba(255, 255, 255, 0.85);
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
        }

        &.prev {
            left: max(0.75rem, calc((100% - $banner-max-width) / 2 - 1.25rem));
        }
        &.next {
            right: max(0.75rem, calc((100% - $banner-max-width) / 2 - 1.25rem));
        }
    }

    .indicators {
        position: absolute;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 0.5rem;
        z-index: 10;

        .indicator-dot {
            width: 8px;
            height: 8px;
            background: rgba(255,255,255,0.4);
            border: none;
            cursor: pointer;
            transition: all 0.3s;
            padding: 0;
            border-radius: 50%;

            &.active {
                background: white;
                transform: scale(1.2);
            }
        }
    }

    /* Hero Section */
    .main-banner {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        text-align: center;
    }

    // 슬라이드 하나 전체(가운데 1280px 선명 + 좌우 자기 이미지를 흐리게 채운 영역)를
    // 통째로 트랙과 함께 슬라이딩시켜, 화살표를 누르면 옆 배너가 자연스럽게 중앙으로 들어오게 함
    .banner-visual {
        will-change: transform, opacity;
        transform: translateY(calc(var(--scroll-y) * 0.7px));
        opacity: calc(1 - (var(--scroll-y) / 1000));
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }

    // 좌우 gutter: 실제 이전/다음 배너 이미지를 흰 반투명 레이어로 흐릿하게 얹음
    .visual-side {
        position: absolute;
        top: 0;
        width: max(0px, calc((100% - $banner-max-width) / 2 - #{$banner-gap} / 2));
        height: 100%;
        background-size: cover;
        background-repeat: no-repeat;
        overflow: hidden;

        &::after {
            content: '';
            position: absolute;
            inset: 0;
            background: rgba(255, 255, 255, 0.55);
        }

        &.left {
            left: 0;
            background-position: right center;
        }
        &.right {
            right: 0;
            background-position: left center;
        }
    }

    // 가운데 1280px: 선명하게
    .visual-sharp {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        max-width: calc(#{$banner-max-width} - #{$banner-gap});
        height: 100%;
        overflow: hidden;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            max-height: 700px;
        }
        .overlay {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background:
            linear-gradient(to bottom, rgba(0,0,0,0.2) 10%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.9) 100%);
        }
    }

    .banner-content {
        padding: 0 1rem;

        .main-title {
            font-weight: 100;
            letter-spacing: 0.15em;
            margin-bottom: 1rem;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
            color: white;
            animation: spacingDown 1s ease-out forwards;
        }
        
        .sub-title {
            font-weight: 100;
            letter-spacing: 0.1em;
            opacity: 0.9;
            color: white;
            animation: floatUp 1s ease-out forwards;
        }
    }

    @keyframes spacingDown {
        0% { letter-spacing: 0.5em; opacity: 0; }
        100% { letter-spacing: 0.15em; opacity: 1; }
    }
    @keyframes floatUp {
        0% { transform: translateY(10px); opacity: 0; }
        50% { transform: translateY(10px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
    }
</style>