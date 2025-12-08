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
				goto('/dashboard/admin/provinces', { invalidateAll: true });
			}
		}
	});

	let showModal = $state(false);
	let editMode = $state(false);
	let searchQuery = $state(data.search || '');
	let selectedProvince: any = null;

	// Filter provinces based on search
	let filteredProvinces = $derived(
		selectedProvince
			? data.provinces.filter(p => p.id === selectedProvince.id)
			: searchQuery
				? data.provinces.filter((p) =>
						p.nameTh.toLowerCase().includes(searchQuery.toLowerCase()) ||
						p.code.toLowerCase().includes(searchQuery.toLowerCase())
				  )
				: data.provinces
	);

	function handleProvinceSelect(province: any) {
		selectedProvince = province;
		searchQuery = province.nameTh;
	}

	function clearSearch() {
		searchQuery = '';
		selectedProvince = null;
	}

	function openAddModal() {
		editMode = false;
		$form = {
			code: '',
			nameTh: ''
		};
		showModal = true;
	}

	function openEditModal(province: any) {
		editMode = true;
		$form = {
			id: province.id,
			code: province.code,
			nameTh: province.nameTh
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
			goto('/dashboard/admin/provinces', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
		}
	}

</script>

<svelte:head>
	<title>จัดการจังหวัด - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการจังหวัด</h1>
			<p class="text-sm text-base-content/70 mt-1">เพิ่ม แก้ไข และลบข้อมูลจังหวัด</p>
		</div>
		<button
			type="button"
			class="btn btn-primary btn-sm sm:btn-md"
			onclick={openAddModal}
		>
			<Icon name="add" class="w-4 h-4 sm:w-5 sm:h-5" />
			<span class="hidden sm:inline">เพิ่มจังหวัด</span>
		</button>
	</div>

	<!-- Search -->
	<div class="card bg-base-100 shadow">
		<div class="card-body p-4">
			<AutocompleteSearch
				bind:value={searchQuery}
				placeholder="ค้นหาจังหวัด (ชื่อหรือรหัส)"
				clientData={data.provinces}
				clientSearchFn={(province, query) => {
					if (!province || !query) return false;
					const q = query.toLowerCase();
					const nameTh = province.nameTh || '';
					const code = province.code || '';
					return nameTh.toLowerCase().includes(q) || code.toLowerCase().includes(q);
				}}
				onSelect={handleProvinceSelect}
				displayFn={(province) => province.nameTh || ''}
				detailFn={(province) => {
					const details = [];
					details.push(`รหัส: ${province.code}`);
					details.push(`อำเภอ: ${province._count.amphoes} แห่ง`);
					details.push(`ผู้ป่วย: ${province._count.patients} คน`);
					return details.join(' | ');
				}}
				size="sm"
			/>
			{#if searchQuery || selectedProvince}
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
							<th>ชื่อจังหวัด</th>
							<th>จำนวนอำเภอ</th>
							<th>จำนวนผู้ป่วย</th>
							<th>จำนวนเคส</th>
							<th class="text-center">จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if data.provinces.length === 0}
							<tr>
								<td colspan="6" class="text-center text-base-content/70 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each filteredProvinces as province}
								<tr>
									<td class="font-mono text-xs">{province.code}</td>
									<td class="font-medium">{province.nameTh}</td>
									<td>{province._count.amphoes.toLocaleString('th-TH')}</td>
									<td>{province._count.patients.toLocaleString('th-TH')}</td>
									<td>{province._count.sickCases.toLocaleString('th-TH')}</td>
									<td>
										<div class="flex justify-center gap-1">
											<button
												type="button"
												class="btn btn-xs btn-ghost"
												onclick={() => openEditModal(province)}
												title="แก้ไข"
											>
												<Icon name="edit" class="w-4 h-4" />
											</button>
											<button
												type="button"
												class="btn btn-xs btn-ghost text-error"
												onclick={() => handleDelete(
													province.id,
													province.nameTh,
													province._count.patients + province._count.sickCases + province._count.amphoes
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
				{editMode ? 'แก้ไขจังหวัด' : 'เพิ่มจังหวัด'}
			</h3>

			<form method="POST" action={editMode ? '?/update' : '?/create'} use:enhance>
				{#if editMode}
					<input type="hidden" name="id" value={$form.id} />
				{/if}

				<div class="space-y-4">
					<!-- Code -->
					<div class="form-control">
						<label class="label">
							<span class="label-text">รหัสจังหวัด <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							name="code"
							bind:value={$form.code}
							class="input input-bordered input-sm"
							placeholder="เช่น 10"
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
							<span class="label-text">ชื่อจังหวัด <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							name="nameTh"
							bind:value={$form.nameTh}
							class="input input-bordered input-sm"
							placeholder="เช่น กรุงเทพมหานคร"
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

