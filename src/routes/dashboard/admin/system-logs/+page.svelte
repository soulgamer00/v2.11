<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/icons/Icon.svelte';

	let { data, error }: { data: PageData; error?: any } = $props();

	let showDetailsModal = $state(false);
	let selectedLog: any = $state(null);
	let searchQuery = $state(data.search || '');

	function openDetailsModal(log: any) {
		selectedLog = log;
		showDetailsModal = true;
	}

	function closeDetailsModal() {
		showDetailsModal = false;
		selectedLog = null;
	}

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchQuery) {
			params.set('search', searchQuery);
		}
		params.set('page', '1');
		goto(`/dashboard/admin/system-logs?${params.toString()}`, { invalidateAll: true });
	}

	function goToPage(page: number) {
		const params = new URLSearchParams();
		if (data.search) {
			params.set('search', data.search);
		}
		params.set('page', page.toString());
		goto(`/dashboard/admin/system-logs?${params.toString()}`, { invalidateAll: true });
	}

	function formatDate(date: Date | string) {
		const d = new Date(date);
		return d.toLocaleString('th-TH', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function getMethodBadgeClass(method: string) {
		const classes: Record<string, string> = {
			GET: 'badge-info',
			POST: 'badge-success',
			PUT: 'badge-warning',
			PATCH: 'badge-warning',
			DELETE: 'badge-error'
		};
		return classes[method] || 'badge-ghost';
	}
</script>

<svelte:head>
	<title>System Error Logs - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
				<Icon name="alert" size={28} class="text-error" />
				System Error Logs
			</h1>
			<p class="text-sm sm:text-base text-base-content/60 mt-1">ดูและตรวจสอบข้อผิดพลาดของระบบ</p>
		</div>
	</div>

	<!-- Error Alert -->
	{#if error}
		<div class="alert alert-error">
			<Icon name="alert" size={20} />
			<div>
				<h3 class="font-bold">เกิดข้อผิดพลาด</h3>
				<p class="text-sm">{error.message || 'ไม่สามารถโหลดข้อมูลได้'}</p>
				{#if error.message?.includes('ErrorLog') || error.message?.includes('does not exist')}
					<p class="text-xs mt-2">กรุณารัน: <code class="bg-base-300 px-2 py-1 rounded">npx prisma db push</code></p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Search -->
	<div class="card bg-base-100 shadow-lg">
		<div class="card-body">
			<div class="flex flex-col sm:flex-row gap-2">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="ค้นหาโดย path หรือ message..."
					class="input input-bordered flex-1"
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
				/>
				<button class="btn btn-primary" onclick={handleSearch}>
					<Icon name="search" size={18} />
					ค้นหา
				</button>
				{#if data.search}
					<button 
						class="btn btn-ghost" 
						onclick={() => {
							searchQuery = '';
							goto('/dashboard/admin/system-logs?page=1', { invalidateAll: true });
						}}
					>
						ล้าง
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Stats -->
	<div class="stats stats-vertical sm:stats-horizontal shadow w-full">
		<div class="stat">
			<div class="stat-title">Total Errors</div>
			<div class="stat-value text-error">{data.pagination.totalCount}</div>
		</div>
		<div class="stat">
			<div class="stat-title">Current Page</div>
			<div class="stat-value">{data.pagination.page} / {data.pagination.totalPages}</div>
		</div>
	</div>

	<!-- Error Logs Table -->
	<div class="card bg-base-100 shadow-lg">
		<div class="card-body p-0 sm:p-4">
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th>Time</th>
							<th>Path</th>
							<th>Method</th>
							<th>User</th>
							<th>Message</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#if data.logs.length === 0}
							<tr>
								<td colspan="6" class="text-center py-8 text-base-content/60">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each data.logs as log}
								<tr>
									<td class="whitespace-nowrap">
										<div class="text-xs sm:text-sm">
											{formatDate(log.createdAt)}
										</div>
									</td>
									<td>
										<div class="max-w-xs truncate" title={log.path}>
											{log.path}
										</div>
									</td>
									<td>
										<span class="badge {getMethodBadgeClass(log.method)} badge-sm">
											{log.method}
										</span>
									</td>
									<td>
										{#if log.user}
											<div class="text-sm">
												<div class="font-semibold">{log.user.fullName}</div>
												<div class="text-xs text-base-content/60">{log.user.username}</div>
											</div>
										{:else}
											<span class="text-base-content/60 text-sm">-</span>
										{/if}
									</td>
									<td>
										<div class="max-w-md truncate" title={log.message}>
											{log.message}
										</div>
									</td>
									<td>
										<button
											class="btn btn-sm btn-ghost"
											onclick={() => openDetailsModal(log)}
											aria-label="View Details"
										>
											<Icon name="eye" size={16} />
											<span class="hidden sm:inline">View</span>
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<div class="flex justify-center gap-2">
			<button
				class="btn btn-sm"
				disabled={!data.pagination.hasPrev}
				onclick={() => goToPage(data.pagination.page - 1)}
			>
				<Icon name="arrowLeft" size={16} />
				Previous
			</button>
			<div class="flex items-center gap-2">
				{#each Array(data.pagination.totalPages) as _, i}
					{@const pageNum = i + 1}
					{#if pageNum === data.pagination.page}
						<button class="btn btn-sm btn-active">{pageNum}</button>
					{:else if pageNum === 1 || pageNum === data.pagination.totalPages || (pageNum >= data.pagination.page - 2 && pageNum <= data.pagination.page + 2)}
						<button class="btn btn-sm btn-ghost" onclick={() => goToPage(pageNum)}>
							{pageNum}
						</button>
					{:else if pageNum === data.pagination.page - 3 || pageNum === data.pagination.page + 3}
						<span class="btn btn-sm btn-ghost btn-disabled">...</span>
					{/if}
				{/each}
			</div>
			<button
				class="btn btn-sm"
				disabled={!data.pagination.hasNext}
				onclick={() => goToPage(data.pagination.page + 1)}
			>
				Next
				<Icon name="arrowRight" size={16} />
			</button>
		</div>
	{/if}
</div>

<!-- Details Modal -->
{#if showDetailsModal && selectedLog}
	<div class="modal modal-open">
		<div class="modal-box max-w-4xl">
			<h3 class="font-bold text-lg mb-4 flex items-center gap-2">
				<Icon name="alert" size={20} class="text-error" />
				Error Details
			</h3>

			<div class="space-y-4">
				<!-- Basic Info -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label class="label">
							<span class="label-text font-semibold">Error ID</span>
						</label>
						<div class="text-sm font-mono">{selectedLog.id}</div>
					</div>
					<div>
						<label class="label">
							<span class="label-text font-semibold">Time</span>
						</label>
						<div class="text-sm">{formatDate(selectedLog.createdAt)}</div>
					</div>
					<div>
						<label class="label">
							<span class="label-text font-semibold">Path</span>
						</label>
						<div class="text-sm font-mono break-all">{selectedLog.path}</div>
					</div>
					<div>
						<label class="label">
							<span class="label-text font-semibold">Method</span>
						</label>
						<span class="badge {getMethodBadgeClass(selectedLog.method)}">
							{selectedLog.method}
						</span>
					</div>
					{#if selectedLog.user}
						<div>
							<label class="label">
								<span class="label-text font-semibold">User</span>
							</label>
							<div class="text-sm">
								<div>{selectedLog.user.fullName}</div>
								<div class="text-base-content/60">{selectedLog.user.username}</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Message -->
				<div>
					<label class="label">
						<span class="label-text font-semibold">Error Message</span>
					</label>
					<div class="alert alert-error">
						<Icon name="alert" size={20} />
						<span class="break-all">{selectedLog.message}</span>
					</div>
				</div>

				<!-- Stack Trace -->
				{#if selectedLog.stack}
					<div>
						<label class="label">
							<span class="label-text font-semibold">Stack Trace</span>
						</label>
						<div class="mockup-code bg-base-300 text-sm max-h-96 overflow-auto">
							<pre><code>{selectedLog.stack}</code></pre>
						</div>
					</div>
				{/if}
			</div>

			<div class="modal-action">
				<button class="btn" onclick={closeDetailsModal}>Close</button>
			</div>
		</div>
		<div class="modal-backdrop" onclick={closeDetailsModal}></div>
	</div>
{/if}

