<script>
    import ResponsiveImage from '$lib/components/ui/ResponsiveImage.svelte';
    import membershipWallpaper from '$lib/assets/images/about/membership_wallpaper.webp'
    import { MoveRight } from 'lucide-svelte';

    export let canClick = true;
</script>

<section style="padding:0;">
    <div role="none" class="membership-hero-section {canClick ? 'clickable' : ''}" 
        on:click={() => canClick && (window.location.href = '/about/membership')}
    >
        <div class="content">
            <p>
                음악을 통해 관객에게 열정과 감동을 전하고자 하는
                <br />
                Fiore에게 여러분의 후원은 큰 힘이 됩니다.
            </p>

            {#if canClick}
                <h6 class="sponsor-btn">
                    sponsor <MoveRight />
                </h6>
            {/if}
        </div>
        
        <ResponsiveImage src={membershipWallpaper} sizes="100vw" alt="" class="hero-image" />
        <div class="overlay"></div>
    </div>
</section>

<style lang="scss">
    .membership-hero-section {
        position: relative;
        width: 100%;
        height: 400px;
        overflow: hidden;

        &.clickable {
            cursor: pointer;
        }

        :global(.hero-image) {
            padding: 0;
            margin: 0;

            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            z-index: 1;
        }

        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.55);
            z-index: 2;
        }

        .content {
            z-index: 3;
            position: absolute;
            top: 100px;
            p {
                color: var(--color-on-primary);
            }
        }
        .sponsor-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            color: var(--color-on-primary);
            padding: 4px 12px;
            border-radius: var(--radius);
            border: 0.6px solid var(--color-surface);
            cursor: pointer;
        }
    }
</style>