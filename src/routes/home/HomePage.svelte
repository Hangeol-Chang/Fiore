<script>
    import Hero from '@/components/ui/Hero.svelte';
    import LogoDivider from '$lib/components/ui/LogoDivider.svelte';
    import { reveal } from '$lib/actions/reveal.js';
    import Vision from '@/components/about/Vision.svelte';
    import ArtistsDashboard from '$routes/artists/dashboard.svelte';
    import ConcertsDashboard from '$routes/concerts/dashboard.svelte';
</script>

<div class="home-page">
    <Hero />
    <div use:reveal><ArtistsDashboard /></div>
    <div use:reveal><LogoDivider /><Vision /></div>
    <div use:reveal><LogoDivider /><ConcertsDashboard /></div>
</div>
