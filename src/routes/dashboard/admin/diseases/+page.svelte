<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				closeModal();
				// Reload page
				goto('/dashboard/admin/diseases', { invalidateAll: true });
			}
		}
	});

	let showModal = $state(false);
	let editMode = $state(false);
	let searchQuery = $state(data.search || '');
	let selectedDisease = $state<any>(null);

	function openAddModal() {
		editMode = false;
		selectedDisease = null;
		$form = {
			code: '',
			nameTh: '',
			nameEn: '',
			abbreviation: '',
			symptoms: '',
			isActive: true
		};
		showModal = true;
	}

	function openEditModal(disease: any) {
		editMode = true;
		selectedDisease = disease;
		$form = {
			id: disease.id,
			code: disease.code,
			nameTh: disease.nameTh,
			nameEn: disease.nameEn || '',
			abbreviation: disease.abbreviation || '',
			symptoms: disease.symptoms || '',
			isActive: disease.isActive
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editMode = false;
		selectedDisease = null;
	}

	async function handleDelete(id: number) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโรคนี้? (ถ้ามีการใช้งานอยู่จะทำการปิดการใช้งานแทน)')) {
			return;
		}

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/diseases', { invalidateAll: true });
		}
	}

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchQuery) {
			params.set('search', searchQuery);
		}
		goto(`/dashboard/admin/diseases?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>จัดการโรค - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการข้อมูลโรค</h1>
			<p class="text-base-content/60 mt-1">จัดการข้อมูลโรคติดต่อนำโดยแมลง</p>
		</div>
		<button class="btn btn-primary" onclick={openAddModal}>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			เพิ่มโรคใหม่
		</button>
	</div>

	<!-- Search Bar -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="ค้นหา: รหัสโรค, ชื่อโรค, ชื่อย่อ..."
					class="input input-bordered flex-1"
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
				/>
				<button class="btn btn-primary" onclick={handleSearch}>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					ค้นหา
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
			<div class="stat-title">โรคทั้งหมด</div>
			<div class="stat-value text-primary">{data.diseases.length}</div>
		</div>
		<div class="stat">
			<div class="stat-title">ใช้งานอยู่</div>
			<div class="stat-value text-success">{data.diseases.filter(d => d.isActive).length}</div>
		</div>
		<div class="stat">
			<div class="stat-title">ปิดการใช้งาน</div>
			<div class="stat-value text-error">{data.diseases.filter(d => !d.isActive).length}</div>
		</div>
	</div>

	<!-- Diseases Table -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>รหัส ICD-10</th>
							<th>ชื่อโรค (ไทย)</th>
							<th>ชื่อโรค (อังกฤษ)</th>
							<th>ชื่อย่อ</th>
							<th>สถานะ</th>
							<th>จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if data.diseases.length === 0}
							<tr>
								<td colspan="6" class="text-center text-base-content/60 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each data.diseases as disease}
								<tr>
									<td class="font-mono font-bold">{disease.code}</td>
									<td>{disease.nameTh}</td>
									<td>{disease.nameEn || '-'}</td>
									<td>
										{#if disease.abbreviation}
											<span class="badge badge-primary">{disease.abbreviation}</span>
										{:else}
											-
										{/if}
									</td>
									<td>
										{#if disease.isActive}
											<span class="badge badge-success">ใช้งาน</span>
										{:else}
											<span class="badge badge-error">ปิดการใช้งาน</span>
										{/if}
									</td>
									<td>
										<div class="flex gap-2">
											<button class="btn btn-sm btn-ghost" onclick={() => openEditModal(disease)} aria-label="แก้ไข">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
											</button>
											<button class="btn btn-sm btn-ghost text-error" onclick={() => handleDelete(disease.id)} aria-label="ลบ">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
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
		<div class="modal-box max-w-2xl">
			<h3 class="font-bold text-lg mb-4">
				{editMode ? 'แก้ไขข้อมูลโรค' : 'เพิ่มโรคใหม่'}
			</h3>

			<form method="POST" action="?/{editMode ? 'update' : 'create'}" use:enhance>
				{#if editMode}
					<input type="hidden" name="id" bind:value={$form.id} />
				{/if}

				<div class="space-y-4">
					<!-- Code -->
					<div class="form-control">
						<label class="label" for="code">
							<span class="label-text">รหัส ICD-10 <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="code"
							name="code"
							bind:value={$form.code}
							class="input input-bordered"
							class:input-error={$errors.code}
							placeholder="เช่น A90"
							required
						/>
						{#if $errors.code}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.code}</span>
							</label>
						{/if}
					</div>

					<!-- Name Thai -->
					<div class="form-control">
						<label class="label" for="nameTh">
							<span class="label-text">ชื่อโรค (ภาษาไทย) <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="nameTh"
							name="nameTh"
							bind:value={$form.nameTh}
							class="input input-bordered"
							class:input-error={$errors.nameTh}
							placeholder="เช่น ไข้เลือดออก"
							required
						/>
						{#if $errors.nameTh}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.nameTh}</span>
							</label>
						{/if}
					</div>

					<!-- Name English -->
					<div class="form-control">
						<label class="label" for="nameEn">
							<span class="label-text">ชื่อโรค (ภาษาอังกฤษ)</span>
						</label>
						<input
							type="text"
							id="nameEn"
							name="nameEn"
							bind:value={$form.nameEn}
							class="input input-bordered"
							placeholder="เช่น Dengue fever"
						/>
					</div>

					<!-- Abbreviation -->
					<div class="form-control">
						<label class="label" for="abbreviation">
							<span class="label-text">ชื่อย่อ</span>
						</label>
						<input
							type="text"
							id="abbreviation"
							name="abbreviation"
							bind:value={$form.abbreviation}
							class="input input-bordered"
							placeholder="เช่น DHF"
						/>
					</div>

					<!-- Symptoms -->
					<div class="form-control">
						<label class="label" for="symptoms">
							<span class="label-text">อาการ/รายละเอียด</span>
						</label>
						<textarea
							id="symptoms"
							name="symptoms"
							bind:value={$form.symptoms}
							class="textarea textarea-bordered"
							rows="3"
							placeholder="อาการและรายละเอียดของโรค"
						></textarea>
					</div>

					<!-- Is Active -->
					<div class="form-control">
						<label class="label cursor-pointer justify-start gap-2">
							<input
								type="checkbox"
								name="isActive"
								bind:checked={$form.isActive}
								class="checkbox checkbox-primary"
							/>
							<span class="label-text">ใช้งาน</span>
						</label>
					</div>
				</div>

				<div class="modal-action">
					<button type="button" class="btn" onclick={closeModal}>ยกเลิก</button>
					<button type="submit" class="btn btn-primary" disabled={$delayed}>
						{#if $delayed}
							<span class="loading loading-spinner"></span>
						{/if}
						{editMode ? 'บันทึกการแก้ไข' : 'เพิ่มโรค'}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}



