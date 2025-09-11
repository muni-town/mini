import type { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { messagePortInterface } from './workerMessaging';

import BackendWorker from './backendWorker.ts?sharedworker';
import SqliteWorker from './sqliteWorker.ts?worker';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type FrontendInterface = {};

export type BackendInterface = {
	login(username: string): Promise<string>;
	logout(): Promise<void>;
	oauthCallback(searchParams: string): Promise<void>;
	getProfile(did?: string): Promise<ProfileViewDetailed | undefined>;
	runQuery(sql: string): Promise<unknown>;
	sendEvent(streamId: string, payload: ArrayBuffer): Promise<void>;
	setActiveSqliteWorker(port: MessagePort): Promise<void>;
	/** Adds a new message port connection to the backend that can call the backend interface. */
	addClient(port: MessagePort): Promise<void>;
};

export type SqliteWorkerInterface = {
	runQuery(sql: string): Promise<unknown>;
};

// Initialize shared worker
const backendWorker = new BackendWorker({ name: 'mini-backend' });
export const backend = messagePortInterface<FrontendInterface, BackendInterface>(
	backendWorker.port,
	{}
);

// Start a sqlite worker for this tab.
const sqliteWorkerChannel = new MessageChannel();
backend.addClient(sqliteWorkerChannel.port1);
const sqliteWorker = new SqliteWorker({ name: 'mini-database-worker' });
sqliteWorker.postMessage(sqliteWorkerChannel.port2, [sqliteWorkerChannel.port2]);
