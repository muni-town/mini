/* eslint-disable @typescript-eslint/no-explicit-any */

type HalfInterface = {
	[key: string]: (...args: any[]) => Promise<unknown>;
};

type IncomingMessage<In extends HalfInterface, Out extends HalfInterface> =
	| {
			[K in keyof In]: ['call', K, string, ...Parameters<In[K]>];
	  }[keyof In]
	| { [K in keyof Out]: ['response', string, 'resolve' | 'reject', ReturnType<Out[K]>] }[keyof Out];

export function messagePortInterface<Local extends HalfInterface, Remote extends HalfInterface>(
	messagePort: MessagePort,
	handlers: Local
): Remote {
	const pendingResponseResolers: {
		[key: string]: {
			resolve: (resp: ReturnType<Remote[keyof Remote]>) => void;
			reject: (error: any) => void;
		};
	} = {};

	messagePort.onmessage = async (ev: MessageEvent<IncomingMessage<Local, Remote>>) => {
		const type = ev.data[0];

		if (type == 'call') {
			const [, name, requestId, ...parameters] = ev.data;
			for (const [event, handler] of Object.entries(handlers)) {
				if (event == name) {
					try {
						const resp = await handler(...parameters);
						messagePort.postMessage(['response', requestId, 'resolve', resp]);
					} catch (e) {
						messagePort.postMessage(['response', requestId, 'reject', e]);
					}
				}
			}
		} else if (type == 'response') {
			const [, requestId, action, data] = ev.data;
			pendingResponseResolers[requestId][action](data);
			delete pendingResponseResolers[requestId];
		}
	};

	return new Proxy(
		{
			messagePort
		},
		{
			get({ messagePort }, name) {
				const n = name as keyof Remote;
				return (...args: Parameters<Remote[typeof n]>): ReturnType<Remote[typeof n]> => {
					const reqId = crypto.randomUUID();
					const respPromise = new Promise(
						(resolve, reject) => (pendingResponseResolers[reqId] = { resolve, reject })
					);
					messagePort.postMessage(['call', n, reqId, ...args]);
					return respPromise as any;
				};
			}
		}
	) as unknown as Remote;
}
