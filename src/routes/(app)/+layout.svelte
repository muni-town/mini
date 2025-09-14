<script lang="ts">
	import './app.css';
	import { backend, hasSharedWorker, sqliteStatus } from '$lib/workers';
	import { backendStatus } from '$lib/workers/index';
	import { LiveQuery } from '$lib/liveQuery.svelte';
	import ShapesAvatar from '$lib/components/ShapesAvatar.svelte';
	import { json } from '@sveltejs/kit';

	let loginHandle = $state('');
	let loginLoading = $state(false);
	let query = $state('select * from test;');
	let result = $state.raw(undefined) as unknown;

	let lockedTab = $derived(sqliteStatus.isActiveWorker == false && !hasSharedWorker);

	let spaces = new LiveQuery<{ id: string; name?: string; avatar?: string }>(
		'select id, name, avatar from spaces where stream = ?',
		() => [backendStatus.personalStreamId]
	);

	let { children } = $props();
</script>

{#if lockedTab}
	On this platform you may only have one open Roomy tab at a time.
{:else}
	<div class="flex h-[100vh] flex-col gap-4 px-3 py-4">
		<div>
			<div class="navbar bg-base-100 gap-2 shadow-sm">
				<div class="flex-1">
					<a class="btn btn-ghost text-xl" href="/">Mini Chat</a>
					{#if backendStatus.did}
						<span class={backendStatus.leafConnected ? 'text-green-700' : 'text-red-700'}
							>{backendStatus.leafConnected ? 'Online' : 'Offline'}</span
						>
						<span class="text-base-300 ml-3">
							{backendStatus.personalStreamId}
						</span>
					{/if}
				</div>

				{#if backendStatus.profile}
					{#if backendStatus.profile}
						{backendStatus.profile.handle}
						<button title="logout" onclick={() => backend.logout()}>
							<div class="avatar w-12 overflow-clip rounded-full">
								{#key backendStatus.profile?.did}
									<img alt="avatar" src={backendStatus.profile?.avatar} />
								{/key}
							</div>
						</button>
					{/if}
				{:else if backendStatus.did && !backendStatus.profile}
					Loading
				{:else}{/if}
			</div>
		</div>

		<div class="flex max-h-full min-h-0 flex-grow flex-nowrap gap-4">
			<div class="bg-base-100 flex w-20 flex-col gap-4 p-4 shadow-sm">
				{#each spaces.result?.rows || [] as space (space.id)}
					<div class="tooltip tooltip-right" data-tip={space.name || space.id}>
						<a href={`/${space.id}`}>
							<div class="avatar transition-all hover:scale-110">
								<div class="rounded">
									{#if space.avatar}
										<img alt="avatar" src={space.avatar} />
									{:else}
										<ShapesAvatar class="w-full" seed={space.id} />
									{/if}
								</div>
							</div>
						</a>
					</div>
				{/each}
			</div>

			{#if !backendStatus.authLoaded}
				Loading...
			{:else if backendStatus.did}
				<div class="flex flex-col gap-3">
					<div>Is Active Worker: {sqliteStatus.isActiveWorker}</div>
					<textarea class="input h-20 w-[40em] p-2" bind:value={query}></textarea>
					<button
						class="btn"
						onclick={() => {
							backend
								.runQuery(query)
								.then((r) => (result = r))
								.catch((e) => (result = e.toString()));
						}}>Run Query</button
					>
					<pre class="h-full overflow-y-auto">{JSON.stringify(result, undefined, '  ')}</pre>
				</div>
				<!-- {@render children()} -->
			{:else}
				<div class="flex w-full flex-col items-center justify-center">
					<h2 class="mb-3 text-xl font-bold">Login With Bluesky / ATProto Handle</h2>
					<form
						class="flex flex-col gap-3"
						onsubmit={async () => {
							loginLoading = true;
							const redirect = await backend.login(loginHandle);
							window.location.href = redirect;
						}}
					>
						<label>
							Handle
							<input class="input" bind:value={loginHandle} />
						</label>
						{#if !loginLoading}
							<button class="btn">Login</button>
						{:else}
							Logging in....
						{/if}
					</form>
				</div>
			{/if}
		</div>
	</div>
{/if}
