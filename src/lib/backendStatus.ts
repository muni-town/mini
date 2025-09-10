import type { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { reactiveWorkerState } from './workerMessaging';

export interface BackendStatus {
	authLoaded: boolean | undefined;
	did: string | undefined;
	profile: ProfileViewDetailed | undefined;
}

export const status = reactiveWorkerState<BackendStatus>('backend-status', false);
