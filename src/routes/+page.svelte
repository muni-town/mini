<script lang="ts">
	import { roomy, g } from '$lib/roomy.svelte';
	import { Space } from '@roomy-chat/sdk';

	g.space = undefined;

	async function createSpace() {
		const space = await roomy.create(Space);
		space.name = 'New Space';
		space.commit();

		roomy.spaces.push(space);
		roomy.commit();
	}
</script>

<button class="btn btn-xl m-auto" onclick={createSpace}>Create Space</button>
