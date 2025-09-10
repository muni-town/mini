/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference lib="webworker" />

import { dev } from '$app/environment';

import { LeafClient } from '@muni-town/leaf-client';
import type { BackendInterface, FrontendInterface } from './backend';
import { messagePortInterface } from './messagePortInterface';

import {
	atprotoLoopbackClientMetadata,
	BrowserOAuthClient,
	buildLoopbackClientId,
	type OAuthClientMetadataInput,
	type OAuthSession
} from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';
import type { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import Dexie, { type EntityTable } from 'dexie';

const atprotoOauthScope = 'atproto transition:generic transition:chat.bsky';

const profileBroadcast = new BroadcastChannel('atproto-session');

interface KeyValue {
	key: string;
	value: string;
}
const db = new Dexie('mini-shared-worker-db') as Dexie & {
	kv: EntityTable<KeyValue, 'key'>;
};
db.version(1).stores({
	kv: `key,value`
});

// TODO: This might be a horrible local storage shim. I don't know how it handles multiple tabs
// open. Works for now... 🤞 We just need it so that the atproto/oauth-client-browser doesn't panic
// because localStorage isn't defined.
globalThis.localStorage = {
	data: {} as { [key: string]: string },
	persist() {
		db.kv.put({ key: 'localStorageShim', value: JSON.stringify(this.data) });
	},
	clear() {
		this.data = {};
	},
	getItem(s: string): string | null {
		return this.data[s] || null;
	},
	key(idx: number): string | null {
		return (Object.values(this.data)[idx] as string | undefined) || null;
	},
	get length(): number {
		return Object.values(this.data).length;
	},
	removeItem(key: string) {
		this.data[key] = undefined;
		this.persist();
	},
	setItem(key: string, value: string) {
		this.data[key] = value;
		this.persist();
	}
};

/**
 * Helper class wrapping up our worker state behind getters and setters so we run code whenever
 * they are changed.
 * */
class BackendState {
	/**
	 * This is just the last frontend connection that has opened. We use it if we need to talk to any
	 * one frontend to do something that we can't do from the worker.
	 * */
	#masterFrontend: FrontendInterface | undefined;

	/** Our leaf API client */
	#leafClient: LeafClient | undefined;

	#oauth: BrowserOAuthClient | undefined;
	#agent: Agent | undefined;
	#session: OAuthSession | undefined;
	#profile: ProfileViewDetailed | undefined;

	#oauthReady: Promise<void>;
	#resolveOauthReady: () => void = () => {};
	get ready() {
		return state.#oauthReady;
	}

	constructor() {
		this.#oauthReady = new Promise((r) => (this.#resolveOauthReady = r));
		initiailzeOauthClient().then((client) => {
			this.oauth = client;
		});
	}

	get oauth() {
		return this.#oauth;
	}
	set oauth(oauth) {
		this.#oauth = oauth;

		if (oauth) {
			(async () => {
				// if there's a stored DID and no session yet, try to restore the session
				const entry = await db.kv.get('did');
				if (entry && this.oauth && !this.session) {
					try {
						const restoredSession = await this.oauth.restore(entry.value);
						this.session = restoredSession;
					} catch (e) {
						console.error(e);
						this.logout();
					}
				}
				this.#resolveOauthReady();
			})();
		} else {
			this.session = undefined;
		}
	}

	get session() {
		return this.#session;
	}
	set session(session) {
		this.#session = session;
		profileBroadcast.postMessage({ did: session?.did });
		if (session) {
			db.kv.add({ key: 'did', value: session.did });
			this.agent = new Agent(session);
		} else {
			this.agent = undefined;
		}
	}

	get agent() {
		return this.#agent;
	}
	set agent(agent) {
		this.#agent = agent;
		if (agent) {
			agent.getProfile({ actor: agent.assertDid }).then((resp) => {
				this.profile = resp.data;
			});

			if (!this.#leafClient) {
				this.leafClient = new LeafClient('http://localhost:5530', async () => {
					const resp = await this.agent?.com.atproto.server.getServiceAuth({
						aud: 'did:web:localhost:5530'
					});
					if (!resp) throw 'Error authenticating for leaf server';
					return resp.data.token;
				});
			}
		} else {
			this.profile = undefined;
			// TODO: use new leaf disconnect function
			this.#leafClient?.socket.disconnect();
			this.leafClient = undefined;
		}
	}

	get profile() {
		return this.#profile;
	}
	set profile(profile) {
		this.#profile = profile;
		profileBroadcast.postMessage({ profile });
	}

	get masterFrontend() {
		return this.#masterFrontend;
	}
	set masterFrontend(value) {
		this.#masterFrontend = value;
	}

	get leafClient() {
		return this.#leafClient;
	}
	set leafClient(client) {
		this.#leafClient = client;
		if (client) {
			initializeLeafClient(client);
		} else {
			this.#leafClient?.disconnect();
		}
	}

	async oauthCallback(params: URLSearchParams) {
		await this.#oauthReady;
		const response = await state.oauth?.callback(params);
		this.session = response?.session;
	}

	logout() {
		db.kv.delete('did');
		this.session = undefined;
	}
}

const state = new BackendState();
(globalThis as any).state = state;

(globalThis as any).onconnect = async ({ ports: [port] }: { ports: [MessagePort] }) => {
	state.masterFrontend = messagePortInterface<BackendInterface, FrontendInterface>(port, {
		async getDid() {
			await state.ready;
			return state.session?.did;
		},
		async getProfile(did) {
			await state.ready;
			if (!did) {
				return state.profile;
			}
			const resp = await state.agent?.getProfile({ actor: did || state.agent.assertDid });
			if (!resp?.data && !resp?.success) {
				console.error('error fetching profile', resp, state.agent);
				throw new Error('Error fetching profile:' + resp?.toString());
			}
			return resp.data;
		},
		async login(handle) {
			if (!state.oauth) throw 'OAuth not initialized';
			const url = await state.oauth.authorize(handle, {
				scope: atprotoOauthScope
			});
			return url.href;
		},
		async oauthCallback(paramsStr) {
			const params = new URLSearchParams(paramsStr);
			await state.oauthCallback(params);
		},
		async logout() {
			state.logout();
		}
	});
};

async function initiailzeOauthClient(): Promise<BrowserOAuthClient> {
	// Build the client metadata
	let clientMetadata: OAuthClientMetadataInput;
	if (dev) {
		// Get the base URL and redirect URL for this deployment
		if (globalThis.location.hostname == 'localhost') globalThis.location.hostname = '127.0.0.1';
		const baseUrl = new URL(
			dev ? `http://127.0.0.1:${globalThis.location.port}` : globalThis.location.href
		);
		baseUrl.hash = '';
		baseUrl.pathname = '/';
		const redirectUri = baseUrl.href + 'oauth/callback';
		// In dev, we build a development metadata
		clientMetadata = {
			...atprotoLoopbackClientMetadata(buildLoopbackClientId(baseUrl)),
			redirect_uris: [redirectUri],
			scope: atprotoOauthScope,
			client_id: `http://localhost?redirect_uri=${encodeURIComponent(
				redirectUri
			)}&scope=${encodeURIComponent(atprotoOauthScope)}`
		};
	} else {
		// In prod, we fetch the `/oauth-client.json` which is expected to be deployed alongside the
		// static build.
		// native client metadata is not reuqired to be on the same domin as client_id,
		// so it can always use the deployed metadata
		const resp = await fetch(`/oauth-client.json`, {
			headers: [['accept', 'application/json']]
		});
		clientMetadata = await resp.json();
	}

	return new BrowserOAuthClient({
		responseMode: 'query',
		handleResolver: 'https://resolver.roomy.chat',
		clientMetadata
	});
}
function initializeLeafClient(client: LeafClient) {
	client.on('connect', () => console.log('Leaf: connected'));
	client.on('disconnect', () => console.log('Leaf: disconnected'));
	client.on('authenticated', (did) => {
		console.log('Leaf: authenticated as', did);

		
	});
}
