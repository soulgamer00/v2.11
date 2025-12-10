<script lang="ts">
	// CSS is imported in root layout
	import { page } from '$app/stores';
	import { userStore, setUser, clearUser } from '$lib/stores/user';
	import { hasPermission } from '$lib/utils/permissions';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Icon from '$lib/components/icons/Icon.svelte';

	let { data }: { data: any } = $props();
	
	// Helper function to check permissions
	function canAccess(permission?: string): boolean {
		if (!permission) return true;
		if (!data.user) return false;
		
		// Ensure permissions array exists
		const userWithPermissions = {
			...data.user,
			permissions: Array.isArray(data.user.permissions) 
				? data.user.permissions 
				: (data.user.permissions ? [data.user.permissions] : [])
		};
		
		return hasPermission(userWithPermissions, permission);
	}

	// Initialize user store
	setUser(data.user);

	// Get first letter of user's name for avatar
	const userInitial = $derived(() => {
		const name = data.user?.fullName || data.user?.username || data.user?.firstName || 'User';
		return name.charAt(0).toUpperCase();
	});


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
					<!-- Theme Toggle -->
					<ThemeToggle />
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
					<!-- Discord Server Link -->
					{#if data.discordServerUrl}
						<a 
							href={data.discordServerUrl} 
							target="_blank" 
							rel="noopener noreferrer"
							class="btn btn-ghost btn-circle" 
							aria-label="Discord Server" 
							title="Discord Server"
						>
							<Icon name="discord" size={20} />
						</a>
					{/if}
					<!-- Home Button -->
					<a href="/" class="btn btn-ghost btn-circle" aria-label="ไปหน้าแรก" title="ไปหน้าแรก">
						<Icon name="home" size={20} />
					</a>
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
							<Icon name="dashboard" size={18} class="flex-shrink-0" />
							ภาพรวม
						</a>
					</li>
					{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN' || canAccess('CAN_VIEW_REPORTS')}
						<li>
							<a href="/dashboard/cases" class:active={isActive('/dashboard/cases')}>
								<Icon name="cases" size={18} class="flex-shrink-0" />
								รายงานเคส
							</a>
						</li>
					{/if}
					{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN' || canAccess('CAN_CREATE_CASES')}
						<li>
							<a href="/dashboard/cases/new" class:active={isActive('/dashboard/cases/new')}>
								<Icon name="add" size={18} class="flex-shrink-0" />
								เพิ่มรายงานเคส
							</a>
						</li>
					{/if}
					{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN' || canAccess('CAN_MANAGE_PATIENTS')}
						<li>
							<a href="/dashboard/patients" class:active={isActive('/dashboard/patients')}>
								<Icon name="users" size={18} class="flex-shrink-0" />
								จัดการผู้ป่วย
							</a>
						</li>
					{/if}
					{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
						<li>
							<a href="/dashboard/users" class:active={isActive('/dashboard/users')}>
								<Icon name="user" size={18} class="flex-shrink-0" />
								จัดการ User
							</a>
						</li>
					{/if}
					{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN' || canAccess('CAN_EXPORT_EXCEL') || canAccess('CAN_IMPORT_EXCEL')}
						<li>
							<a href="/dashboard/import-export" class:active={isActive('/dashboard/import-export')}>
								<Icon name="export" size={18} class="flex-shrink-0" />
								นำเข้า/ส่งออก
							</a>
						</li>
					{/if}
					{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN' || canAccess('CAN_VIEW_REPORTS')}
						<li>
							<a href="/dashboard/reports" class:active={isActive('/dashboard/reports')}>
								<Icon name="chart" size={18} class="flex-shrink-0" />
								รายงาน/สถิติ
							</a>
						</li>
					{/if}
					{#if data.user?.role === 'SUPERADMIN'}
						<li class="menu-title">
							<span><Icon name="settings" size={16} class="flex-shrink-0" /> Master Data</span>
						</li>
						<li>
							<a href="/dashboard/admin/diseases" class:active={isActive('/dashboard/admin/diseases')}>
								<Icon name="medical" size={18} class="flex-shrink-0" />
								จัดการโรค
							</a>
						</li>
						<li>
							<a href="/dashboard/admin/hospitals" class:active={isActive('/dashboard/admin/hospitals')}>
								<Icon name="hospital" size={18} class="flex-shrink-0" />
								จัดการหน่วยงาน
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/populations"
								class:active={isActive('/dashboard/admin/populations')}
							>
								<Icon name="users" size={18} class="flex-shrink-0" />
								จัดการประชากร
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/occupations"
								class:active={isActive('/dashboard/admin/occupations')}
							>
								<Icon name="occupation" size={18} class="flex-shrink-0" />
								จัดการอาชีพ
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/provinces"
								class:active={isActive('/dashboard/admin/provinces')}
							>
								<Icon name="map" size={18} class="flex-shrink-0" />
								จัดการจังหวัด
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/amphoes"
								class:active={isActive('/dashboard/admin/amphoes')}
							>
								<Icon name="location" size={18} class="flex-shrink-0" />
								จัดการอำเภอ
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/tambons"
								class:active={isActive('/dashboard/admin/tambons')}
							>
								<Icon name="tambon" size={18} class="flex-shrink-0" />
								จัดการตำบล
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/masterdata"
								class:active={isActive('/dashboard/admin/masterdata')}
							>
								<Icon name="document" size={18} class="flex-shrink-0" />
								ข้อมูลอ้างอิง
							</a>
						</li>
						<li>
							<a href="/dashboard/admin/trash" class:active={isActive('/dashboard/admin/trash')}>
								<Icon name="trash" size={18} class="flex-shrink-0" />
								ข้อมูลที่ถูกลบ
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/audit-logs"
								class:active={isActive('/dashboard/admin/audit-logs')}
							>
								<Icon name="document" size={18} class="flex-shrink-0" />
								Audit Logs
							</a>
						</li>
						<li class="menu-title">
							<span><Icon name="settings" size={16} class="flex-shrink-0" /> System Tools</span>
						</li>
						<li>
							<a
								href="/dashboard/admin/system-logs"
								class:active={isActive('/dashboard/admin/system-logs')}
							>
								<Icon name="alert" size={18} class="flex-shrink-0" />
								System Error Logs
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/webhooks"
								class:active={isActive('/dashboard/admin/webhooks')}
							>
								<Icon name="webhook" size={18} class="flex-shrink-0" />
								จัดการ Discord Webhooks
							</a>
						</li>
						<li>
							<a
								href="/dashboard/admin/discord-server"
								class:active={isActive('/dashboard/admin/discord-server')}
							>
								<Icon name="discord" size={18} class="flex-shrink-0" />
								จัดการ Discord Server Link
							</a>
						</li>
					{/if}
				</ul>
			</aside>
		</div>
	</div>
</div>
