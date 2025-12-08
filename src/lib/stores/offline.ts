import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Track online/offline status
export const isOnline = writable(browser ? navigator.onLine : true);

// Track pending sync operations
export const pendingSyncCount = writable(0);

// Derived store for sync status
export const syncStatus = derived(
	[isOnline, pendingSyncCount],
	([$isOnline, $pendingSyncCount]) => {
		if (!$isOnline) {
			return { status: 'offline', message: 'ออฟไลน์' };
		}
		if ($pendingSyncCount > 0) {
			return { status: 'syncing', message: `กำลังซิงค์ ${$pendingSyncCount} รายการ` };
		}
		return { status: 'online', message: 'ออนไลน์' };
	}
);

// Initialize online/offline event listeners
if (browser) {
	window.addEventListener('online', () => isOnline.set(true));
	window.addEventListener('offline', () => isOnline.set(false));
}







