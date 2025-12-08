<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import Icon from '$lib/components/icons/Icon.svelte';
	import AutocompleteSearch from '$lib/components/AutocompleteSearch.svelte';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				closeModal();
				goto('/dashboard/admin/amphoes', { invalidateAll: true });
			}
		}
	});

	let showModal = $state(false);
	let editMode = $state(false);
	let searchQuery = $state(data.search || '');
	let selectedProvinceId = $state(data.selectedProvinceId);
	let selectedAmphoe: any = null;

	// Filter amphoes based on province and search
	let filteredAmphoes = $derived(
		selectedAmphoe
			? data.amphoes.filter(a => a.id === selectedAmphoe.id)
			: searchQuery || selectedProvinceId
				? data.amphoes.filter((a) => {
						const matchesProvince = !selectedProvinceId || a.provinceId === selectedProvinceId;
						const matchesSearch = !searchQuery || 
							a.nameTh.toLowerCase().includes(searchQuery.toLowerCase()) ||
							a.code.toLowerCase().includes(searchQuery.toLowerCase());
						return matchesProvince && matchesSearch;
				  })
				: data.amphoes
	);

	function handleAmphoeSelect(amphoe: any) {
		selectedAmphoe = amphoe;
		searchQuery = amphoe.nameTh;
		selectedProvinceId = amphoe.provinceId;
	}

	function clearSearch() {
		searchQuery = '';
		selectedAmphoe = null;
	}

	function openAddModal() {
		editMode = false;
		$form = {
			code: '',
			nameTh: '',
			provinceId: selectedProvinceId || undefined
		};
		showModal = true;
	}

	function openEditModal(amphoe: any) {
		editMode = true;
		$form = {
			id: amphoe.id,
			code: amphoe.code,
			nameTh: amphoe.nameTh,
			provinceId: amphoe.provinceId
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editMode = false;
	}

	async function handleDelete(id: number, nameTh: string, usageCount: number) {
		let confirmMessage = `คุณแน่ใจหรือไม่ที่จะลบ "${nameTh}"?`;
		if (usageCount > 0) {
			confirmMessage = `คุณแน่ใจหรือไม่ที่จะลบ "${nameTh}"?\n\nมีข้อมูลที่เกี่ยวข้องอยู่ ${usageCount} รายการ\n(การลบนี้เป็น Soft Delete - ข้อมูลจะยังคงอยู่ในระบบ)`;
		}

		if (!confirm(confirmMessage)) {
			return;
		}

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/amphoes', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
		}
	}

	function handleProvinceFilter() {
		selectedAmphoe = null;
		searchQuery = '';
	}
</script>

