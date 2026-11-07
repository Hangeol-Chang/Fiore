<script>
    export let href = '/';
    export let onclick = null; // 지정하면 링크 대신 버튼(팝업 열기 등)으로 렌더링
</script>

<div class="more-link text-right">
    {#if onclick}
        <button type="button" {onclick}>+ more</button>
    {:else}
        <a {href}>+ more</a>
    {/if}
</div>

<style>
    .more-link {
        text-align: right;
        margin-right: 0.5rem;
        
        a, button {
            font-size: 0.85rem;
            font-weight: 300;
            color: #333;
            text-decoration: none;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            transition: opacity 0.2s;
            &:hover { opacity: 0.7; }
        }
    }
</style>