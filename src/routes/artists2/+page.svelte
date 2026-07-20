<script>
    import { PIANOLIFE_BACKEND_URL } from "$env/static/public";

    const API = PIANOLIFE_BACKEND_URL || "http://localhost:8000";

    let artists = $state([]);
    let loading = $state(true);
    let error = $state(null);

    $effect(() => {
        fetch(`${API}/api/artists?active_only=true`)
            .then(res => {
                if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
                return res.json();
            })
            .then(data => {
                const allowedRoles = new Set(["artist", "group"]);
                artists = (data || []).filter(item => allowedRoles.has(item.role_name));
            })
            .catch(err => { error = err.message; })
            .finally(() => { loading = false; });
    });
</script>

<svelte:head>
    <title>Artists2 (design preview) - Fiore</title>
</svelte:head>

<div class="wrap">
    <h1>Artist Detail — 새 디자인 미리보기</h1>
    <p class="desc">기존 히어로 이미지의 3면 그라데이션 마스크를 제거하고, 좌우 분할 레이아웃으로 재구성한 시안입니다.</p>

    {#if loading}
        <p class="state">불러오는 중...</p>
    {:else if error}
        <p class="state error">{error}</p>
    {:else}
        <ul class="list">
            {#each artists as artist (artist.id)}
                <li>
                    <a href="/artists2/{artist.id}">{artist.name} <span>{artist.name_en ?? ''}</span></a>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style lang="scss">
    .wrap {
        max-width: 720px;
        margin: 0 auto;
        padding: 4rem 1.5rem;
    }
    h1 {
        font-size: 1.4rem;
        font-weight: 400;
        margin-bottom: 0.75rem;
    }
    .desc {
        color: #888;
        font-size: 0.9rem;
        margin-bottom: 2.5rem;
        line-height: 1.7;
    }
    .state { color: #999; }
    .state.error { color: #e53e3e; }
    .list {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        a {
            display: flex;
            justify-content: space-between;
            padding: 0.9rem 1rem;
            border: 1px solid #eee;
            border-radius: 6px;
            text-decoration: none;
            color: #222;
            transition: background 0.15s;

            &:hover { background: #fafafa; }

            span {
                color: #aaa;
                font-weight: 300;
            }
        }
    }
</style>
