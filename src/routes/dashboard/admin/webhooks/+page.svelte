<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/icons/Icon.svelte';

	let { data, form }: { data: PageData; form: any } = $props();

	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let showTestModal = $state(false);
	let showDeleteModal = $state(false);
	let selectedWebhook: any = $state(null);
	let testUrl = $state('');

	let newUrl = $state('');
	let editUrl = $state('');
	let deleteId = $state('');

	function openAddModal() {
		newUrl = '';
		showAddModal = true;
	}

	function closeAddModal() {
		showAddModal = false;
		newUrl = '';
	}

	function openEditModal(webhook: any) {
		selectedWebhook = webhook;
		editUrl = webhook.url;
		showEditModal = true;
	}

	function closeEditModal() {
		showEditModal = false;
		selectedWebhook = null;
		editUrl = '';
	}

	function openTestModal(url?: string) {
		testUrl = url || '';
		showTestModal = true;
	}

	function closeTestModal() {
		showTestModal = false;
		testUrl = '';
	}

	function openDeleteModal(webhook: any) {
		selectedWebhook = webhook;
		deleteId = webhook.id;
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		selectedWebhook = null;
		deleteId = '';
	}

	function createEnhance() {
		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === 'success') {
				if (result.data?.success) {
					closeAddModal();
					await update();
					window.location.reload();
				}
			}
		};
	}

	function updateEnhance() {
		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === 'success') {
				if (result.data?.success) {
					closeEditModal();
					await update();
					window.location.reload();
				}
			}
		};
	}

	function testEnhance() {
		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === 'success') {
				closeTestModal();
				await update();
			}
		};
	}

	function deleteEnhance() {
		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === 'success') {
				if (result.data?.success) {
					closeDeleteModal();
					await update();
					window.location.reload();
				}
			}
		};
	}
</script>

