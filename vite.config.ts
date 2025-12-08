import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			devOptions: {
				enabled: true,
				type: 'module',
				navigateFallback: undefined // Let SvelteKit handle routing
			},
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			scope: '/',
			base: '/',
			filename: 'sw.js',
			manifest: {
				name: 'VBD-DB v2.0 - ระบบฐานข้อมูลโรคติดต่อนำโดยแมลง',
				short_name: 'VBD-DB',
				description: 'ระบบฐานข้อมูลโรคติดต่อนำโดยแมลง',
				theme_color: '#3b82f6',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/favicon.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/favicon.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				// Aggressive Pre-caching: Precache ALL build assets
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}'],
				
				// Increase cache size limit to 5 MiB (for large SvelteKit bundles)
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
				
				// Immediate Activation: Take control immediately
				skipWaiting: true,
				clientsClaim: true,
				
				// Cleanup outdated caches
				cleanupOutdatedCaches: true,
				
				// Navigation Fallback: Not needed for SvelteKit (SvelteKit handles routing via SSR)
				// SvelteKit routes are handled server-side, so we don't need navigateFallback
				
				// Runtime Caching for external resources and API calls
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'gstatic-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^\/api\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 5 // 5 minutes
							},
							cacheableResponse: {
								statuses: [0, 200]
							},
							networkTimeoutSeconds: 10
						}
					}
				]
			},
			injectManifest: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}']
			}
		})
	],
	server: {
		port: 5173,
		strictPort: false
	}
});



