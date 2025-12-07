<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import Icon from '$lib/components/icons/Icon.svelte';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				closeModal();
				goto(`/dashboard/admin/masterdata?category=${data.category}`, { invalidateAll: true });
			}
		}
	});

	let showModal = $state(false);
	let editMode = $state(false);
	let searchQuery = $state(data.search || '');

	const categoryLabels: Record<string, string> = {
		PREFIX: 'คำนำหน้า',
		NATIONALITY: 'สัญชาติ',
		MARITAL_STATUS: 'สถานภาพ'
	};

	function openAddModal() {
		editMode = false;
		$form = {
			category: data.category,
			value: ''
		};
		showModal = true;
	}

	function openEditModal(item: any) {
		editMode = true;
		$form = {
			id: item.id,
			category: item.category,
			value: item.value
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editMode = false;
	}

	async function handleDelete(id: number, value: string) {
		if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ "${value}"? (ข้อมูลที่เกี่ยวข้องจะถูกล้างออก)`)) {
			return;
		}

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto(`/dashboard/admin/masterdata?category=${data.category}`, { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
		}
	}

	function handleSearch() {
		const params = new URLSearchParams();
		params.set('category', data.category);
		if (searchQuery) {
			params.set('search', searchQuery);
		}
		goto(`/dashboard/admin/masterdata?${params.toString()}`);
	}

	function changeCategory(category: string) {
		const params = new URLSearchParams();
		params.set('category', category);
		if (searchQuery) {
			params.set('search', searchQuery);
		}
		goto(`/dashboard/admin/masterdata?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>จัดการข้อมูลอ้างอิง - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการข้อมูลอ้างอิง</h1>
			<p class="text-base-content/60 mt-1">จัดการคำนำหน้า, สัญชาติ, และสถานภาพ</p>
		</div>
		<button class="btn btn-primary btn-sm sm:btn-md hover:scale-105 transition-all flex items-center justify-center gap-2" onclick={openAddModal}>
			<Icon name="add" size={18} class="flex-shrink-0" />
			<span class="whitespace-nowrap">เพิ่ม{categoryLabels[data.category]}</span>
		</button>
	</div>

	<!-- Category Tabs -->
	<div class="tabs tabs-boxed">
		<button
			type="button"
			class="tab hover:scale-105 transition-all"
			class:tab-active={data.category === 'PREFIX'}
			onclick={() => changeCategory('PREFIX')}
		>
			คำนำหน้า
		</button>
		<button
			type="button"
			class="tab hover:scale-105 transition-all"
			class:tab-active={data.category === 'NATIONALITY'}
			onclick={() => changeCategory('NATIONALITY')}
		>
			สัญชาติ
		</button>
		<button
			type="button"
			class="tab hover:scale-105 transition-all"
			class:tab-active={data.category === 'MARITAL_STATUS'}
			onclick={() => changeCategory('MARITAL_STATUS')}
		>
			สถานภาพ
		</button>
	</div>

	<!-- Search Bar -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="ค้นหา..."
					class="input input-bordered flex-1"
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
				/>
				<button class="btn btn-primary" onclick={handleSearch}>
					<Icon name="search" size={20} />
				</button>
				{#if searchQuery}
					<button class="btn btn-ghost" onclick={() => { searchQuery = ''; handleSearch(); }}>
						ล้าง
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Statistics -->
	<div class="stats shadow w-full">
		<div class="stat">
			<div class="stat-title">{categoryLabels[data.category]}ทั้งหมด</div>
			<div class="stat-value text-primary">{data.masterData.length}</div>
		</div>
		<div class="stat">
			<div class="stat-title">มีการใช้งาน</div>
			<div class="stat-value text-success">
				{data.masterData.filter((item) => item.usageCount > 0).length}
			</div>
		</div>
	</div>

	<!-- MasterData Table -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>#</th>
							<th>ค่า</th>
							<th>จำนวนการใช้งาน</th>
							<th>จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if data.masterData.length === 0}
							<tr>
								<td colspan="4" class="text-center text-base-content/60 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each data.masterData as item, index}
								<tr>
									<td>{index + 1}</td>
									<td class="font-semibold">{item.value}</td>
									<td>
										{#if item.usageCount > 0}
											<span class="badge badge-info">{item.usageCount} รายการ</span>
										{:else}
											<span class="badge badge-ghost">ไม่มีการใช้งาน</span>
										{/if}
									</td>
									<td>
										<div class="flex gap-1">
											<button
												class="btn btn-sm btn-ghost hover:btn-primary"
												onclick={() => openEditModal(item)}
												aria-label="แก้ไข"
											>
												<Icon name="edit" size={16} />
											</button>
											<button
												class="btn btn-sm btn-ghost hover:btn-error"
												onclick={() => handleDelete(item.id, item.value)}
												aria-label="ลบ"
											>
												<Icon name="delete" size={16} />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- Modal -->
{#if showModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-lg">
			<h3 class="font-bold text-lg mb-4">
				{editMode ? `แก้ไข${categoryLabels[data.category]}` : `เพิ่ม${categoryLabels[data.category]}ใหม่`}
			</h3>

			<form method="POST" action="?/{editMode ? 'update' : 'create'}" use:enhance>
				{#if editMode}
					<input type="hidden" name="id" bind:value={$form.id} />
				{/if}
				<input type="hidden" name="category" bind:value={$form.category} />

				<div class="space-y-4">
					<!-- Value -->
					<div class="form-control">
						<label class="label" for="value">
							<span class="label-text">{categoryLabels[data.category]} <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="value"
							name="value"
							bind:value={$form.value}
							class="input input-bordered"
							class:input-error={$errors.value}
							placeholder={`กรอก${categoryLabels[data.category]}`}
							required
						/>
						{#if $errors.value}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.value}</span>
							</label>
						{/if}
					</div>
				</div>

				<div class="modal-action">
					<button type="button" class="btn btn-outline" onclick={closeModal}>ยกเลิก</button>
					<button type="submit" class="btn btn-primary" disabled={$delayed}>
						{#if $delayed}
							<span class="loading loading-spinner"></span>
						{/if}
						{editMode ? 'บันทึกการแก้ไข' : `เพิ่ม${categoryLabels[data.category]}`}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}

