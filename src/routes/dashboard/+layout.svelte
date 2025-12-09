<script lang="ts">
	// CSS is imported in root layout
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { userStore, setUser, clearUser } from '$lib/stores/user';
	import { syncStatus, isOnline, pendingSyncCount } from '$lib/stores/offline';
	import { 
		db, 
		cacheReferenceData, 
		getUnsyncedCases, 
		getUnsyncedPatients,
		markCaseSyncing,
		revertCaseToPending,
		deleteCaseAfterSync,
		markPatientSynced
	} from '$lib/db/offline';
	import { browser } from '$app/environment';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Icon from '$lib/components/icons/Icon.svelte';

	let { data }: { data: any } = $props();

	// Initialize user store
	setUser(data.user);

	// Initialize sync status
	const currentSyncStatus = $derived($syncStatus);

	// Get first letter of user's name for avatar
	const userInitial = $derived(() => {
		const name = data.user?.fullName || data.user?.username || data.user?.firstName || 'User';
		return name.charAt(0).toUpperCase();
	});

	// Cache reference data on mount (if online)
	onMount(async () => {
		if (!browser) return;

		// Check if we need to cache reference data
		const cachedDiseases = await db.diseases.count();
		if (cachedDiseases === 0 && $isOnline) {
			try {
				// Fetch reference data from server
				const response = await fetch('/api/reference-data');
				if (response.ok) {
					const refData = await response.json();
					await cacheReferenceData({
						masterData: refData.masterData || [],
						diseases: refData.diseases || [],
						hospitals: refData.hospitals || [],
						provinces: refData.provinces || [],
						amphoes: refData.amphoes || [],
						tambons: refData.tambons || []
					});
					console.log('Reference data cached successfully');
				}
			} catch (error) {
				console.error('Failed to cache reference data:', error);
			}
		}

		// Setup auto-sync when coming back online
		const handleOnline = async () => {
			console.log('Back online, starting sync...');
			await syncOfflineData();
		};

		if (browser) {
			window.addEventListener('online', handleOnline);

			// Try initial sync if online
			if ($isOnline) {
				await syncOfflineData();
			}
		}

		return () => {
			if (browser) {
				window.removeEventListener('online', handleOnline);
			}
		};
	});

	// Sync offline data to server with robust error handling
	async function syncOfflineData() {
		if (!browser || !$isOnline) return;

		try {
			// Get unsynced items (only pending status)
			const unsyncedCases = await getUnsyncedCases();
			const unsyncedPatients = await getUnsyncedPatients();

			if (unsyncedCases.length === 0 && unsyncedPatients.length === 0) {
				return; // Nothing to sync
			}

			pendingSyncCount.set(unsyncedCases.length + unsyncedPatients.length);

			// Create a map to track patient UUID to actual patient ID
			const patientIdMap = new Map<string, string>();

			// Sync patients first (cases depend on patients)
			for (const offlinePatient of unsyncedPatients) {
				try {
					const response = await fetch('/api/sync/patient', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(offlinePatient)
					});

					if (response.ok) {
						const result = await response.json();
						// Map offline patient UUID to actual patient ID
						if (result.patientId) {
							patientIdMap.set(offlinePatient.id, result.patientId);
						}
						await markPatientSynced(offlinePatient.id);
						pendingSyncCount.update((n) => Math.max(0, n - 1));
					}
				} catch (error) {
					console.error('Failed to sync patient:', error);
				}
			}

			// Sync cases with robust error handling
			for (const offlineCase of unsyncedCases) {
				try {
					// Mark as syncing BEFORE sending request
					await markCaseSyncing(offlineCase.id);

					// Get the actual patient ID from the map
					const actualPatientId = patientIdMap.get(offlineCase.patientId);
					if (!actualPatientId) {
						console.error(`Patient ID not found for case ${offlineCase.id}`);
						// Revert to pending if patient not found
						await revertCaseToPending(offlineCase.id);
						continue;
					}

					// Create sync payload with actual patient ID and clientId
					const syncPayload = {
						...offlineCase,
						patientId: actualPatientId,
						clientId: offlineCase.clientId,
						updatedAt: offlineCase.updatedAt
					};

					const response = await fetch('/api/sync/case', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(syncPayload)
					});

					if (response.ok) {
						// Success: delete from IndexedDB
						await deleteCaseAfterSync(offlineCase.id);
						pendingSyncCount.update((n) => Math.max(0, n - 1));
					} else if (response.status === 409) {
						// Conflict: server has newer data, delete local copy
						const result = await response.json();
						console.warn(`Conflict for case ${offlineCase.id}:`, result.message);
						await deleteCaseAfterSync(offlineCase.id);
						pendingSyncCount.update((n) => Math.max(0, n - 1));
					} else {
						// Other error: revert to pending for retry
						await revertCaseToPending(offlineCase.id);
						console.error(`Failed to sync case ${offlineCase.id}:`, response.status, await response.text());
					}
				} catch (error) {
					// Network error: revert to pending for retry
					console.error('Failed to sync case:', error);
					await revertCaseToPending(offlineCase.id);
				}
			}
		} catch (error) {
			console.error('Sync error:', error);
		} finally {
			pendingSyncCount.set(0);
		}
	}

	function handleLogout(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		
		// Clear user store immediately
		clearUser();
		
		// Try to call logout endpoint (but don't wait for it)
		fetch('/logout', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		}).catch(() => {
			// Ignore errors - we'll redirect anyway
		});
		
		// Always redirect to login immediately
		window.location.href = '/';
	}

	const isActive = (path: string) => {
		return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
	};
