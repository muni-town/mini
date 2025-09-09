<script lang="ts">
	import '$lib/init';
	import './app.css';
	import { atproto } from '$lib/atproto.svelte';
	import { backend } from '$lib/backend';

	let loginHandle = $state('');

	let { children } = $props();
</script>

<div class="flex h-[100vh] flex-col gap-4 px-3 py-4">
	<div>
		<div class="navbar bg-base-100 gap-2 shadow-sm">
			<div class="flex-1">
				<a class="btn btn-ghost text-xl" href="/">Mini Chat {[].length}</a>
			</div>

			{atproto.profile?.handle}
			<button title="logout" onclick={() => atproto.logout()}>
				<div class="avatar w-12 overflow-clip rounded-full">
					{#key atproto.agent?.did}
						<img alt="avatar" src={atproto.profile?.avatar} />
					{/key}
				</div>
			</button>
		</div>
	</div>

	<div class="flex max-h-full min-h-0 flex-grow flex-nowrap gap-4">
		<div class="bg-base-100 flex w-20 flex-col gap-4 p-4 shadow-sm">
			<!-- {#each [] as space (space.id)}
				<div class="tooltip tooltip-right" data-tip={space.name}>
					<a href={`/${space.id}`}>
						<div class="avatar transition-all hover:scale-110">
							<div class="rounded">
								<ShapesAvatar class="w-full" seed={space.entity.id.toString()} />
							</div>
						</div>
					</a>
				</div>
			{/each} -->
		</div>

		{#if atproto.agent}
			<button onclick={() => backend.port.postMessage('hello button')}>Send message</button>
			<!-- {@render children()} -->
		{:else}
			<div class="flex w-full flex-col items-center justify-center">
				<h2 class="mb-3 text-xl font-bold">Login With Bluesky / ATProto Handle</h2>
				<form class="flex flex-col gap-3" onsubmit={() => atproto.loginWithHandle(loginHandle)}>
					<label>
						Handle
						<input class="input" bind:value={loginHandle} />
					</label>
					<button class="btn">Login</button>
				</form>
			</div>
		{/if}
	</div>
</div>
