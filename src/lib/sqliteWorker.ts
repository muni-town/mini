/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { BackendInterface, SqliteWorkerInterface } from './backend';
import { messagePortInterface } from './workerMessaging';

globalThis.onmessage = (ev) => {
	console.log('Started sqlite worker');
	const backendPort: MessagePort = ev.data;

	const backend = messagePortInterface<{}, BackendInterface>(backendPort, {});

	navigator.locks.request('sqlite-worker-lock', { mode: 'exclusive' }, async () => {
		console.log("Sqlite worker lock obtained: I'm now the active sqlite worker.");

		const sqliteChannel = new MessageChannel();
		messagePortInterface<SqliteWorkerInterface, {}>(sqliteChannel.port1, {
			async runQuery(sql) {
				console.log('got sql query:', sql);
			}
		});
		backend.setActiveSqliteWorker(sqliteChannel.port2);
		await new Promise(() => {});
	});
};
