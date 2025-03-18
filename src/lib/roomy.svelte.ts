import { Channel, EntityId, type EntityIdStr, Roomy, Space } from '@roomy-chat/sdk';
import { StorageManager } from '@muni-town/leaf/storage';
import { SveltePeer } from '@muni-town/leaf/svelte';
import { indexedDBStorageAdapter } from '@muni-town/leaf/storage/indexed-db';
import { webSocketSyncer } from '@muni-town/leaf/sync1/ws-client';

const savedCataogId = localStorage.getItem('catalogId');
const catalogId = new EntityId((savedCataogId as EntityIdStr) || undefined);
if (!savedCataogId) localStorage.setItem('catalogId', catalogId.toString());

const peer = new SveltePeer(
	new StorageManager(indexedDBStorageAdapter('mini-chat')),
	await webSocketSyncer(new WebSocket('ws://localhost:8095'))
);
export const roomy = await Roomy.init(peer, catalogId);

export const g = $state({
	/** The currently selected space. */
	space: undefined as Space | undefined,
	/** The currently selected channel. */
	channel: undefined as Channel | undefined
});
