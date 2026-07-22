<script>
    import { page } from "$app/stores";
    import { PIANOLIFE_BACKEND_URL } from "$env/static/public";
    import ArtistDetail2 from "$lib/components/artists2/ArtistDetail2.svelte";

    const API = PIANOLIFE_BACKEND_URL || "http://localhost:8000";

    let artist = $state(null);
    let loading = $state(true);
    let error = $state(null);

    $effect(() => {
        const id = $page.params.id;
        loading = true;
        error = null;
        fetch(`${API}/api/artists/${id}`)
            .then(res => {
                return res.json();
            })
            .then(data => { artist = data; loading = false; })
            .catch(e => { error = e.message; loading = false; });
    });
</script>

{#if loading}
    <div class="state-wrap"><p class="state-msg">불러오는 중...</p></div>
{:else if error}
    <div class="state-wrap"><p class="state-msg error">{error}</p></div>
{:else if artist}
    <ArtistDetail2 {artist} />
{/if}

<style>
    .state-wrap {
        min-height: 60vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .state-msg { color: #999; }
    .state-msg.error { color: #e53e3e; }
</style>
