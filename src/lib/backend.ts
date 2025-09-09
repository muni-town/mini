import { atproto } from './atproto.svelte';
import BackendWorker from './backendWorker.ts?sharedworker';

export type MessageToWorker = { type: 'serviceAuth'; token: string } | { type: 'logout' };
export type MessageFromWorker = { type: 'requestServiceAuth'; aud: string };

// Initialize shared worker
export const backend = new BackendWorker({ name: 'mini-backend' });
backend.port.onmessage = async (m: MessageEvent<MessageFromWorker>) => {
	if (m.data.type == 'requestServiceAuth') {
		const resp = await atproto.agent?.com.atproto.server.getServiceAuth({
			aud: m.data.aud
		});
		const token = resp?.data.token;
		if (token) {
			backend.port.postMessage({ token, type: 'serviceAuth' } satisfies MessageToWorker);
		}
	}
};
