import { writable } from 'svelte/store';
import type { SessionUser } from '$lib/server/auth';

export const userStore = writable<SessionUser | null>(null);

export function setUser(user: SessionUser | null) {
	userStore.set(user);
}

export function clearUser() {
	userStore.set(null);
}








