import { LeafClient } from '@muni-town/leaf-client';
import type { MessageFromWorker, MessageToWorker } from './backend';

let masterPort: MessagePort | undefined;

let leafClient: LeafClient | undefined;
let resolveAuth: (token: string) => void | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).onconnect = ({ ports: [port] }: { ports: [MessagePort] }) => {
	masterPort = port;
	console.log('masterPort', masterPort);
	console.log('leaf client', leafClient);
	if (!leafClient) {
		leafClient = new LeafClient('http://localhost:5530', () => {
			masterPort?.postMessage({
				type: 'requestServiceAuth',
				aud: 'did:web:localhost:5530'
			} satisfies MessageFromWorker);
			return new Promise((resolve) => {
				resolveAuth = resolve;
			});
		});
		leafClient.on('connect', () => console.log('connected to leaf'));
		leafClient.on('authenticated', (did) => console.log('Authenticated as', did));
	}
	console.log('leaf client', leafClient);

	port.onmessage = (ev) => {
		const data = ev.data as MessageToWorker;
		if (data.type == 'serviceAuth') {
			resolveAuth(data.token);
		} else if (data.type == 'logout' && leafClient) {
			// TODO: use new disconnection() function on later version of leaf client library
			leafClient.socket.disconnect();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			leafClient._listeners = {} as any;
			leafClient = undefined;
		}
	};
};
