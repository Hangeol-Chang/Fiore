<script>
    import Hero from '@/components/ui/Hero.svelte';
    import { reveal } from '$lib/actions/reveal.js';
    import Vision from '@/components/about/Vision.svelte';
    import ArtistsDashboard from '$routes/artists/dashboard.svelte';
    import ConcertsDashboard from '$routes/concerts/dashboard.svelte';
    import GalleryDashboard from '$routes/gallery/dashboard.svelte';
</script>

<div class="home-page">
    <Hero />
    <div use:reveal><ArtistsDashboard /></div>
    <div use:reveal><Vision /></div>
    <div use:reveal><ConcertsDashboard /></div>
    <div use:reveal><GalleryDashboard /></div>
</div>

<style lang="scss">
    .home-page {
        // 직계 자식 요소 선택 (Hero 다음부터 번갈아 배경)
        & > :global(*:nth-child(2n)) {
            background-color: #f9f9f9;
        }
    }
</style>
