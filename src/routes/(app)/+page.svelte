<script lang="ts">
	import { backend, backendStatus } from '$lib/workers';

	let spaceId = $state('');
	let spaceName = $state('');
	let spaceAvatar = $state('');
</script>

<form class="flex flex-col justify-start">
	<input class="input" placeholder="space id" bind:value={spaceId} />
	<button
		class="btn"
		onclick={() => {
			if (!backendStatus.personalStreamId) return;
			backend.sendEvent(backendStatus.personalStreamId, {
				kind: 'space.roomy.joinSpace.0',
				data: spaceId
			});
		}}>Join Space</button
	>
	<button
		class="btn"
		onclick={() => {
			if (!backendStatus.personalStreamId) return;
			backend.sendEvent(backendStatus.personalStreamId, {
				kind: 'space.roomy.leaveSpace.0',
				data: spaceId
			});
		}}>Leave Space</button
	>
</form>

<form
	class="flex flex-col justify-start"
	onsubmit={() => {
		backend.sendEvent(spaceId, {
			kind: 'space.roomy.spaceInfo.0',
			data: {
				name: spaceName || undefined,
				avatar: spaceAvatar || undefined,
				description: undefined
			}
		});
	}}
>
	<input class="input" placeholder="space id" bind:value={spaceId} />
	<input class="input" placeholder="name" bind:value={spaceName} />
	<input class="input" placeholder="avatar" bind:value={spaceAvatar} />
	<button class="btn">Set Space Info</button>
</form>

<button
	class="btn btn-error"
	onclick={() => {
		if (!backendStatus.personalStreamId) return;
		backend.dangerousCompletelyDestroyDatabase({ yesIAmSure: true });
	}}>Clear Database</button
>
