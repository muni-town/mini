<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { roomy, g, getUser } from '$lib/roomy.svelte';
	import { Message } from '@roomy-chat/sdk';
	import { onMount } from 'svelte';
	import ShapesAvatar from '$lib/components/ShapesAvatar.svelte';

	let messageInput = $state('');
	let nameInput = $state('');
	$effect(() => {
		nameInput = g.channel?.name || '';
	});
	let messages = $state([]) as Message[];
	$effect(() => {
		if (g.channel) {
			g.channel.messages.items().then((mgs) => (messages = mgs));
		} else {
			messages = [];
		}
	});

	function saveInfo() {
		if (!g.channel) return;
		g.channel.name = nameInput;
		g.channel.commit();
	}
	async function sendMessage() {
		if (!g.channel) return;
		const message = await roomy.create(Message);
		message.body.push(messageInput);
		message.authors.push(roomy.id);
		message.commit();
		g.channel.messages.push(message);
		g.channel.messages.commit();
		messageInput = '';

		// Add a delay because the message isn't posted yet.
		setTimeout(focusAndScroll);
	}

	onMount(focusAndScroll);
	onNavigate(focusAndScroll);

	let unsubscribeDoc = () => {};
	$effect(() => {
		unsubscribeDoc();
		if (g.channel) {
			unsubscribeDoc = g.channel.entity.doc.subscribe(focusAndScroll);
		}
	});

	function focusAndScroll() {
		setTimeout(() => {
			messagesEl.scrollTop = messagesEl.scrollHeight;
			messageInputEl.focus();
		}, 100);
	}

	let messagesEl: HTMLDivElement = $state() as HTMLDivElement;
	let messageInputEl: HTMLInputElement = $state() as HTMLInputElement;
</script>

<div class="flex h-full max-h-full min-h-0 w-full flex-col">
	<form>
		<input bind:value={nameInput} type="text" class="input" placeholder="channel-name" />
		<button class="btn" onclick={saveInfo}>Save</button>
	</form>

	<div class="divider"></div>

	<div class="flex h-full max-h-full flex-grow flex-col">
		<div bind:this={messagesEl} class="h-0 min-h-0 flex-grow overflow-y-auto">
			{#each messages as message}
				<div class="flex gap-2 p-2">
					<div>
						<div class="avatar w-12">
							<div class="rounded">
								<ShapesAvatar class="w-full" seed={message.authors.get(0)} />
							</div>
						</div>
					</div>
					<div>
						<strong>{getUser(message.authors.get(0))?.name || 'unknown'}</strong>
						<div>
							{message.body.toString()}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<form onsubmit={sendMessage} class="flex-shrink-0">
			<input
				bind:value={messageInput}
				bind:this={messageInputEl}
				class="input w-full"
				placeholder="Message"
			/>
		</form>
	</div>
</div>
