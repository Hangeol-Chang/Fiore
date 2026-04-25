<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import NavSection from "@/components/common/NavSection.svelte";

    let { children } = $props();

    const filters = ['audition', 'concours'];

    const activeFilter = $derived(
        $page.url.pathname.includes('/concours') ? 'concours' : 'audition'
    );
</script>

<NavSection
    title="Application"
    {filters}
    {activeFilter}
    onFilter={(f) => goto(`/application/${f}`)}
/>

{@render children()}
