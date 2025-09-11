/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { BackendInterface, SqliteWorkerInterface } from './index';
import { initializeDatabase, executeQuery } from '../setup-sqlite';
import { messagePortInterface } from './workerMessaging';

globalThis.onmessage = (ev) => {
	console.log('Started sqlite worker');
	const backendPort: MessagePort = ev.data;

	const backend = messagePortInterface<{}, BackendInterface>(backendPort, {});

	navigator.locks.request('sqlite-worker-lock', { mode: 'exclusive' }, async () => {
		console.log("Sqlite worker lock obtained: I'm now the active sqlite worker.");
		await initializeDatabase('/mini.db');

		const sqliteChannel = new MessageChannel();
		messagePortInterface<SqliteWorkerInterface, {}>(sqliteChannel.port1, {
			async runQuery(sql, params) {
				return await executeQuery(sql, params);
			}
		});
		backend.setActiveSqliteWorker(sqliteChannel.port2);
		await new Promise(() => {});
	});
};
