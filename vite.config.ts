import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		topLevelAwait(),
		wasm(),
		{
			// Add stricter headers that will allow the browser to enable SharedArrayBuffers in
			// workers, which is used by the SQLite VFS.
			name: 'cross-origin-isolation-headers',
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
					res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
					res.setHeader('Permissions-Policy', 'cross-origin-isolated=*');
					next();
				});
			}
		}
	],
	server: {
		host: '127.0.0.1'
	},
	optimizeDeps: {
		exclude: ['@sqlite.org/sqlite-wasm']
	}
});
