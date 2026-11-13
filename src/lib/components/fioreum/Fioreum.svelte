<script>
    import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
    import { onMount } from 'svelte';
    import fioreum_wallpaper from '$lib/assets/images/fioreum/fioreum_wallpaper.webp';
    import FlowerLine from '@/components/fioreum/Flower.svelte';
    import flower_ref_image from '$lib/assets/images/fioreum/flower.jpg';
    import FioreumTitle from '@/components/fioreum/FioreumTitle.svelte';

    let canvas;
    let points = [];
    let isAutoScrolling = $state(true);
    let mapSectionRef;
    let visible = $state(false);

    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    let rafId = 0;
    let cancelled = false;

    // 목표 위치는 매 프레임 다시 계산 (이미지 로딩으로 레이아웃이 바뀌어도 어긋나지 않게)
    function smoothScrollTo(getTarget, duration) {
        const start = window.scrollY;
        const startTime = performance.now();

        function animateScroll(currentTime) {
            if (cancelled) return;
            const target = getTarget();
            const elapsed = currentTime - startTime;
            if (elapsed < duration) {
                window.scrollTo(0, easeInOutQuad(elapsed, start, target - start, duration));
                rafId = requestAnimationFrame(animateScroll);
            } else {
                window.scrollTo(0, target);
                isAutoScrolling = false;
            }
        }
        rafId = requestAnimationFrame(animateScroll);
    }

    function waitForImages(root, timeout) {
        const imgs = [...root.querySelectorAll('img')].filter((i) => !i.complete);
        return Promise.race([
            Promise.all(imgs.map((i) => new Promise((r) => {
                i.addEventListener('load', r, { once: true });
                i.addEventListener('error', r, { once: true });
            }))),
            new Promise((r) => setTimeout(r, timeout))
        ]);
    }

    onMount(() => {
        // SvelteKit의 네비게이션 후 scroll reset과 이미지 레이아웃이 끝난 뒤에 시작
        (async () => {
            const hero = document.querySelector('.hero-container');
            if (hero) await waitForImages(hero, 1500);
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            if (cancelled) return;
            const flower = document.querySelector('.flower');
            if (!flower) { isAutoScrolling = false; return; }
            smoothScrollTo(() => flower.getBoundingClientRect().top + window.scrollY, 2000);
        })();

        if (canvas) {
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = flower_ref_image;
            img.onload = () => {
                const w = 500;
                const h = (img.height / img.width) * w;
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
            };
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    visible = true;
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5
        });

        if (mapSectionRef) {
            observer.observe(mapSectionRef);
        }
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
            if (mapSectionRef) observer.unobserve(mapSectionRef);
        };
    });

    function handleCanvasClick(e) {
        const x = e.offsetX;
        const y = e.offsetY;
        points = [...points, [Math.round(x), Math.round(y)]];
    }

    function clearPoints() {
        points = [];
    }

    function copyPoints() {
        if (points.length === 0) return;
        navigator.clipboard.writeText(JSON.stringify(points));
    }
</script>

<div>
    {#if isAutoScrolling}
        <div class="scroll-blocker"></div>
    {/if}
    <div class="hero-container">
        <ResponsiveImage src={fioreum_wallpaper} sizes="100vw" alt="Fioreum Wallpaper" class="hero-image" />
        <div class="hero-overlay"></div>
        <h1 class="hero-title">FIOREUM</h1>
    </div>

    <div class="line-container">
        <svg class="line" width="100px" height="1200px">
            <path d="M50 0 L50 1200" style="stroke: var(--color-green-700)" stroke-width="2" fill="none"/>
        </svg>
        <div class="flower">
            <div class="flower-inner">
                <FlowerLine width="min(500px, calc(100vw - 60px))"/>
            </div>
        </div>
    </div>

    <div class="main-description-container" style="margin-bottom: 100px;">
        <h1 class="section-title-center" >
            Where Music Blooms
        </h1>
        <h3 class="section-subtitle-center">
            연주자의 음악을 피어나게 하는 곳
        </h3>
    </div>


    <div style="height: 10px;"></div>

    <FioreumTitle />

    <div class="address-row"  bind:this={mapSectionRef}>
        {#if visible}
            <span class="address-text">서울특별시 서초구 효령로 52길 16 지하 1층</span>
            <a
                href="https://map.naver.com/v5/search/피오레아트앤엔터"
                target="_blank"
                rel="noreferrer"
                class="map-link"
                aria-label="네이버 지도에서 보기"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                지도 보기
            </a>
        {/if}
    </div>
    <div style="height: 200px;"></div>
</div>

<style lang="scss">
    .address-row {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        margin: 1rem 0 0;
    }

    .address-text {
        font-size: 0.95rem;
        color: var(--color-on-surface);
        letter-spacing: 0.02em;
    }

    .map-link {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.85rem;
        color: #03c75a;
        text-decoration: none;
        border: 1px solid #03c75a;
        border-radius: 20px;
        padding: 0.25rem 0.75rem;
        transition: background 0.2s, color 0.2s;

        &:hover {
            background: #03c75a;
            color: var(--color-on-primary);
        }
    }

    .hero-container {
        position: relative;
        width: 100%;
        height: auto;
        overflow: hidden;
    }
    
    :global(.hero-image) {
        width: 100%;
        height: 100%;
        object-fit: cover;
        max-height: 800px;
    }

    .hero-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
    }

    .hero-title {
        position: absolute;
        top: 30%;
        left: 50%;
        transform: translateX(-50%);
        color: var(--color-on-primary);
        text-align: center;
        margin: auto;
        
        font-weight: 100;
        letter-spacing: 2rem;
        padding-left: 2rem;

        @media(--tablet) {
            letter-spacing: 1.5rem;
            padding-left: 1.5rem;
        }
        @media(--mobile) {
            letter-spacing: 1rem;
            padding-left: 1rem;
        }
    }

    .line-container {
        height: 1400px;
        position: relative;
    }
    .line {
        position: absolute;
        top: -250px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 11;
        
        @media(--desktop) {
            top: -20vw;
        }
    }
    
    .flower {
        position: absolute;
        top: calc(1200px - 20vw);
        left: 52%;
        transform: translate(-50%, -50%);
        z-index: 12;

        @media(--desktop) {
            left: 54%;
        }
        @media(--tablet) {
            left: 57%;
        }
        @media(--mobile) {
        }
    }

    .flower-inner {
        transform: rotateZ(-175deg);
    }

    .scroll-blocker {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
    }


    .main-description-container {
        h1 {
            letter-spacing: 1rem;
            font-weight: 100;
            @media (--tablet) {
                letter-spacing: 0.6rem;
            }
            @media (--mobile) {
                letter-spacing: 0.4rem;
            }
        }
        h3 {
            letter-spacing: 0.8rem;

            @media (--tablet) {
                letter-spacing: 0.5rem;
            }
            @media (--mobile) {
                letter-spacing: 0.3rem;
            }
        }
    }
</style>