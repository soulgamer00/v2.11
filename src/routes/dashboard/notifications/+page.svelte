<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatDateThai } from '$lib/utils/date';
	import Icon from '$lib/components/icons/Icon.svelte';

	let { data, form }: { data: PageData; form: any } = $props();

	function formatDate(date: Date | string) {
		return formatDateThai(date);
	}
</script>

<svelte:head>
	<title>การแจ้งเตือน - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">การแจ้งเตือน</h1>
			<p class="text-sm sm:text-base text-base-content/60 mt-1">
				{#if data.unreadCount > 0}
					มี {data.unreadCount} รายการที่ยังไม่อ่าน
				{:else}
					ไม่มีรายการที่ยังไม่อ่าน
				{/if}
			</p>
		</div>
		{#if data.unreadCount > 0}
			<form method="POST" action="?/markAsRead" use:enhance>
				<button type="submit" class="btn btn-primary btn-sm w-full sm:w-auto flex items-center justify-center gap-2">
					<Icon name="check" size={16} class="flex-shrink-0" />
					<span class="whitespace-nowrap hidden sm:inline">ทำเครื่องหมายว่าอ่านทั้งหมด</span>
					<span class="whitespace-nowrap sm:hidden">อ่านทั้งหมด</span>
				</button>
			</form>
		{/if}
	</div>

	<!-- Notifications List -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			{#if data.notifications.length === 0}
				<div class="text-center py-12">
					<Icon name="bell" size={48} class="mx-auto mb-4 opacity-30" />
					<p class="text-base-content/60">ไม่มีการแจ้งเตือน</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each data.notifications as notification}
						<div class="flex items-start gap-4 p-4 rounded-lg hover:bg-base-200 transition-colors {notification.isRead ? 'opacity-60' : 'bg-base-200/50'}">
							<div class="flex-shrink-0 mt-1">
								{#if !notification.isRead}
									<div class="w-2 h-2 rounded-full bg-primary"></div>
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex justify-between items-start gap-2">
									<h3 class="font-semibold {notification.isRead ? '' : 'text-primary'}">
										{notification.title}
									</h3>
									{#if !notification.isRead}
										<form method="POST" action="?/markAsRead" use:enhance>
											<input type="hidden" name="id" value={notification.id} />
											<button type="submit" class="btn btn-ghost btn-xs" title="ทำเครื่องหมายว่าอ่านแล้ว">
												<Icon name="check" size={14} />
											</button>
										</form>
									{/if}
								</div>
								<p class="text-sm text-base-content/80 mt-1 whitespace-pre-wrap">
									{notification.message}
								</p>
								<p class="text-xs text-base-content/60 mt-2">
									{formatDate(notification.createdAt)}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

