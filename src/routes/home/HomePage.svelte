<script>
    import Hero from '@/components/ui/Hero.svelte';
    import LogoDivider from '$lib/components/ui/LogoDivider.svelte';
    import { reveal } from '$lib/actions/reveal.js';
    import Vision from '@/components/about/Vision.svelte';
    import ArtistsDashboard from '$routes/artists/dashboard.svelte';
    import ConcertsDashboard from '$routes/concerts/dashboard.svelte';
    import GalleryDashboard from '$routes/gallery/dashboard.svelte';
</script>

<div class="home-page">
    <Hero />
    <div use:reveal><ArtistsDashboard /></div>
    <div use:reveal><LogoDivider /><Vision /></div>
    <div use:reveal><LogoDivider /><ConcertsDashboard /></div>
    <div use:reveal><LogoDivider /><GalleryDashboard /></div>
</div>

<style lang="scss">
    .home-page {
        // 직계 자식 요소 선택 (Hero 다음부터 번갈아 배경)
        & > :global(*:nth-child(2n)) {
            background-color: var(--color-green-50);
        }
    }
</style>
