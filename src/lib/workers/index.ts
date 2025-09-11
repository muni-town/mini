import type { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { messagePortInterface, reactiveWorkerState } from './workerMessaging';

import type { BindingSpec } from '@sqlite.org/sqlite-wasm';

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

// Test how the system works when disabling shared workers

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// (globalThis as any).SharedWorker = undefined;

export type SqliteWorkerInterface = {
	runQuery(sql: string, params?: BindingSpec): Promise<unknown>;
};

// Initialize shared worker
const SharedWorkerConstructor = SharedWorker;
const backendWorker = new SharedWorkerConstructor(new URL('./backendWorker', import.meta.url), {
	name: 'mini-backend',
	type: 'module'
});

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const backend = messagePortInterface<{}, BackendInterface>(backendWorker.port, {});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).backend = backend;

// Start a sqlite worker for this tab.
const sqliteWorkerChannel = new MessageChannel();
backend.addClient(sqliteWorkerChannel.port1);
const sqliteWorker = new Worker(new URL('./sqliteWorker.ts', import.meta.url), {
	name: 'mini-database-worker',
	type: 'module'
});
sqliteWorker.postMessage(sqliteWorkerChannel.port2, [sqliteWorkerChannel.port2]);
