<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { g, roomy } from '$lib/roomy.svelte';
	import { Channel, type EntityIdStr } from '@roomy-chat/sdk';

	let { children } = $props();

	$effect(() => {
		const channelId = page.params.channelId;
		roomy
			.open(Channel, channelId as EntityIdStr)
			.then((channel) => {
				if (!g.space) return;
				g.channel = channel;
				if (!g.space.channels.ids().includes(channel.id.toString() as EntityIdStr)) {
					g.space.channels.push(channel);
					g.space.channels.commit();
				}
			})
			.catch((e) => {
				console.error('Error opening channel', e);
				goto('/');
			});
	});
</script>

<div class="bg-base-100 flex h-full max-h-full w-full p-4 shadow-sm">
	{@render children()}
</div>
