<script lang="ts">
	import '../app.css';
	import { roomy } from '$lib/roomy.svelte';

	import ShapesAvatar from '$lib/components/ShapesAvatar.svelte';
	import { Space, NamedEntity } from '@roomy-chat/sdk';

	let spaces = $state([]) as Space[];
	$effect(() => {
		roomy.spaces.items().then((s) => (spaces = s));
	});

	let usernameInput = $state('');
	$effect(() => {
		usernameInput = roomy.cast(NamedEntity).name;
	});
	function setUsername() {
		roomy.cast(NamedEntity).name = usernameInput;
		roomy.commit();
	}

	let { children } = $props();
</script>

<div class="flex h-[100vh] flex-col gap-4 px-3 py-4">
	<div>
		<div class="navbar bg-base-100 gap-2 shadow-sm">
			<div class="flex-1">
				<a class="btn btn-ghost text-xl" href="/">Mini Chat</a>
			</div>

			<form onsubmit={setUsername}>
				<input bind:value={usernameInput} class="input" placeholder="Your Name" />
			</form>
			<div class="avatar w-12">
				<div class="rounded">
					<ShapesAvatar class="w-full" seed={roomy.id} />
				</div>
			</div>
		</div>
	</div>

	<div class="flex max-h-full min-h-0 flex-grow flex-nowrap gap-4">
		<div class="bg-base-100 flex w-20 flex-col gap-4 p-4 shadow-sm">
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
