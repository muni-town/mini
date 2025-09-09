import { dev } from '$app/environment';
import { Agent } from '@atproto/api';
import type { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import {
	atprotoLoopbackClientMetadata,
	BrowserOAuthClient,
	buildLoopbackClientId,
	OAuthSession,
	type OAuthClientMetadataInput
} from '@atproto/oauth-client-browser';

const scope = 'atproto transition:generic transition:chat.bsky';

let oauth: BrowserOAuthClient | undefined = $state();
let agent: Agent | undefined = $state();
let session: OAuthSession | undefined = $state();
let profile: ProfileViewDetailed | undefined = $state();

/** The AtProto store. */
export const atproto = {
	/** The scope required by the app when logging in. */
	scope,

	get profile() {
		return profile;
	},
	set profile(value) {
		profile = value;
	},

	get agent() {
		return agent!;
	},
	set agent(value: Agent | undefined) {
		agent = value;
		if (agent) {
			agent.getProfile({ actor: agent.assertDid }).then((resp) => {
				atproto.profile = resp.data;
			});
		}
	},

	get oauth() {
		return oauth;
	},

	get session() {
		return session;
	},
	set session(value: OAuthSession | undefined) {
		if (value) {
			localStorage.setItem('did', value.did);
			session = value;
			atproto.agent = new Agent(session);
		} else {
			atproto.agent = undefined;
		}
	},

	/** Init function must be called before accessing the oauth client. */
	async init() {
		if (this.oauth && this.agent) return;

		// Build the client metadata
		let clientMetadata: OAuthClientMetadataInput;
		if (dev) {
			// Get the base URL and redirect URL for this deployment
			if (window.location.hostname == 'localhost') globalThis.location.hostname = '127.0.0.1';
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const baseUrl = new URL(
				dev ? `http://127.0.0.1:${window.location.port}` : globalThis.location.href
			);
			baseUrl.hash = '';
			baseUrl.pathname = '/';
			const redirectUri = baseUrl.href + 'oauth/callback';
			// In dev, we build a development metadata
			clientMetadata = {
				...atprotoLoopbackClientMetadata(buildLoopbackClientId(baseUrl)),
				redirect_uris: [redirectUri],
				scope,
				client_id: `http://localhost?redirect_uri=${encodeURIComponent(
					redirectUri
				)}&scope=${encodeURIComponent(scope)}`
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

		// Build the oauth client
		oauth = new BrowserOAuthClient({
			responseMode: 'query',
			handleResolver: 'https://resolver.roomy.chat',
			clientMetadata
		});

		// if there's a stored DID on localStorage and no session
		// restore the session
		const storedDid = localStorage.getItem('did');
		if (!atproto.session && storedDid && atproto.oauth) {
			try {
				// atproto.oauth must be awaited to get the correct result
				const restoredSession = await atproto.oauth.restore(storedDid);
				atproto.session = restoredSession;
			} catch (e) {
				console.error(e);
				this.logout();
			}
		}
	},

	/** Login a user using their handle, replacing the existing session if any. */
	async loginWithHandle(handle: string) {
		localStorage.setItem('redirectAfterAuth', window.location.pathname);
		if (!atproto.oauth) return;
		const url = await atproto.oauth.authorize(handle, {
			scope: atproto.scope
		});
		window.location.href = url.href;

		// Protect against browser's back-forward cache
		await new Promise<never>((_resolve, reject) => {
			setTimeout(reject, 10000, new Error('User navigated back from the authorization page'));
		});
	},

	/** Logout the user. */
	logout() {
		localStorage.removeItem('did');
		localStorage.removeItem('jazz-logged-in-secret');
		atproto.session = undefined!;
		atproto.agent = undefined!;
		window.location.href = '/';
		// reload the page to clear the session
		window.location.reload();
	}
};
