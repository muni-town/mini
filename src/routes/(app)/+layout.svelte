<script lang="ts">
	import './app.css';
	import { user } from '$lib/user';
	import { backend } from '$lib/backend';

	let loginHandle = $state('');
	let loginLoading = $state(false);

	let { children } = $props();
</script>

<div class="flex h-[100vh] flex-col gap-4 px-3 py-4">
	<div>
		<div class="navbar bg-base-100 gap-2 shadow-sm">
			<div class="flex-1">
				<a class="btn btn-ghost text-xl" href="/">Mini Chat {[].length}</a>
			</div>

			{#if !user.profileLoading}
				{#if user.profile}
					{user.profile.handle}
					<button title="logout" onclick={() => backend.logout()}>
						<div class="avatar w-12 overflow-clip rounded-full">
							{#key user.profile?.did}
								<img alt="avatar" src={user.profile?.avatar} />
							{/key}
						</div>
					</button>
				{/if}
			{:else}
				Loading...
			{/if}
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

		{#if user.didLoading}
			Loading...
		{:else if user.did}
			<button>Send message</button>
			<!-- {JSON.stringify(user.profile)} -->
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
