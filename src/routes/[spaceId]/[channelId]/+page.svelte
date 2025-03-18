<script lang="ts">
	import { roomy, g } from '$lib/roomy.svelte';
	import { Channel, Message } from '@roomy-chat/sdk';

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
        console.log(message.body);
        console.log('json', message.body.toJSON())
		message.commit();
        console.log(message.entity.doc.toJSON());
		g.channel.messages.push(message);
		g.channel.messages.commit();
        messageInput = '';
	}
</script>

<div class="h-full w-full">
	<form>
		<input bind:value={nameInput} type="text" class="input" placeholder="channel-name" />
		<button class="btn" onclick={saveInfo}>Save</button>
	</form>

	<div class="divider"></div>

	<div class="flex h-full flex-col">
		<div class="flex-grow">
			{#each messages as message}
				<div class="p-2">
					{message.body.toString()}
				</div>
			{/each}
		</div>

		<form onsubmit={sendMessage}>
			<input class="input w-full" placeholder="Message" />
		</form>
	</div>
</div>
