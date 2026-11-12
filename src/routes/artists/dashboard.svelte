<script>
    import { PIANOLIFE_BACKEND_URL } from '$env/static/public';
    import MoreButton from '@/components/common/moreButton.svelte';
    import ArtistCard from '@/components/artists/ArtistCard.svelte';

    const API = PIANOLIFE_BACKEND_URL || 'http://localhost:8000';

    let artists = $state([]);

    $effect(() => {
        fetch(`${API}/api/artists/summary?active_only=true&role_id=1&limit=10`)
            .then(res => res.json())
            .then(data => { artists = data; })
            .catch(e => console.error('Failed to load artists:', e));
    });
</script>

<section>
    <div class="section-content-wrapper">
        <h1 class="section-title-center">Artists</h1>
        <MoreButton href="/artists" />
        
        <div class="artists-grid">
            {#each artists as artist (artist.id)}
                <div class="card-slot"><ArtistCard {artist} /></div>
            {/each}
        </div>
    </div>
</section>

<style lang="scss">
    .artists-grid {
        gap: 1.5rem;
        margin: 3rem 1vw 0 1vw;

        display: flex;
        height: auto;
        max-height: 500px; 
        overflow-y: auto;
        padding: 20px 4px;
        
        flex-wrap: nowrap;
        overflow-x: scroll;
        overflow-y: hidden;
            
        &::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        &::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: var(--radius);
        }
        
        @media (--tablet) {
            padding-bottom: 1rem;
        }
    }

    .card-slot {
        flex: 0 0 40%;

        @media (--mobile) {
            flex: 0 0 42%;
        }

        @media (min-width: 769px) {
            flex: 0 0 20%;
        }
    }
</style>
