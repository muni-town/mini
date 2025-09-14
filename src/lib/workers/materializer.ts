import type { SqlStatement, StreamEvent, MaterializerConfig } from './backendWorker';
import { _void, str, Enum, Struct, enhanceCodec } from 'scale-ts';

const constantStr = <T extends string>(constStr: T) =>
	enhanceCodec<string, T>(
		str,
		(s) => {
			if (s == constStr) {
				return s;
			} else {
				throw `Error encoding: expected "${constStr}" got "${s}"`;
			}
		},
		(s) => {
			if (s == constStr) {
				return constStr;
			} else {
				throw `Error decoding: expected "${constStr}" got "${s}"`;
			}
		}
	);

export type EventType = ReturnType<(typeof eventCodec)['dec']>;
export const eventCodec = Struct({
	namespace: constantStr('space.roomy'),
	event: Enum({
		joinSpace: str,
		leaveSpace: str
	})
});

export const config: MaterializerConfig = {
	initSql: [
		{
			sql: 'create table if not exists spaces (id text primary key, stream text, avatar text, name text, description text )'
		}
	],
	materializer
};

export function materializer(streamId: string, streamEvent: StreamEvent): SqlStatement[] {
	const statements: SqlStatement[] = [];

	try {
		const { event } = eventCodec.dec(streamEvent.payload);

		if (event.tag == 'joinSpace') {
			statements.push({
				sql: 'insert into spaces (id) values (?)',
				params: [event.value]
			});
		} else if (event.tag == 'leaveSpace') {
			statements.push({
				sql: 'delete from spaces where id = ?',
				params: [event.value]
			});
		}
	} catch (e) {}

	return statements;
}
