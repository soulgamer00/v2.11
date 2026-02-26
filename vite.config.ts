import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit()
	],
	server: {
		port: 5173,
		strictPort: false
	},
	build: {
		target: 'esnext',
		minify: 'esbuild',
		rollupOptions: {
			output: {
				manualChunks: undefined
			}
		}
	},
	esbuild: {
		drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
	}
});



