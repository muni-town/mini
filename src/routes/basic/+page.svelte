<script module lang="ts">
	import { EntityId, type EntityIdStr, Entity } from '@muni-town/leaf';
	import { SveltePeer } from '@muni-town/leaf/svelte';
	import { DemoCounter } from '$lib/components';
	import { webSocketSyncer } from '@muni-town/leaf/sync1/ws-client';

	let peer: SveltePeer | undefined = $state();
	let entity: Entity | undefined = $state();
	console.log('Connecting to websocket server');
	webSocketSyncer(new WebSocket('ws://localhost:8096')).then(async (syncer) => {
		console.log('Connecting to websocket');
		peer = new SveltePeer(syncer);

		const entityId = new EntityId((window.location.hash.slice(1) as EntityIdStr) || undefined);
		console.log(entityId);
		entity = await peer.open(entityId);

		if (window.location.hash.length <= 1) {
			window.location.replace(`#${entityId.toString()}`);
		}
	});

	function increment() {
		entity?.getOrInit(DemoCounter).increment(1);
		entity?.commit();
	}
	function decrement() {
		entity?.getOrInit(DemoCounter).decrement(1);
		entity?.commit();
	}
</script>

<h1 class="mb-4 text-2xl font-bold">Basic Counter Sync</h1>

{#if entity}
	<p>
		<strong>Entity ID:</strong>
		{entity.id.toString()}
	</p>
	<div class="m-5 flex items-center gap-4">
		<strong>Counter:</strong>
		<button class="cursor-pointer border-2 border-solid p-1" onclick={decrement}>-</button>
		<div class="border-2 border-solid p-2">{entity.getOrInit(DemoCounter).value}</div>
		<button class="cursor-pointer border-2 border-solid p-1" onclick={increment}>+</button>
	</div>
{:else}
	<div>Connecting to syncserver...</div>
{/if}