<svelte:head>
	<title>จัดการ Discord Webhooks - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการ Discord Webhooks</h1>
			<p class="text-sm sm:text-base text-base-content/60 mt-1">จัดการการแจ้งเตือนผ่าน Discord Webhooks</p>
		</div>
		<button class="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto flex items-center justify-center gap-2" onclick={openAddModal}>
			<Icon name="add" size={18} class="flex-shrink-0" />
			<span class="whitespace-nowrap hidden sm:inline">เพิ่ม Webhook</span>
			<span class="whitespace-nowrap sm:hidden">เพิ่ม</span>
		</button>
	</div>

	<!-- Info Alert -->
	<div class="alert alert-info flex items-start gap-2">
		<Icon name="alert" size={24} class="flex-shrink-0" />
		<div class="flex-1">
			<h3 class="font-bold">เกี่ยวกับ Discord Webhooks</h3>
			<div class="text-sm">
				<p>ระบบจะส่งการแจ้งเตือนไปยังทุก Webhooks ที่เพิ่มไว้เมื่อมีการเพิ่ม/แก้ไข/ลบ/นำเข้าเคส</p>
				<p class="mt-1">การแจ้งเตือนจะรวมข้อมูล: โรค, หน่วยงาน, ประเภทผู้ป่วย, สถานะ, ตำบล, อำเภอ, จังหวัด</p>
			</div>
		</div>
	</div>

	<!-- Webhooks List -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-xl mb-4">รายการ Webhooks</h2>
			{#if data.webhooks.length === 0}
				<div class="text-center py-12">
					<Icon name="bell" size={48} class="mx-auto mb-4 opacity-30" />
					<p class="text-base-content/60 mb-4">ยังไม่มี Webhook</p>
					<button class="btn btn-primary flex items-center justify-center gap-2" onclick={openAddModal}>
						<Icon name="add" size={20} class="flex-shrink-0" />
						<span class="whitespace-nowrap">เพิ่ม Webhook แรก</span>
					</button>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>ลำดับ</th>
								<th>URL</th>
								<th>จัดการ</th>
							</tr>
						</thead>
						<tbody>
							{#each data.webhooks as webhook}
								<tr>
									<td>
										<div class="badge badge-primary">#{webhook.index}</div>
									</td>
									<td>
										<div class="max-w-md truncate" title={webhook.url}>
											{webhook.url}
										</div>
									</td>
									<td>
										<div class="flex gap-2">
											<button
												class="btn btn-sm btn-info"
												onclick={() => openTestModal(webhook.url)}
												title="ทดสอบ"
											>
												<Icon name="status" size={16} />
											</button>
											<button
												class="btn btn-sm btn-warning"
												onclick={() => openEditModal(webhook)}
												title="แก้ไข"
											>
												<Icon name="edit" size={16} />
											</button>
											<button
												class="btn btn-sm btn-error"
												onclick={() => openDeleteModal(webhook)}
												title="ลบ"
											>
												<Icon name="delete" size={16} />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add Modal -->
{#if showAddModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4">เพิ่ม Discord Webhook</h3>
			<form method="POST" action="?/create" use:enhance={createEnhance}>
				<div class="form-control mb-4">
					<label class="label">
						<span class="label-text">Webhook URL</span>
					</label>
					<input
						type="url"
						name="url"
						bind:value={newUrl}
						class="input input-bordered"
						placeholder="https://discord.com/api/webhooks/..."
						required
					/>
					<label class="label">
						<span class="label-text-alt">URL ต้องเริ่มต้นด้วย https://discord.com/api/webhooks/</span>
					</label>
				</div>
				<div class="modal-action">
					<button type="button" class="btn btn-ghost" onclick={closeAddModal}>ยกเลิก</button>
					<button type="submit" class="btn btn-primary">เพิ่ม</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}

<!-- Edit Modal -->
{#if showEditModal && selectedWebhook}
	<div class="modal modal-open">
		<div class="modal-box max-w-md sm:max-w-lg w-full m-2 sm:m-4">
			<h3 class="font-bold text-base sm:text-lg mb-3 sm:mb-4">แก้ไข Discord Webhook</h3>
			<form method="POST" action="?/update" use:enhance={updateEnhance}>
				<input type="hidden" name="id" value={selectedWebhook.id} />
				<div class="form-control mb-4">
					<label class="label">
						<span class="label-text">Webhook URL</span>
					</label>
					<input
						type="url"
						name="url"
						bind:value={editUrl}
						class="input input-bordered"
						placeholder="https://discord.com/api/webhooks/..."
						required
					/>
					<label class="label">
						<span class="label-text-alt">URL ต้องเริ่มต้นด้วย https://discord.com/api/webhooks/</span>
					</label>
				</div>
				<div class="modal-action flex-col sm:flex-row gap-2">
					<button type="button" class="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto" onclick={closeEditModal}>ยกเลิก</button>
					<button type="submit" class="btn btn-warning btn-sm sm:btn-md w-full sm:w-auto">บันทึก</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}

<!-- Test Modal -->
{#if showTestModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-md sm:max-w-lg w-full m-2 sm:m-4">
			<h3 class="font-bold text-base sm:text-lg mb-3 sm:mb-4">ทดสอบ Webhook</h3>
			<form method="POST" action="?/test" use:enhance={testEnhance}>
				<div class="form-control mb-4">
					<label class="label">
						<span class="label-text">Webhook URL</span>
					</label>
					<input
						type="url"
						name="url"
						bind:value={testUrl}
						class="input input-bordered"
						placeholder="https://discord.com/api/webhooks/..."
						required
					/>
					<label class="label">
						<span class="label-text-alt">ระบบจะส่งข้อความทดสอบไปยัง Discord channel</span>
					</label>
				</div>
				<div class="modal-action flex-col sm:flex-row gap-2">
					<button type="button" class="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto" onclick={closeTestModal}>ยกเลิก</button>
					<button type="submit" class="btn btn-info btn-sm sm:btn-md w-full sm:w-auto">ส่งทดสอบ</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}

<!-- Delete Modal -->
{#if showDeleteModal && selectedWebhook}
	<div class="modal modal-open">
		<div class="modal-box max-w-md sm:max-w-lg w-full m-2 sm:m-4">
			<h3 class="font-bold text-base sm:text-lg mb-3 sm:mb-4">ยืนยันการลบ</h3>
			<p class="mb-4">คุณต้องการลบ Webhook นี้หรือไม่?</p>
			<div class="bg-base-200 p-3 rounded mb-4">
				<p class="text-sm break-all">{selectedWebhook.url}</p>
			</div>
			<form method="POST" action="?/delete" use:enhance={deleteEnhance}>
				<input type="hidden" name="id" value={deleteId} />
				<div class="modal-action flex-col sm:flex-row gap-2">
					<button type="button" class="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto" onclick={closeDeleteModal}>ยกเลิก</button>
					<button type="submit" class="btn btn-error btn-sm sm:btn-md w-full sm:w-auto">ลบ</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}

