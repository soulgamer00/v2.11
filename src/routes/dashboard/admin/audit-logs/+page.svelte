<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state(data.search || '');
	let actionFilter = $state(data.actionFilter || '');
	let resourceFilter = $state(data.resourceFilter || '');

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (actionFilter) params.set('action', actionFilter);
		if (resourceFilter) params.set('resource', resourceFilter);
		if (data.currentPage > 1) params.set('page', '1'); // Reset to page 1 when filtering
		goto(`/dashboard/admin/audit-logs?${params.toString()}`);
	}

	function clearFilters() {
		searchQuery = '';
		actionFilter = '';
		resourceFilter = '';
		goto('/dashboard/admin/audit-logs');
	}

	function goToPage(page: number) {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (actionFilter) params.set('action', actionFilter);
		if (resourceFilter) params.set('resource', resourceFilter);
		params.set('page', page.toString());
		goto(`/dashboard/admin/audit-logs?${params.toString()}`);
	}

	function formatDate(date: Date) {
		return new Date(date).toLocaleString('th-TH', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function getActionBadgeClass(action: string) {
		if (action.includes('CREATE') || action.includes('ADD')) return 'badge-success';
		if (action.includes('UPDATE') || action.includes('EDIT')) return 'badge-warning';
		if (action.includes('DELETE') || action.includes('REMOVE')) return 'badge-error';
		if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'badge-info';
		return 'badge-ghost';
	}
</script>

<svelte:head>
	<title>Audit Logs - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">Audit Logs</h1>
			<p class="text-base-content/60 mt-1">บันทึกการทำงานของระบบ</p>
		</div>
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-title">จำนวน Logs</div>
				<div class="stat-value text-primary">{data.totalCount.toLocaleString()}</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<!-- Search -->
				<div class="form-control">
					<label class="label">
						<span class="label-text">ค้นหา</span>
					</label>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="ค้นหาด้วย Action, Resource, User ID..."
						class="input input-bordered"
						onkeydown={(e) => e.key === 'Enter' && applyFilters()}
					/>
				</div>

				<!-- Action Filter -->
				<div class="form-control">
					<label class="label">
						<span class="label-text">Action</span>
					</label>
					<select class="select select-bordered" bind:value={actionFilter}>
						<option value="">ทั้งหมด</option>
						{#each data.uniqueActions as action}
							<option value={action}>{action}</option>
						{/each}
					</select>
				</div>

				<!-- Resource Filter -->
				<div class="form-control">
					<label class="label">
						<span class="label-text">Resource</span>
					</label>
					<select class="select select-bordered" bind:value={resourceFilter}>
						<option value="">ทั้งหมด</option>
						{#each data.uniqueResources as resource}
							<option value={resource}>{resource}</option>
						{/each}
					</select>
				</div>

				<!-- Buttons -->
				<div class="form-control">
					<label class="label">
						<span class="label-text">&nbsp;</span>
					</label>
					<div class="flex gap-2">
						<button class="btn btn-primary flex-1" onclick={applyFilters}>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
							ค้นหา
						</button>
						<button class="btn btn-ghost" onclick={clearFilters}>
							ล้าง
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Audit Logs Table -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>วันที่/เวลา</th>
							<th>ผู้ใช้</th>
							<th>Action</th>
							<th>Resource</th>
							<th>User ID</th>
						</tr>
					</thead>
					<tbody>
						{#if data.auditLogs.length === 0}
							<tr>
								<td colspan="5" class="text-center text-base-content/60 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each data.auditLogs as log}
								<tr>
									<td class="text-sm font-mono">{formatDate(log.timestamp)}</td>
									<td>
										<div class="font-semibold">{log.user.fullName}</div>
										<div class="text-xs text-base-content/60">{log.user.username}</div>
									</td>
									<td>
										<span class="badge {getActionBadgeClass(log.action)}">{log.action}</span>
									</td>
									<td class="font-semibold">{log.resource}</td>
									<td class="font-mono text-xs text-base-content/60">{log.userId}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if data.totalPages > 1}
				<div class="flex justify-center mt-6">
					<div class="join">
						<button
							class="join-item btn"
							disabled={data.currentPage === 1}
							onclick={() => goToPage(data.currentPage - 1)}
						>
							«
						</button>
						{#each Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
							const startPage = Math.max(1, data.currentPage - 2);
							const page = startPage + i;
							if (page > data.totalPages) return null;
							return page;
						}) as page}
							{#if page}
								<button
									class="join-item btn"
									class:btn-active={data.currentPage === page}
									onclick={() => goToPage(page)}
								>
									{page}
								</button>
							{/if}
						{/each}
						<button
							class="join-item btn"
							disabled={data.currentPage === data.totalPages}
							onclick={() => goToPage(data.currentPage + 1)}
						>
							»
						</button>
					</div>
				</div>
			{/if}

			<!-- Page Info -->
			<div class="text-center text-sm text-base-content/60 mt-4">
				แสดง {data.auditLogs.length > 0 ? (data.currentPage - 1) * 50 + 1 : 0} - {Math.min(data.currentPage * 50, data.totalCount)} จาก {data.totalCount.toLocaleString()} รายการ
			</div>
		</div>
	</div>
</div>



