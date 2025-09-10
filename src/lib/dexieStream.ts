import type { LeafClient } from '@muni-town/leaf-client';
import type { EntityTable } from 'dexie';
import Dexie from 'dexie';

type Event = {
	idx: number;
	user: string;
	payload: ArrayBuffer;
};

export type Materializer = (db: Dexie, event: Event) => Promise<void>;

const streamsDb = new Dexie('dexie-streams') as Dexie & {
	streams: EntityTable<
		{
			id: string;
			latestEventIdx: number;
		},
		'id'
	>;
};

streamsDb.version(1).stores({
	streams: `id`
});

export class DexieStream {
	#leafClient: LeafClient;
	#streamId: string;
	#materializer: Materializer;
	#materialzedDb: Dexie;
	#latestEventIdx: number | undefined;
	#queue: Event[] = [];

	constructor(opts: {
		leafClient: LeafClient;
		streamId: string;
		db: Dexie;
		materializer: Materializer;
	}) {
		this.#streamId = opts.streamId;
		this.#leafClient = opts.leafClient;
		this.#materializer = opts.materializer;
		this.#materialzedDb = opts.db;

		this.subscribeToStream();
		this.#leafClient.on('connect', () => this.subscribeToStream());
		this.#leafClient.on('event', (event) => this.onEvent(event));

		this.startup();
	}

	get db() {
		return this.#materialzedDb;
	}

	async sendEvent(payload: ArrayBuffer) {
		await this.#leafClient.sendEvent(this.#streamId, payload);
	}

	async onEvent(event: Event) {
		if (event.idx - 1 == this.#latestEventIdx) {
			this.materializeEvent(event);
			this.flushInfo();
		} else {
			this.#queue.push(event);
		}
	}

	subscribeToStream() {
		this.#leafClient.subscribe(this.#streamId);
	}

	async startup() {
		const info = await streamsDb.streams.get(this.#streamId);
		if (info) {
			this.#latestEventIdx = info.latestEventIdx;
		} else {
			this.#latestEventIdx = 0;
		}

		await this.backfill();
	}

	async backfill() {
		if (!this.#latestEventIdx) throw 'Not intialized yet';
		while (true) {
			const offset = this.#latestEventIdx + 1;
			const events = await this.#leafClient.fetchEvents(this.#streamId, { offset, limit: 200 });

			if (events.length == 0) break;

			for (const event of events) {
				await this.materializeEvent(event);
			}
		}

		await this.drainQueue();

		this.flushInfo();
	}

	async drainQueue() {
		for (const event of this.#queue) {
			await this.materializeEvent(event);
		}
	}

	async flushInfo() {
		await streamsDb.streams.put({
			id: this.#streamId,
			latestEventIdx: this.#latestEventIdx || 0
		});
	}

	async materializeEvent(event: Event) {
		if (event.idx - 1 !== this.#latestEventIdx) throw 'unexpected event idx';
		await this.#materializer(this.#materialzedDb, event);
		this.#latestEventIdx += 1;
	}
}
