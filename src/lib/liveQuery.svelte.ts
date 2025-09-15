import type { BindingSpec } from '@sqlite.org/sqlite-wasm';
import { backend } from './workers';

export class LiveQuery<Row extends { [key: string]: unknown }> {
	result: { rows: Row[] } | undefined = $state(undefined);
	error: string | undefined = $state(undefined);

	constructor(sql: string | (() => string), params?: () => BindingSpec) {
		$effect(() => {
			const id = crypto.randomUUID();
			const channel = new MessageChannel();
			channel.port1.onmessage = (ev) => {
				if ('__sqliteError' in ev.data) {
					this.error = ev.data.__sqliteError;
					console.warn(`Sqlite error in live query (${sql}): ${this.error}`)
				} else {
					this.result = ev.data;
				}
			};
			const p = params?.();

			const s = typeof sql == 'string' ? sql : sql();

			// Obtain a lock to this query so that the shared worker can know when a live query is
			// no longer needed and it can destroy it.
			let dropLock: () => void;
			navigator.locks.request(id, async (_lock) => {
				backend.createLiveQuery(id, channel.port2, s, p);
				await new Promise((r) => (dropLock = r as any));
			});

			return () => {
				dropLock();
			};
		});
	}
}
