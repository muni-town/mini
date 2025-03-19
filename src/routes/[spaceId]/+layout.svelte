<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { roomy, g } from '$lib/roomy.svelte';
	import { derivePromise } from '$lib/utils.svelte';
	import { Channel, Space, type EntityIdStr } from '@roomy-chat/sdk';

	let { children } = $props();

	let channels = derivePromise([], async () => (g.space ? await g.space.channels.items() : []));

	$effect(() => {
		const spaceId = page.params.spaceId;
		roomy
			.open(Space, spaceId as EntityIdStr)
			.then((space) => {
				g.space = space;
				if (!roomy.spaces.ids().includes(spaceId as EntityIdStr)) {
					roomy.spaces.push(space);
					roomy.spaces.commit();
				}
			})
			.catch((e) => {
				console.error('Error opening space', e);
				goto('/');
			});
	});
</script>

<div class="bg-base-100 w-60 p-4 shadow-sm">
	<h1 class="text-2xl font-bold">{g.space?.name}</h1>
	<div class="divider my-1"></div>
	<div class="flex flex-col gap-3">
		{#each channels.value as channel (channel.id)}
			<a
				href={`/${page.params.spaceId}/${channel.id}`}
				class={['btn', channel.id == g.channel?.id && 'btn-active']}
			>
				{channel.name}
			</a>
		{/each}
	</div>
</div>

<div class="flex flex-grow">
	{@render children()}
</div>
