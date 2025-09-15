<script lang="ts">
	import { backend, backendStatus } from '$lib/workers';

	let spaceId = $state('');
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

<button
	class="btn btn-error"
	onclick={() => {
		if (!backendStatus.personalStreamId) return;
		backend.dangerousCompletelyDestroyDatabase({ yesIAmSure: true });
	}}>Clear Database</button
>
