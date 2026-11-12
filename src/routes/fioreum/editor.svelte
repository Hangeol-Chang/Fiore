<script>
    import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
    import { onMount } from 'svelte';
    import fioreum_wallpaper from '$lib/assets/images/fioreum/fioreum_wallpaper.png';
    import FlowerLine from '@/components/fioreum/Flower.svelte';
    import flower_ref_image from '$lib/assets/images/fioreum/flower.jpg';

    let canvas;
    let points = [];

    onMount(() => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = flower_ref_image;
        img.onload = () => {
             // 너비 500px 기준 비율 유지
             const w = 500;
             const h = (img.height / img.width) * w;
             
             canvas.width = w;
             canvas.height = h;
             
             ctx.drawImage(img, 0, 0, w, h);
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
    <ResponsiveImage src={fioreum_wallpaper} sizes="100vw" alt="Fioreum Wallpaper" class="hero-image" />

    <div class="flower-container">
        <!-- Canvas for Reference Image -->
        <canvas 
            bind:this={canvas} 
            on:click={handleCanvasClick}
            class="flower-ref-canvas"
        ></canvas>

        <div class="flower">
            <FlowerLine width="500px"/>
        </div>
        
        <div class="tools-container">
            <div class="button-group">
                <button on:click={clearPoints} class="btn-clear">좌표 초기화</button>
                <button on:click={copyPoints} class="btn-copy">좌표 복사</button>
            </div>
            <div class="points-output">
                <pre>{JSON.stringify(points)}</pre>
            </div>
        </div>
    </div>
    
</div>

<style>
    .tools-container {
        padding: 20px;
        background: var(--color-green-100);
        border-bottom: 1px solid var(--color-green-200);
        text-align: center;
        position: absolute;
        bottom: 0px;
        left: 0;
        width: 100%;
        z-index: 100;
    }
    .button-group {
        margin-bottom: 10px;
        display: flex;
        justify-content: center;
        gap: 10px;
    }
    .btn-clear, .btn-copy {
        padding: 8px 16px;
        background-color: var(--color-green-800);
        color: var(--color-on-primary);
        border: none;
        cursor: pointer;
    }
    .btn-copy {
        background-color: var(--color-green-500);
    }
    .points-output {
        text-align: left;
        max-width: 800px;
        margin: 0 auto;
        background: var(--color-surface);
        padding: 10px;
        border: 1px solid var(--color-green-200);
        max-height: 100px;
        overflow-y: auto;
        white-space: pre-wrap; /* 긴 줄바꿈 처리 */
        font-size: 12px;
    }


    :global(.hero-image) {
        width: 100%;
        height: auto;
        object-fit: cover;
        max-height: 800px;
    }

    .flower-container {
        position: relative;
        width: 100%;
        height: 1000px;
        margin: auto;
        background-color: var(--color-green-100);
    }
    
    .flower-ref-canvas {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.2;
        cursor: crosshair;
        border: 1px solid red; /* 캔버스 영역 확인용 */
    }

    .flower {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 1px dotted var(--color-green-200);
        pointer-events: none; 
    }
</style>