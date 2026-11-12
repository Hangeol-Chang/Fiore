<script>
    import StatusMessage from '$lib/components/ui/StatusMessage.svelte';
    import { PIANOLIFE_BACKEND_URL } from "$env/static/public";
    import NavSection from "@/components/common/NavSection.svelte";
    import AuditionCard from "@/components/auditions/AuditionCard.svelte";

    const API = PIANOLIFE_BACKEND_URL || "http://localhost:8000";

    let auditions = $state([]);
    let loading = $state(true);
    let error = $state(null);

    $effect(() => {
        fetch(`${API}/api/auditions/?active_only=false`)
            .then(res => {
                if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
                return res.json();
            })
            .then(data => { auditions = data; })
            .catch(err => { error = err.message; })
            .finally(() => { loading = false; });
    });

    const today = new Date().toISOString().slice(0, 10);

    const activeAuditions = $derived(
        auditions.filter(a => a.is_active && (!a.end_date || a.end_date >= today))
                 .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))
    );
    const closedAuditions = $derived(
        auditions.filter(a => !a.is_active || (a.end_date && a.end_date < today))
                 .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))
    );

    const filters = ['auditions', 'concourse'];
    let activeFilter = $state('auditions');

</script>

<svelte:head>
    <title>Application - Fiore</title>
</svelte:head>

<div>
    <NavSection 
        title="Application" 
        description="Apply to be a part of Fiore's team!" 
        {filters}
        {activeFilter}
        onFilter={(f) => { activeFilter = f; }}
    />

    <section class="auditions-section">
        {#if loading}
            {#each { length: 2 } as _}
                <div class="card-skeleton"></div>
            {/each}
        {:else if error}
            <StatusMessage kind="error" message="오류가 발생했습니다: {error}" />
        {:else if activeAuditions.length === 0}
            <StatusMessage kind="empty" message="현재 모집 중인 오디션이 없습니다." />
        {:else}
            {#each activeAuditions as audition (audition.id)}
                <AuditionCard {audition} />
            {/each}
        {/if}
    </section>
</div>

<style lang="scss">
    section {
        max-width: 900px;
        margin: 0 auto;
    }

    .auditions-section {
        display: flex;
        flex-direction: column;
        padding: 2rem;
        margin-top: 1rem;
        padding-bottom: 6rem;

        @media(--mobile) {
            padding: 0.5rem;
        }
    }

    .card-skeleton {
        height: 250px;
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