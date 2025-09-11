import { type LexiconDoc } from '@atproto/lexicon';

export const lexicons: LexiconDoc[] = [
	{
		lexicon: 1,
		id: 'chat.roomy.stream.v0',
		defs: {
			main: {
				type: 'record',
				record: {
					type: 'object',
					properties: {
						id: {
							type: 'string'
						}
					}
				}
			}
		}
	}
];
