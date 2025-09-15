import type { SqlStatement, StreamEvent, MaterializerConfig } from './backendWorker';
import { _void, str, Struct, Option } from '@zicklag/scale-ts';
import { Hash, Kinds } from './encoding';

export type EventType = ReturnType<(typeof eventCodec)['dec']>;

export const config: MaterializerConfig = {
	initSql: [
		{
			sql: 'create table if not exists spaces (id blob primary key, stream blob, name text, avatar text, description text )'
		}
	],
	materializer
};

export const eventCodec = Kinds({
	'space.roomy.joinSpace.0': Hash,
	'space.roomy.leaveSpace.0': Hash,
	'space.roomy.spaceInfo.0': Struct({
		name: Option(str),
		avatar: Option(str),
		description: Option(str)
	})
});

export function materializer(streamId: string, streamEvent: StreamEvent): SqlStatement[] {
	const statements: SqlStatement[] = [];

	try {
		const event = eventCodec.dec(streamEvent.payload);

		if (event.kind == 'space.roomy.joinSpace.0') {
			statements.push({
				sql: 'insert or ignore into spaces (id, stream) values (?, ?)',
				params: [Hash.enc(event.data), Hash.enc(streamId)]
			});
		} else if (event.kind == 'space.roomy.leaveSpace.0') {
			statements.push({
				sql: 'delete from spaces where id = ? and stream = ?',
				params: [Hash.enc(event.data), Hash.enc(streamId)]
			});
		} else if (event.kind == 'space.roomy.spaceInfo.0') {
			statements.push({
				sql: 'update spaces set name = :name, avatar = :avatar, description = :description where id = :id',
				params: {
					':id': Hash.enc(streamId),
					':name': event.data.name,
					':avatar': event.data.avatar,
					':description': event.data.description
				}
			});
		}
	} catch (e) {
		console.warn('Could not parse event, ignoring:', e);
	}

	return statements;
}