</script>

<div class="min-h-screen bg-base-200">
	<div class="drawer lg:drawer-open">
		<input id="drawer-toggle" type="checkbox" class="drawer-toggle" />
		<div class="drawer-content flex flex-col">
			<!-- Navbar -->
			<div class="navbar bg-base-100 shadow-lg px-2 sm:px-4">
				<div class="flex-none lg:hidden">
					<label for="drawer-toggle" class="btn btn-square btn-ghost btn-sm sm:btn-md">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							class="inline-block h-5 w-5 sm:h-6 sm:w-6 stroke-current"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							></path>
						</svg>
					</label>
				</div>
				<div class="flex-1">
					<a class="btn btn-ghost text-base sm:text-xl px-2 sm:px-4" href="/dashboard">
						<span class="hidden sm:inline">รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</span>
						<span class="sm:hidden">รายงานโรค</span>
					</a>
				</div>
				<div class="flex-none gap-1 sm:gap-2">
					<!-- Sync Status -->
					<div class="dropdown dropdown-end">
						<button class="btn btn-ghost btn-circle" tabindex="0" aria-label="Sync Status">
							{#if currentSyncStatus.status === 'online'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 text-success"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{:else if currentSyncStatus.status === 'syncing'}
								<span class="loading loading-spinner loading-sm"></span>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 text-error"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
									/>
								</svg>
							{/if}
						</button>
						<div class="dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
							<p class="text-sm">{currentSyncStatus.message}</p>
						</div>
					</div>
					<!-- Notifications -->
					<div class="dropdown dropdown-end">
						<button class="btn btn-ghost btn-circle relative" tabindex="0" aria-label="Notifications">
							<Icon name="bell" size={20} />
							{#if data.unreadNotifications > 0}
								<span class="badge badge-error badge-sm absolute -top-1 -right-1">
									{data.unreadNotifications > 99 ? '99+' : data.unreadNotifications}
								</span>
							{/if}
						</button>
						<div class="dropdown-content bg-base-100 rounded-box z-[1] w-80 p-2 shadow-lg border border-base-300 max-h-96 overflow-y-auto">
							<div class="flex justify-between items-center mb-2">
								<h3 class="font-semibold">การแจ้งเตือน</h3>
								<a href="/dashboard/notifications" class="text-xs text-primary hover:underline">
									ดูทั้งหมด
								</a>
							</div>
							<div class="divider my-1"></div>
							<div class="text-sm text-base-content/60 text-center py-4">
								<a href="/dashboard/notifications" class="link link-primary">
									ดูการแจ้งเตือนทั้งหมด
								</a>
							</div>
						</div>
					</div>
					<!-- Home Button -->
					<a href="/" class="btn btn-ghost btn-circle" aria-label="ไปหน้าแรก" title="ไปหน้าแรก">
						<Icon name="home" size={20} />
					</a>
					<ThemeToggle />
					<div class="dropdown dropdown-end">
						<button class="btn btn-ghost btn-circle avatar hover:scale-105 transition-transform" tabindex="0" aria-label="User menu">
							<div class="w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-lg">
								{userInitial()}
							</div>
						</button>
						<ul class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border border-base-300">
							<li>
								<a class="hover:bg-base-200 transition-colors">
									<span class="font-semibold">{data.user?.fullName || 'User'}</span>
									<br />
									<span class="text-sm opacity-70">{data.user?.role || 'USER'}</span>
								</a>
							</li>
							<li>
								<button type="button" class="w-full text-left hover:bg-error/10 hover:text-error transition-colors flex items-center gap-2" onclick={handleLogout}>
									<Icon name="logout" size={16} class="flex-shrink-0" />
									<span class="whitespace-nowrap">ออกจากระบบ</span>
								</button>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<!-- Main Content -->
			<main class="flex-1 p-3 sm:p-4 md:p-6">
				<slot />
			</main>
		</div>

		<!-- Sidebar -->
		<div class="drawer-side">
			<label for="drawer-toggle" class="drawer-overlay"></label>
			<aside class="w-64 sm:w-72 bg-base-100 min-h-full">
				<div class="p-3 sm:p-4">
					<h2 class="text-xl sm:text-2xl font-bold">เมนู</h2>
				</div>
				<ul class="menu p-2 sm:p-4 text-sm sm:text-base">
					<li>
						<a href="/dashboard" class:active={isActive('/dashboard') && $page.url.pathname === '/dashboard'}>
							📊 ภาพรวม
						</a>
					</li>
					<li>
						<a href="/dashboard/cases" class:active={isActive('/dashboard/cases')}>
							📋 รายงานเคส
						</a>
					</li>
					<li>
						<a href="/dashboard/cases/new" class:active={isActive('/dashboard/cases/new')}>
							➕ เพิ่มรายงานเคส
						</a>
					</li>
					<li>
						<a href="/dashboard/patients" class:active={isActive('/dashboard/patients')}>
							👥 จัดการผู้ป่วย
						</a>
					</li>
					{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
						<li>
							<a href="/dashboard/users" class:active={isActive('/dashboard/users')}>
								👤 จัดการ User
							</a>
						</li>
					{/if}
					{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
						<li>
							<a href="/dashboard/import-export" class:active={isActive('/dashboard/import-export')}>
								📥/📤 นำเข้า/ส่งออก
							</a>
						</li>
					{/if}
					{#if data.user?.role === 'SUPERADMIN'}
						<li class="menu-title">
							<span>⚙️ Master Data</span>
						</li>
						<li>
							<a href="/dashboard/admin/diseases" class:active={isActive('/dashboard/admin/diseases')}>
								🦠 จัดการโรค
							</a>
						</li>
						<li>
							<a href="/dashboard/admin/hospitals" class:active={isActive('/dashboard/admin/hospitals')}>
								🏥 จัดการหน่วยงาน
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/populations"
								class:active={isActive('/dashboard/admin/populations')}
							>
								👥 จัดการประชากร
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/occupations"
								class:active={isActive('/dashboard/admin/occupations')}
							>
								💼 จัดการอาชีพ
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/provinces"
								class:active={isActive('/dashboard/admin/provinces')}
							>
								🗺️ จัดการจังหวัด
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/amphoes"
								class:active={isActive('/dashboard/admin/amphoes')}
							>
								📍 จัดการอำเภอ
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/tambons"
								class:active={isActive('/dashboard/admin/tambons')}
							>
								📌 จัดการตำบล
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/masterdata"
								class:active={isActive('/dashboard/admin/masterdata')}
							>
								📝 ข้อมูลอ้างอิง
							</a>
						</li>
						<li>
							<a href="/dashboard/admin/trash" class:active={isActive('/dashboard/admin/trash')}>
								🗑️ ข้อมูลที่ถูกลบ
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/audit-logs"
								class:active={isActive('/dashboard/admin/audit-logs')}
							>
								📝 Audit Logs
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/webhooks"
								class:active={isActive('/dashboard/admin/webhooks')}
							>
								🔔 จัดการ Discord Webhooks
							</a>
						</li>
					{/if}
				</ul>
			</aside>
		</div>
	</div>
</div>
