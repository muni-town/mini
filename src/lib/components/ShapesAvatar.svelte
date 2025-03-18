<script lang="ts">
	import { createAvatar } from '@dicebear/core';
	import { shapes } from '@dicebear/collection';
	import type { HTMLAttributes } from 'svelte/elements';

	let { seed, ...props }: { seed: string } & HTMLAttributes<HTMLImageElement> = $props();

	let src = createAvatar(shapes, { seed: seed }).toDataUri();
</script>

<img {src} {...props} />