<svelte:head>
	<title>จัดการอำเภอ - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการอำเภอ</h1>
			<p class="text-sm text-base-content/70 mt-1">เพิ่ม แก้ไข และลบข้อมูลอำเภอ</p>
		</div>
		<button
			type="button"
			class="btn btn-primary btn-sm sm:btn-md"
			onclick={openAddModal}
		>
			<Icon name="add" class="w-4 h-4 sm:w-5 sm:h-5" />
			<span class="hidden sm:inline">เพิ่มอำเภอ</span>
		</button>
	</div>

	<!-- Filters -->
	<div class="card bg-base-100 shadow">
		<div class="card-body p-4">
			<div class="flex flex-col sm:flex-row gap-2">
				<select
					class="select select-bordered select-sm flex-1 sm:flex-initial sm:w-48"
					bind:value={selectedProvinceId}
					onchange={handleProvinceFilter}
				>
					<option value={null}>ทุกจังหวัด</option>
					{#each data.provinces as province}
						<option value={province.id}>{province.nameTh}</option>
					{/each}
				</select>
				<div class="flex-1">
					<AutocompleteSearch
						bind:value={searchQuery}
						placeholder="ค้นหาอำเภอ (ชื่อหรือรหัส)"
						clientData={data.amphoes.filter(a => !selectedProvinceId || a.provinceId === selectedProvinceId)}
						clientSearchFn={(amphoe, query) => {
							if (!amphoe || !query) return false;
							const q = query.toLowerCase();
							const nameTh = amphoe.nameTh || '';
							const code = amphoe.code || '';
							return nameTh.toLowerCase().includes(q) || code.toLowerCase().includes(q);
						}}
						onSelect={handleAmphoeSelect}
						displayFn={(amphoe) => amphoe.nameTh || ''}
						detailFn={(amphoe) => {
							const details = [];
							details.push(`รหัส: ${amphoe.code}`);
							details.push(`จังหวัด: ${amphoe.province.nameTh}`);
							details.push(`ตำบล: ${amphoe._count.tambons} แห่ง`);
							return details.join(' | ');
						}}
						size="sm"
					/>
				</div>
			</div>
			{#if searchQuery || selectedAmphoe}
				<button class="btn btn-ghost btn-sm mt-2" onclick={clearSearch}>
					ล้างการค้นหา
				</button>
			{/if}
		</div>
	</div>

	<!-- Table -->
	<div class="card bg-base-100 shadow">
		<div class="card-body p-0">
			<div class="overflow-x-auto">
				<table class="table table-xs sm:table-sm md:table-md">
					<thead>
						<tr>
							<th>รหัส</th>
							<th>ชื่ออำเภอ</th>
							<th>จังหวัด</th>
							<th>จำนวนตำบล</th>
							<th>จำนวนผู้ป่วย</th>
							<th>จำนวนเคส</th>
							<th class="text-center">จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if data.amphoes.length === 0}
							<tr>
								<td colspan="7" class="text-center text-base-content/70 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each filteredAmphoes as amphoe}
								<tr>
									<td class="font-mono text-xs">{amphoe.code}</td>
									<td class="font-medium">{amphoe.nameTh}</td>
									<td>{amphoe.province.nameTh}</td>
									<td>{amphoe._count.tambons.toLocaleString('th-TH')}</td>
									<td>{amphoe._count.patients.toLocaleString('th-TH')}</td>
									<td>{amphoe._count.sickCases.toLocaleString('th-TH')}</td>
									<td>
										<div class="flex justify-center gap-1">
											<button
												type="button"
												class="btn btn-xs btn-ghost"
												onclick={() => openEditModal(amphoe)}
												title="แก้ไข"
											>
												<Icon name="edit" class="w-4 h-4" />
											</button>
											<button
												type="button"
												class="btn btn-xs btn-ghost text-error"
												onclick={() => handleDelete(
													amphoe.id,
													amphoe.nameTh,
													amphoe._count.patients + amphoe._count.sickCases + amphoe._count.tambons
												)}
												title="ลบ"
											>
												<Icon name="delete" class="w-4 h-4" />
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

<!-- Add/Edit Modal -->
{#if showModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-full sm:max-w-lg m-2 sm:m-4">
			<h3 class="font-bold text-lg mb-4">
				{editMode ? 'แก้ไขอำเภอ' : 'เพิ่มอำเภอ'}
			</h3>

			<form method="POST" action={editMode ? '?/update' : '?/create'} use:enhance>
				{#if editMode}
					<input type="hidden" name="id" value={$form.id} />
				{/if}

				<div class="space-y-4">
					<!-- Province -->
					<div class="form-control">
						<label class="label">
							<span class="label-text">จังหวัด <span class="text-error">*</span></span>
						</label>
						<select
							name="provinceId"
							bind:value={$form.provinceId}
							class="select select-bordered select-sm"
							required
						>
							<option value="">เลือกจังหวัด</option>
							{#each data.provinces as province}
								<option value={province.id}>{province.nameTh}</option>
							{/each}
						</select>
						{#if $errors.provinceId}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.provinceId}</span>
							</label>
						{/if}
					</div>

					<!-- Code -->
					<div class="form-control">
						<label class="label">
							<span class="label-text">รหัสอำเภอ <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							name="code"
							bind:value={$form.code}
							class="input input-bordered input-sm"
							placeholder="เช่น 1001"
							required
						/>
						{#if $errors.code}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.code}</span>
							</label>
						{/if}
					</div>

					<!-- Name -->
					<div class="form-control">
						<label class="label">
							<span class="label-text">ชื่ออำเภอ <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							name="nameTh"
							bind:value={$form.nameTh}
							class="input input-bordered input-sm"
							placeholder="เช่น เขตพระนคร"
							required
						/>
						{#if $errors.nameTh}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.nameTh}</span>
							</label>
						{/if}
					</div>
				</div>

				<div class="modal-action">
					<button type="button" class="btn btn-sm" onclick={closeModal}>
						ยกเลิก
					</button>
					<button type="submit" class="btn btn-primary btn-sm" disabled={$delayed}>
						{#if $delayed}
							<span class="loading loading-spinner loading-xs"></span>
							กำลังบันทึก...
						{:else}
							บันทึก
						{/if}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}

