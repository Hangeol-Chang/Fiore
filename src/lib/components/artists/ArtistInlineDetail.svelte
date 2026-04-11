<script>
	let { artist } = $props();

	const careerLines = $derived(
		artist.career
			? artist.career.split('\n').map((line) => line.trim()).filter(Boolean)
			: []
	);

	const videos = $derived(artist.videos || []);
	const concerts = $derived(
		(artist.concerts || [])
			.slice()
			.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
			.slice(0, 4)
	);

	const displayImage = $derived(artist.mid_url || artist.thumb_url || artist.image_url || '');
</script>

<article class="inline-detail-wrap">
	<div class="inline-header">
		{#if displayImage}
			<div class="inline-image-wrap">
				<img src={displayImage} alt={artist.name} class="inline-image" />
			</div>
		{/if}

		<div class="inline-title-wrap">
			<h4 class="inline-name-en">{artist.name_en ?? ''}</h4>
			<h5 class="inline-name-kr">{artist.name}</h5>
			{#if artist.headline}
				<p class="inline-headline">{@html artist.headline}</p>
			{/if}
		</div>
	</div>

	{#if careerLines.length > 0}
		<section class="inline-section">
			<h6>Career</h6>
			<ul>
				{#each careerLines as line}
					<li>{line}</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if artist.description}
		<section class="inline-section">
			<h6>Profile</h6>
			<p>{artist.description}</p>
		</section>
	{/if}

	{#if videos.length > 0}
		<section class="inline-section">
			<h6>Video</h6>
			<div class="inline-video-grid">
				{#each videos as video}
					<div class="inline-video-item">
						<iframe
							src="https://www.youtube.com/embed/{video.id}"
							title={video.description ?? video.id}
							frameborder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowfullscreen
						></iframe>
						{#if video.description}
							<p>{video.description}</p>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if concerts.length > 0}
		<section class="inline-section">
			<h6>Concert</h6>
			<div class="inline-concert-list">
				{#each concerts as concert}
					<a href="/concerts/{concert.id}">
						{#if concert.date}
							<span>{concert.date}</span>
						{/if}
						<strong>{concert.title}</strong>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if artist.notice}
		<section class="inline-section">
			<h6>Notice</h6>
			<p class="notice">{artist.notice}</p>
		</section>
	{/if}
</article>

<style lang="scss">
	.inline-detail-wrap {
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 1.4rem;
		color: rgba(255, 255, 255, 0.92);
	}

	.inline-header {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: 1rem;
		align-items: start;

		@media (--mobile) {
			grid-template-columns: 1fr;
		}
	}

	.inline-image-wrap {
		width: 100%;
		aspect-ratio: 3/4;
		overflow: hidden;
		background: #111;
	}

	.inline-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.inline-title-wrap {
		.inline-name-en {
			margin: 0;
			font-size: 1rem;
			font-weight: 200;
			letter-spacing: 0.06em;
		}

		.inline-name-kr {
			margin: 0.2rem 0 0;
			font-size: 1.2rem;
			font-weight: 300;
		}

		.inline-headline {
			color: rgba(255, 255, 255, 0.8);
			font-size: 0.88rem;
			line-height: 1.6;
			white-space: pre-wrap;
		}
	}

	.inline-section {
		margin-top: 0.4rem;
        padding-top: 1rem;

		h6 {
			margin: 0 0 0.5rem;
			font-size: 0.82rem;
			font-weight: 500;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}

		p {
			margin: 0;
			font-size: 0.9rem;
			line-height: 1.8;
			white-space: pre-wrap;
		}

		ul {
			list-style: none;
			margin: 0;
			padding: 0;

			li {
				font-size: 0.88rem;
				line-height: 1.7;
			}
		}
	}

	.inline-video-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.8rem;

		@media (--mobile) {
			grid-template-columns: 1fr;
		}
	}

	.inline-video-item {
		iframe {
			width: 100%;
			aspect-ratio: 16/9;
			border: none;
			display: block;
		}

		p {
			margin-top: 0.35rem;
			font-size: 0.8rem;
			color: rgba(255, 255, 255, 0.72);
		}
	}

	.inline-concert-list {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;

		a {
			text-decoration: none;
			display: flex;
			gap: 0.5rem;
			align-items: baseline;

			span {
				color: rgba(255, 255, 255, 0.65);
				font-size: 0.78rem;
			}

			strong {
				color: rgba(255, 255, 255, 0.92);
				font-size: 0.86rem;
				font-weight: 400;
			}
		}
	}

	.notice {
		white-space: pre-wrap;
	}
</style>