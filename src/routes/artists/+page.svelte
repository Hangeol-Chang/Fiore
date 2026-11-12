<script>
    import StatusMessage from '$lib/components/ui/StatusMessage.svelte';
    import { PIANOLIFE_BACKEND_URL } from "$env/static/public";
    import ArtistCard from "@/components/artists/ArtistCard.svelte";
    import NavSection from "@/components/common/NavSection.svelte";

    const API = PIANOLIFE_BACKEND_URL || "http://localhost:8000";
    const PAGE_SIZE = 12;
    const allowedRoles = new Set(["artist", "group"]);

    let artists = $state([]);
    let loading = $state(true);
    let error = $state(null);

    async function loadArtists() {
        let offset = 0;
        let first = true;
        while (true) {
            const res = await fetch(`${API}/api/artists/summary?active_only=true&limit=${PAGE_SIZE}&offset=${offset}`);
            if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
            const page = await res.json();
            if (first) {
                loading = false;
                first = false;
            }
            if (!page || page.length === 0) break;
            artists = [...artists, ...page.filter(item => allowedRoles.has(item.role_name))];
            if (page.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
        }
    }

    $effect(() => {
        loadArtists().catch(err => {
            error = err.message;
            loading = false;
        });
    });
</script>

<svelte:head>
    <title>Artists - Fiore</title>
</svelte:head>

<div>
    <NavSection
        title="Artists"
        bg
        subtitle="오늘의 신예, 내일의 거장"
    />

    <section class="artists-section">
        <div>
            <div class="description-wrapper">
                <h2 class="section-title-left">오늘의 신예, 내일의 거장</h2>
                <p>
                    순수한 열정으로 빚어낸 깊이 있는 해석과 과감한 도전.
                    <br />
                    우리가 주목해야 할 새로운 재능을 가장 먼저 확인하세요.
                </p>
                <p>
                    Experience profound interpretations and bold challenges crafted with pure passion. 
                    <br />
                    Be the first to discover the new talents that deserve your attention.
                </p>
            </div>
        </div>

        <div class="artists-card-wrapper">
            {#if loading}
                {#each { length: 6 } as _, i}
                    <div class="card-skeleton"></div>
                {/each}
            {:else if error}
                <p class="error-message">{error}</p>
            {:else if artists.length === 0}
                <StatusMessage kind="empty" message="등록된 아티스트가 없습니다." />
            {:else}
                {#each artists as artist (artist.id)}
                    <ArtistCard {artist} />
                {/each}
            {/if}
        </div>
    </section>
</div>

<style lang="scss">
    .artists-section {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr); /* 설명 폭 고정 */
        gap: 3rem;
        padding: 4rem 2rem 4rem 0;

        @media(--desktop) {
            gap: 2rem;
        }
        @media(max-width: 1024px) {
            grid-template-columns: 1fr;
            padding: 4rem 2rem;
            gap: 1.5rem;
        }
        @media(--mobile) {
            gap: 1rem;
        }
    }

    .description-wrapper {
        align-self: start;

        h2 {
            font-size: 1.8rem;
            font-weight: 300;
            letter-spacing: 0.05em;
            margin-bottom: 1.5rem;
        }

        p {
            font-size: 0.9rem;
            line-height: 1.8;
            margin-bottom: 1rem;
        }
    }

    .artists-card-wrapper {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 1.2rem;
    }

    .card-skeleton {
        aspect-ratio: 3 / 4;
        background: var(--color-green-100);
        border: 1px solid var(--color-border);
        animation: pulse 1.4s infinite;
    }

    @keyframes pulse {
        50% { opacity: 0.5; }
    }

    .error-message,
    .empty-message {
        color: var(--color-green-700);
        font-size: 0.9rem;
        grid-column: 1 / -1;
    }
</style>