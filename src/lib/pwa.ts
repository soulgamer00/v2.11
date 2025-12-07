import { pwaInfo } from 'virtual:pwa-info';
import { registerSW } from 'virtual:pwa-register';

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

export function initPWA() {
	if (typeof window !== 'undefined' && pwaInfo) {
		// Clean up any existing service workers from wrong scopes first
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				registrations.forEach((registration) => {
					if (registration.scope !== window.location.origin + '/') {
						console.log('Unregistering SW from wrong scope:', registration.scope);
						registration.unregister();
					}
				});
			});
		}

		updateSW = registerSW({
			immediate: true,
			onNeedRefresh() {
				// Show update notification
				console.log('New content available, please refresh.');
				// You can show a toast notification here
				if (confirm('มีเวอร์ชันใหม่ของแอปพลิเคชัน คุณต้องการอัปเดตตอนนี้หรือไม่?')) {
					updateSW?.(true);
				}
			},
			onOfflineReady() {
				console.log('App ready to work offline');
			},
			onRegistered(registration) {
				console.log('Service Worker registered:', registration);
				console.log('Service Worker scope:', registration.scope);
				console.log('Service Worker script URL:', registration.active?.scriptURL);
			},
			onRegisterError(error) {
				console.error('Service Worker registration error:', error);
			}
		});
	}
}

export function updateServiceWorker() {
	if (updateSW) {
		updateSW(true);
	}
}

