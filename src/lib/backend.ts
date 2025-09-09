import type { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import BackendWorker from './backendWorker.ts?sharedworker';
import { messagePortInterface } from './messagePortInterface';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type FrontendInterface = {};

export type BackendInterface = {
	login(username: string): Promise<string>;
	logout(): Promise<void>;
	oauthCallback(searchParams: string): Promise<void>;
	getProfile(did?: string): Promise<ProfileViewDetailed | undefined>;
	getDid(): Promise<string | undefined>;
};

// Initialize shared worker
const worker = new BackendWorker({ name: 'mini-backend' });

export const backend = messagePortInterface<FrontendInterface, BackendInterface>(worker.port, {});
