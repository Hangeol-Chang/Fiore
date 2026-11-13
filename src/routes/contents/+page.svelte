<script>
    import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
    import NavSection from "@/components/common/NavSection.svelte";
    import interviewImage from '$lib/assets/images/background/amatuer_meet_thumbnail.webp';
    import podcastImage from '$lib/assets/images/background/podcast_wallpaper.webp';

    let { data } = $props();

    let filters = ['Interview', 'Podcast'];
    let activeFilter = $state(filters[0]);

    const subData = {
        Interview: {
            title: 'Meet the Amateurs',
            subtitle: '아마추어를 만나다',
            image: interviewImage,
            description: [
                '오직 열정으로, 한계 없는 울림',
                "아마추어들을 만나 그들의 ‘이야기’와 ‘음악’을 들어보는 시간.<br/>비록 음악을 전공으로 하지 않았지만 열정만큼은 누구보다 불타는 그들의 이야기를 들어보세요.",
                "Sharing the stories and melodies of amateur musicians.<br /> They may not be professional majors, but their passion is second to none. Discover the heartfelt stories of those who truly love music.",
            ],
        },
        Podcast: {
            title: 'Fioreum Podcast',
            subtitle: '예술가들의 뒷이야기',
            image: podcastImage,
            description: [
                '박수 소리에 가려진, 클래식의 진짜 뒷이야기.',
                "우아한 무대의 막이 내리면 젊은 아티스트들의 가감 없는 수다가 시작됩니다.<br/>때로는 날카로운 비판을, 때로는 공연계의 생생한 현실과 비하인드를. 어디서도 들을 수 없었던 ‘오프 더 레코드(Off the Record)’를 공개합니다.",
                "When the curtain falls, the candid conversations of young artists begin.<br />From sharp critiques to the raw reality of the industry and backstage secrets. We reveal the `Off the Record` stories you won't hear anywhere else.",
            ],
        },
    };

    const videos = $derived(activeFilter === 'Interview' ? data.interview : data.podcast);
</script>

<svelte:head>
    <title>Contents - Fiore</title>
</svelte:head>

<div>
    <NavSection
        title="Contents"
        bg
        {filters}
        {activeFilter}
        onFilter={(f) => { activeFilter = f; }}
    />

    <section class="contents-section">
        <div class="description-wrapper">
            <h2 class="section-title">{subData[activeFilter].title}</h2>
            {#each subData[activeFilter].description as para}
                <p>{@html para}</p>
            {/each}
        </div>

        <div class="video-grid">
            {#if videos.length === 0}
                <p class="empty-message">영상을 불러오는 중입니다...</p>
            {:else}
                {#each videos as video (video.id)}
                    <a
                        class="video-card"
                        href="https://www.youtube.com/watch?v={video.id}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <div class="thumbnail">
                            <ResponsiveImage src={video.thumbnail} sizes="(max-width: 768px) 100vw, 33vw" alt={video.title} />
                            <div class="play-icon">▶</div>
                        </div>

                        <h5 class="video-title">{video.title}</h5>
                        {#if video.description}
                            <p class="video-desc">{
                                video.description.slice(0, 40)}{video.description.length > 40 ? '…' : ''}</p>
                        {/if}
                    </a>
                {/each}
            {/if}
        </div>
    </section>
</div>

<style lang="scss">
    .contents-section {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr); /* 설명 폭 고정 */
        gap: 3rem;
        padding: 4rem 2rem 4rem 0;

        @media (--desktop) { gap: 2rem; }
        @media (max-width: 1024px) {
            grid-template-columns: 1fr;
            padding: 4rem 2rem;
            gap: 1.5rem;
        }
    }

    .description-wrapper {
        align-self: start;

        .section-title {
            font-size: 1.8rem;
            font-weight: 300;
            letter-spacing: 0.05em;
            margin-bottom: 1.5rem;
        }

        p {
            font-size: 0.9rem;
            line-height: 1.8;
            color: var(--color-on-surface);
            margin-bottom: 1rem;
        }
    }

    .video-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1.5rem;

        @media (--tablet) { grid-template-columns: repeat(2, 1fr); }
        @media (--mobile) { grid-template-columns: 1fr; }
    }

    .video-card {
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: opacity 0.2s;

        &:hover {
            opacity: 0.8;
            .play-icon { opacity: 1; }
        }
    }

    .thumbnail {
        position: relative;
        width: 100%;
        aspect-ratio: 16/9;
        overflow: hidden;
        background: var(--color-on-surface);

        :global(img) {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .play-icon {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: var(--color-on-primary);
            background: rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.2s;
        }
    }

    .video-card {
        * {
            margin: 0;
        }
        .video-title {
            font-size: 1rem;
            font-weight: 400;
            line-height: 1.5;
            color: var(--color-on-surface);
            overflow: hidden;
            text-wrap: none;
        }
    
        .video-desc {
            font-size: 0.85rem;
            font-weight: 300;
            color: var(--color-green-700);
            line-height: 1.5;
        }
        
        .empty-message {
            color: var(--color-green-600);
            grid-column: 1 / -1;
        }
    }


</style>
