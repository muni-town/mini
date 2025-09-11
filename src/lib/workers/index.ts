import type { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { messagePortInterface, reactiveWorkerState } from './workerMessaging';

import type { BindingSpec } from '@sqlite.org/sqlite-wasm';

// Force page reload when hot reloading this file to avoid confusion if the workers get mixed up.
if (import.meta.hot) {
	import.meta.hot.accept(() => window.location.reload());
}

export interface BackendStatus {
	authLoaded: boolean | undefined;
	did: string | undefined;
	profile: ProfileViewDetailed | undefined;
	leafConnected: boolean | undefined;
}
export interface SqliteStatus {
	isActiveWorker: boolean | undefined;
}

/** Reactive status of the shared worker "backend". */
export const backendStatus = reactiveWorkerState<BackendStatus>(
	new BroadcastChannel('backend-status'),
	false
);

const workerStatusChannel = new MessageChannel();
export const sqliteStatus = reactiveWorkerState<SqliteStatus>(workerStatusChannel.port1, false);

export type BackendInterface = {
	login(username: string): Promise<string>;
	logout(): Promise<void>;
	oauthCallback(searchParams: string): Promise<void>;
	getProfile(did?: string): Promise<ProfileViewDetailed | undefined>;
	runQuery(sql: string, params?: BindingSpec): Promise<unknown>;
	sendEvent(streamId: string, payload: ArrayBuffer): Promise<void>;
	setActiveSqliteWorker(port: MessagePort): Promise<void>;
	/** Adds a new message port connection to the backend that can call the backend interface. */
	addClient(port: MessagePort): Promise<void>;
};

export type SqliteWorkerInterface = {
	runQuery(sql: string, params?: BindingSpec): Promise<unknown>;
};

// Initialize shared worker
export const hasSharedWorker = 'SharedWorker' in globalThis;
const SharedWorkerConstructor = hasSharedWorker ? SharedWorker : Worker;
const backendWorker = new SharedWorkerConstructor(new URL('./backendWorker', import.meta.url), {
	name: 'mini-backend',
	type: 'module'
});

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const backend = messagePortInterface<{}, BackendInterface>(
	'port' in backendWorker ? backendWorker.port : backendWorker,
	{}
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).backend = backend;

// Start a sqlite worker for this tab.
const sqliteWorkerChannel = new MessageChannel();
backend.addClient(sqliteWorkerChannel.port1);
const sqliteWorker = new Worker(new URL('./sqliteWorker.ts', import.meta.url), {
	name: 'mini-database-worker',
	type: 'module'
});
sqliteWorker.postMessage(
	{ backendPort: sqliteWorkerChannel.port2, statusPort: workerStatusChannel.port2 },
	[sqliteWorkerChannel.port2, workerStatusChannel.port2]
);
