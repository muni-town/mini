<script lang="ts">
	import '../app.css';
	import { roomy } from '$lib/roomy.svelte';

	import ShapesAvatar from '$lib/components/ShapesAvatar.svelte';
	import { Space } from '@roomy-chat/sdk';

	let spaces = $state([]) as Space[];
	$effect(() => {
		roomy.spaces.items().then((s) => (spaces = s));
	});

	let { children } = $props();
</script>

<div class="flex h-[100vh] flex-col gap-4 px-3 py-4">
	<div>
		<div class="navbar bg-base-100 shadow-sm">
			<div class="flex-1">
				<a class="btn btn-ghost text-xl" href="/">Mini Chat</a>
			</div>
		</div>
	</div>

	<div class="flex flex-grow flex-nowrap gap-4">
		<div class="bg-base-100 w-20 p-4 shadow-sm gap-4 flex flex-col">
			{#each spaces as space (space.id)}
				<div class="tooltip tooltip-right" data-tip={space.name}>
					<a href={`/${space.id}`}>
						<div class="avatar transition-all hover:scale-110">
							<div class="rounded">
								<ShapesAvatar class="w-full" seed={space.entity.id.toString()} />
							</div>
						</div>
					</a>
				</div>
			{/each}
		</div>

		{@render children()}
	</div>
</div>
