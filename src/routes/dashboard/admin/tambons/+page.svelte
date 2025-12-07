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
				goto('/dashboard/admin/tambons', { invalidateAll: true });
			}
		}
	});

	let showModal = $state(false);
	let editMode = $state(false);
	let searchQuery = $state(data.search || '');
	let selectedProvinceId = $state(data.selectedProvinceId);
	let selectedAmphoeId = $state(data.selectedAmphoeId);
	let filteredAmphoes = $derived(
		selectedProvinceId 
			? data.amphoes.filter(a => a.provinceId === selectedProvinceId)
			: data.amphoes
	);

	function openAddModal() {
		editMode = false;
		$form = {
			code: '',
			nameTh: '',
			postalCode: '',
			amphoeId: selectedAmphoeId || undefined
		};
		showModal = true;
	}

	function openEditModal(tambon: any) {
		editMode = true;
		$form = {
			id: tambon.id,
			code: tambon.code,
			nameTh: tambon.nameTh,
			postalCode: tambon.postalCode || '',
			amphoeId: tambon.amphoeId
		};
		selectedProvinceId = tambon.amphoe.province.id;
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
			goto('/dashboard/admin/tambons', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
		}
	}

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchQuery) {
			params.set('search', searchQuery);
		}
		if (selectedProvinceId) {
			params.set('provinceId', selectedProvinceId.toString());
		}
		if (selectedAmphoeId) {
			params.set('amphoeId', selectedAmphoeId.toString());
		}
		goto(`/dashboard/admin/tambons?${params.toString()}`);
	}

	function handleProvinceFilter() {
		selectedAmphoeId = null;
		handleSearch();
	}

	function handleAmphoeFilter() {
		handleSearch();
	}
</script>

<svelte:head>
	<title>จัดการตำบล - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการตำบล</h1>
			<p class="text-sm text-base-content/70 mt-1">เพิ่ม แก้ไข และลบข้อมูลตำบล พร้อมรหัสไปรษณีย์</p>
		</div>
		<button
			type="button"
			class="btn btn-primary btn-sm sm:btn-md"
			onclick={openAddModal}
		>
			<Icon name="add" class="w-4 h-4 sm:w-5 sm:h-5" />
			<span class="hidden sm:inline">เพิ่มตำบล</span>
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
				<select
					class="select select-bordered select-sm flex-1 sm:flex-initial sm:w-48"
					bind:value={selectedAmphoeId}
					onchange={handleAmphoeFilter}
					disabled={!selectedProvinceId}
				>
					<option value={null}>ทุกอำเภอ</option>
					{#each filteredAmphoes as amphoe}
						<option value={amphoe.id}>{amphoe.nameTh}</option>
					{/each}
				</select>
				<input
					type="text"
					placeholder="ค้นหาตำบล (ชื่อ, รหัส, หรือรหัสไปรษณีย์)"
					class="input input-bordered input-sm flex-1"
					bind:value={searchQuery}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							handleSearch();
						}
					}}
				/>
				<button type="button" class="btn btn-sm btn-primary" onclick={handleSearch}>
					<Icon name="search" class="w-4 h-4" />
					ค้นหา
				</button>
			</div>
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
							<th>ชื่อตำบล</th>
							<th>อำเภอ</th>
							<th>จังหวัด</th>
							<th>รหัสไปรษณีย์</th>
							<th>จำนวนผู้ป่วย</th>
							<th>จำนวนเคส</th>
							<th class="text-center">จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if data.tambons.length === 0}
							<tr>
								<td colspan="8" class="text-center text-base-content/70 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each data.tambons as tambon}
								<tr>
									<td class="font-mono text-xs">{tambon.code}</td>
									<td class="font-medium">{tambon.nameTh}</td>
									<td>{tambon.amphoe.nameTh}</td>
									<td>{tambon.amphoe.province.nameTh}</td>
									<td class="font-mono">{tambon.postalCode || '-'}</td>
									<td>{tambon._count.patients.toLocaleString('th-TH')}</td>
									<td>{tambon._count.sickCases.toLocaleString('th-TH')}</td>
									<td>
										<div class="flex justify-center gap-1">
											<button
												type="button"
												class="btn btn-xs btn-ghost"
												onclick={() => openEditModal(tambon)}
												title="แก้ไข"
											>
												<Icon name="edit" class="w-4 h-4" />
											</button>
											<button
												type="button"
												class="btn btn-xs btn-ghost text-error"
												onclick={() => handleDelete(
													tambon.id,
													tambon.nameTh,
													tambon._count.patients + tambon._count.sickCases
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
				{editMode ? 'แก้ไขตำบล' : 'เพิ่มตำบล'}
			</h3>

			<form method="POST" action={editMode ? '?/update' : '?/create'} use:enhance>
				{#if editMode}
					<input type="hidden" name="id" value={$form.id} />
				{/if}

				<div class="space-y-4">
					<!-- Province (for filtering amphoes) -->
					<div class="form-control">
						<label class="label">
							<span class="label-text">จังหวัด</span>
						</label>
						<select
							class="select select-bordered select-sm"
							bind:value={selectedProvinceId}
							onchange={() => {
								$form.amphoeId = undefined;
							}}
						>
							<option value={null}>เลือกจังหวัด</option>
							{#each data.provinces as province}
								<option value={province.id}>{province.nameTh}</option>
							{/each}
						</select>
					</div>

					<!-- Amphoe -->
					<div class="form-control">
						<label class="label">
							<span class="label-text">อำเภอ <span class="text-error">*</span></span>
						</label>
						<select
							name="amphoeId"
							bind:value={$form.amphoeId}
							class="select select-bordered select-sm"
							disabled={!selectedProvinceId}
							required
						>
							<option value="">เลือกอำเภอ</option>
							{#each filteredAmphoes as amphoe}
								<option value={amphoe.id}>{amphoe.nameTh}</option>
							{/each}
						</select>
						{#if $errors.amphoeId}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.amphoeId}</span>
							</label>
						{/if}
					</div>

					<!-- Code -->
					<div class="form-control">
						<label class="label">
							<span class="label-text">รหัสตำบล <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							name="code"
							bind:value={$form.code}
							class="input input-bordered input-sm"
							placeholder="เช่น 100101"
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
							<span class="label-text">ชื่อตำบล <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							name="nameTh"
							bind:value={$form.nameTh}
							class="input input-bordered input-sm"
							placeholder="เช่น พระบรมมหาราชวัง"
							required
						/>
						{#if $errors.nameTh}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.nameTh}</span>
							</label>
						{/if}
					</div>

					<!-- Postal Code -->
					<div class="form-control">
						<label class="label">
							<span class="label-text">รหัสไปรษณีย์</span>
						</label>
						<input
							type="text"
							name="postalCode"
							bind:value={$form.postalCode}
							class="input input-bordered input-sm"
							placeholder="เช่น 10200"
							maxlength="5"
							pattern="[0-9]{5}"
						/>
						<label class="label">
							<span class="label-text-alt">5 หลัก (ตัวเลขเท่านั้น)</span>
						</label>
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

