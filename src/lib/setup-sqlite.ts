import initSqlite3, {
	type Database,
	type OpfsSAHPoolDatabase,
	type BindingSpec,
	type Sqlite3Static
} from '@sqlite.org/sqlite-wasm';

let sqlite3: Sqlite3Static | null = null;
let db: OpfsSAHPoolDatabase | Database | null = null;
let initPromise: Promise<void> | null = null;

export function isDatabaseReady(): boolean {
	return !!db;
}

export async function initializeDatabase(dbName: string): Promise<void> {
	if (initPromise) return initPromise;
	initPromise = (async () => {
		if (!sqlite3) {
			sqlite3 = await initSqlite3({ print: console.log, printErr: console.error });
		}

		let lastErr: unknown = null;
		// Retry a few times because SAH Pool can transiently fail during context handoff
		for (let attempt = 0; attempt < 6; attempt++) {
			try {
				const pool = await sqlite3.installOpfsSAHPoolVfs({});
				db = new pool.OpfsSAHPoolDb(dbName);
				break;
			} catch (e) {
				lastErr = e;
				await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
			}
		}
		if (!db) throw lastErr ?? new Error('sahpool_init_failed');
	})();
	await initPromise;
}

export async function executeQuery(sql: string, params?: BindingSpec): Promise<unknown> {
	if (!db && initPromise) await initPromise;
	if (!db) throw new Error('database_not_initialized');

	try {
		const trimmed = sql.trim();
		const upper = trimmed.slice(0, 10).toUpperCase();
		const looksLikeSelect =
			upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('PRAGMA');

		if (looksLikeSelect) {
			if (typeof db.selectObjects === 'function') {
				const rows = db.selectObjects(trimmed, params);
				return { rows };
			}
			const result = db.exec({
				sql: trimmed,
				rowMode: 'object',
				// returnValue: 'resultRows',
				bind: params
			});
			return Array.isArray(result) ? { rows: result } : { rows: [] };
		}

		// DDL/DML or multi-statement: let exec run them. It does not return rows.
		db.exec({ sql: trimmed, bind: params });
		return { ok: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		throw new Error(message);
	}
}

export async function closeDatabase(): Promise<void> {
	if (db && typeof db.close === 'function') {
		try {
			db.close();
		} finally {
			db = null;
		}
	}
}
