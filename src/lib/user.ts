import type { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { createSubscriber } from 'svelte/reactivity';
import { backend, type BackendInterface } from './workers';

export class ReactiveUser {
	#channel = new BroadcastChannel('atproto-session');
	#profile: ProfileViewDetailed | undefined;
	#did: string | undefined;
	#loaded = false;

	get didLoading() {
		this.#subscribe();
		return !this.#loaded;
	}
	get profileLoading() {
		return this.didLoading || (this.#did && !this.#profile);
	}

	get did() {
		this.#subscribe();
		return this.#did;
	}
	get profile() {
		this.#subscribe();
		return this.#profile;
	}

	constructor(backend: BackendInterface) {
		this.#channel.onmessage = (
			ev: MessageEvent<{ profile: ProfileViewDetailed } | { did: string }>
		) => {
			this.#loaded = true;
			if (ev.data && 'did' in ev.data) {
				if (this.#did !== ev.data.did) this.#did = ev.data.did;
			} else if (ev.data && 'profile' in ev.data) {
				this.#profile = ev.data.profile;
			}
			this.#updateSubscribers?.();
		};
		backend.getDid().then((did) => {
			this.#loaded = true;
			this.#did = did;
			this.#updateSubscribers?.();
		});
		backend.getProfile().then((profile) => {
			this.#loaded = true;
			this.#profile = profile;
			this.#updateSubscribers?.();
		});

		// Then we need to create the #subscribe() and #updateSubscribers() functions
		this.#subscribe = createSubscriber((update) => {
			this.#updateSubscribers = update;
		});
	}

	#subscribe;
	#updateSubscribers: (() => void) | undefined;
}

export const user = new ReactiveUser(backend);
