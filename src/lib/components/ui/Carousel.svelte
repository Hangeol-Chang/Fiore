<script>
    import { onMount } from 'svelte';
    import ResponsiveImage from './ResponsiveImage.svelte';
    import { fade } from 'svelte/transition';

    export let imageList = [];
    export let imageWidth = 300;
    export let imageGap = 30;
    export let autoscroll = 0; // 0: off, >0: speed

    let nowIndex = 0;
    let container;
    let interval;

    function next() {
        nowIndex = (nowIndex + 1) % imageList.length;
    }

    function prev() {
        nowIndex = (nowIndex - 1 + imageList.length) % imageList.length;
    }

    function goTo(index) {
        nowIndex = index;
    }

    onMount(() => {
        if (autoscroll > 0) {
            interval = setInterval(next, autoscroll * 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    });
</script>

<div class="carousel-wrapper" style="--image-width: {imageWidth}px; --image-gap: {imageGap}px;">
    <div class="carousel-container">
        <div class="carousel-track" style="transform: translateX(calc(-1 * {nowIndex} * (var(--image-width) + var(--image-gap))));">
            {#each imageList as image, i}
                <div class="carousel-item" class:active={i === nowIndex}>
                    {#if image && typeof image === 'object' && image.src}
                        <ResponsiveImage {...image} alt={image.alt ?? `carousel-image-${i}`} />
                    {:else if typeof image === 'string'}
                         <ResponsiveImage src={image} alt="carousel-image-{i}" />
                    {:else}
                        <div class="placeholder">Image {i}</div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>

    <button class="carousel-nav-btn nav-prev" on:click={prev}>&lt;</button>
    <button class="carousel-nav-btn nav-next" on:click={next}>&gt;</button>

    <div class="indicators">
        {#each imageList as _, i}
            <button class="indicator" class:active={i === nowIndex} on:click={() => goTo(i)}></button>
        {/each}
    </div>
</div>

<style lang="scss">
    .carousel-wrapper {
        position: relative;
        width: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .carousel-container {
        width: 100%;
        overflow: hidden;
        padding: 20px 0;
    }

    .carousel-track {
        display: flex;
        gap: var(--image-gap);
        transition: transform 0.5s ease-in-out;
        width: max-content;
        padding-left: calc(50% - var(--image-width) / 2); /* Center the active item */
    }

    .carousel-item {
        width: var(--image-width);
        transition: transform 0.3s ease, opacity 0.3s ease;
        opacity: 0.5;
        transform: scale(0.9);
        
        &.active {
            opacity: 1;
            transform: scale(1.1);
            z-index: 10;
        }

        :global(img) {
            width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
    }

    .nav-prev,
    .nav-next {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 20;
    }

    .nav-prev { left: 10px; }
    .nav-next { right: 10px; }

    .indicators {
        display: flex;
        gap: 10px;
        margin-top: 10px;
    }

    .indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ccc;
        border: none;
        cursor: pointer;
        padding: 0;

        &.active {
            background: #333;
        }
    }
</style>
