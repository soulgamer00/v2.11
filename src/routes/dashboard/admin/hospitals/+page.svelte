<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import AutocompleteSearch from '$lib/components/AutocompleteSearch.svelte';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				closeModal();
				goto('/dashboard/admin/hospitals', { invalidateAll: true });
			}
		}
	});

	let showModal = $state(false);
	let editMode = $state(false);
	let searchQuery = $state(data.search || '');
	let selectedHospital: any = null;

	// Filter hospitals based on search
	let filteredHospitals = $derived(
		selectedHospital
			? data.hospitals.filter(h => h.id === selectedHospital.id)
			: searchQuery
				? data.hospitals.filter((h) =>
						h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						h.code9?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						h.code9New?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						h.code5?.toLowerCase().includes(searchQuery.toLowerCase())
				  )
				: data.hospitals
	);

	function handleHospitalSelect(hospital: any) {
		selectedHospital = hospital;
		searchQuery = hospital.name;
	}

	function openAddModal() {
		editMode = false;
		$form = {
			name: '',
			code9New: '',
			code9: '',
			code5: '',
			type: '',
			orgType: '',
			healthServiceType: '',
			affiliation: '',
			department: ''
		};
		showModal = true;
	}

	function openEditModal(hospital: any) {
		editMode = true;
		$form = {
			id: hospital.id,
			name: hospital.name,
			code9New: hospital.code9New || '',
			code9: hospital.code9 || '',
			code5: hospital.code5 || '',
			type: hospital.type || '',
			orgType: hospital.orgType || '',
			healthServiceType: hospital.healthServiceType || '',
			affiliation: hospital.affiliation || '',
			department: hospital.department || ''
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editMode = false;
	}

	async function handleDelete(id: number, name: string) {
		if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบหน่วยงาน "${name}"?`)) {
			return;
		}

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/hospitals', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
		}
	}

	function clearSearch() {
		searchQuery = '';
		selectedHospital = null;
	}
</script>

<svelte:head>
	<title>จัดการหน่วยงาน - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการหน่วยงาน</h1>
			<p class="text-sm sm:text-base text-base-content/60 mt-1">จัดการข้อมูลหน่วยงานสาธารณสุข</p>
		</div>
		<button class="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-2" onclick={openAddModal}>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			<span class="whitespace-nowrap hidden sm:inline">เพิ่มหน่วยงาน</span>
			<span class="whitespace-nowrap sm:hidden">เพิ่ม</span>
		</button>
	</div>

	<!-- Search Bar -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<AutocompleteSearch
				bind:value={searchQuery}
				placeholder="ค้นหา: ชื่อหน่วยงาน, รหัส..."
				clientData={data.hospitals}
				clientSearchFn={(hospital, query) => {
					if (!hospital || !query) return false;
					const q = query.toLowerCase();
					const name = hospital.name || '';
					const code9 = hospital.code9 || '';
					const code9New = hospital.code9New || '';
					const code5 = hospital.code5 || '';
					return (
						name.toLowerCase().includes(q) ||
						code9.toLowerCase().includes(q) ||
						code9New.toLowerCase().includes(q) ||
						code5.toLowerCase().includes(q)
					);
				}}
				onSelect={handleHospitalSelect}
				displayFn={(hospital) => hospital.name || ''}
				detailFn={(hospital) => {
					const details = [];
					if (hospital.code9New) details.push(`รหัส 9 หลัก: ${hospital.code9New}`);
					if (hospital.code5) details.push(`รหัส 5 หลัก: ${hospital.code5}`);
					return details.join(' | ');
				}}
				size="sm"
			/>
			{#if searchQuery || selectedHospital}
				<button class="btn btn-ghost btn-sm mt-2" onclick={clearSearch}>
					ล้างการค้นหา
				</button>
			{/if}
		</div>
	</div>

	<!-- Statistics -->
	<div class="stats shadow w-full">
		<div class="stat">
			<div class="stat-title">หน่วยงานทั้งหมด</div>
			<div class="stat-value text-primary">{data.hospitals.length}</div>
		</div>
		<div class="stat">
			<div class="stat-title">แสดงผล</div>
			<div class="stat-value text-success">{filteredHospitals.length}</div>
		</div>
	</div>

	<!-- Hospitals Table -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>ชื่อหน่วยงาน</th>
							<th>รหัส 9 หลัก</th>
							<th>รหัส 5 หลัก</th>
							<th>สังกัด</th>
							<th>จำนวนผู้ใช้</th>
							<th>จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if data.hospitals.length === 0}
							<tr>
								<td colspan="6" class="text-center text-base-content/60 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each filteredHospitals as hospital}
								<tr>
									<td>
										<div class="font-semibold">{hospital.name}</div>
										<div class="text-xs text-base-content/60">{hospital.healthServiceType || hospital.type || '-'}</div>
									</td>
									<td class="font-mono text-primary font-bold">{hospital.code9New || hospital.code9 || '-'}</td>
									<td class="font-mono">{hospital.code5 || '-'}</td>
									<td>
										<div class="text-sm">{hospital.affiliation || '-'}</div>
										<div class="text-xs text-base-content/60">{hospital.department || ''}</div>
									</td>
									<td>
										<span class="badge badge-info">{hospital._count.users} คน</span>
									</td>
									<td>
										<div class="flex gap-1">
											<button class="btn btn-sm btn-ghost hover:btn-primary" onclick={() => openEditModal(hospital)} aria-label="แก้ไข">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
											</button>
											<button class="btn btn-sm btn-ghost hover:btn-error" onclick={() => handleDelete(hospital.id, hospital.name)} aria-label="ลบ">
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
				{editMode ? 'แก้ไขข้อมูลหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}
			</h3>

			<form method="POST" action="?/{editMode ? 'update' : 'create'}" use:enhance>
				{#if editMode}
					<input type="hidden" name="id" bind:value={$form.id} />
				{/if}

				<div class="space-y-4">
					<!-- Name -->
					<div class="form-control">
						<label class="label" for="name">
							<span class="label-text">ชื่อหน่วยงาน <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="name"
							name="name"
							bind:value={$form.name}
							class="input input-bordered"
							class:input-error={$errors.name}
							placeholder="เช่น โรงพยาบาลจุฬาลงกรณ์"
							required
						/>
						{#if $errors.name}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.name}</span>
							</label>
						{/if}
					</div>

					<!-- Code 9 New (Primary) -->
					<div class="form-control">
						<label class="label" for="code9New">
							<span class="label-text">รหัส 9 หลัก <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="code9New"
							name="code9New"
							bind:value={$form.code9New}
							class="input input-bordered"
							class:input-error={$errors.code9New}
							placeholder="เช่น BA0000712"
							maxlength="9"
							required
						/>
						{#if $errors.code9New}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.code9New}</span>
							</label>
						{/if}
					</div>

					<!-- Code 9 Old (Legacy, Optional) -->
					<div class="form-control">
						<label class="label" for="code9">
							<span class="label-text">รหัส 9 หลัก (เดิม - เลือกกรอก)</span>
						</label>
						<input
							type="text"
							id="code9"
							name="code9"
							bind:value={$form.code9}
							class="input input-bordered"
							placeholder="เช่น 000071200"
							maxlength="9"
						/>
					</div>

					<!-- Code 5 -->
					<div class="form-control">
						<label class="label" for="code5">
							<span class="label-text">รหัส 5 หลัก</span>
						</label>
						<input
							type="text"
							id="code5"
							name="code5"
							bind:value={$form.code5}
							class="input input-bordered"
							placeholder="เช่น 10001"
							maxlength="5"
						/>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
						<!-- Org Type -->
						<div class="form-control">
							<label class="label" for="orgType">
								<span class="label-text">ประเภทองค์กร</span>
							</label>
							<select
								id="orgType"
								name="orgType"
								bind:value={$form.orgType}
								class="select select-bordered"
							>
								<option value="">เลือกประเภท</option>
								<option value="รัฐบาล">รัฐบาล</option>
								<option value="เอกชน">เอกชน</option>
								<option value="รัฐวิสาหกิจ">รัฐวิสาหกิจ</option>
								<option value="อื่นๆ">อื่นๆ</option>
							</select>
						</div>

						<!-- Health Service Type -->
						<div class="form-control">
							<label class="label" for="healthServiceType">
								<span class="label-text">ประเภทหน่วยบริการ</span>
							</label>
							<input
								type="text"
								id="healthServiceType"
								name="healthServiceType"
								bind:value={$form.healthServiceType}
								class="input input-bordered"
								placeholder="เช่น รพ.สต., รพ.ทั่วไป"
							/>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
						<!-- Affiliation -->
						<div class="form-control">
							<label class="label" for="affiliation">
								<span class="label-text">สังกัด</span>
							</label>
							<input
								type="text"
								id="affiliation"
								name="affiliation"
								bind:value={$form.affiliation}
								class="input input-bordered"
								placeholder="เช่น กระทรวงสาธารณสุข"
							/>
						</div>

						<!-- Department -->
						<div class="form-control">
							<label class="label" for="department">
								<span class="label-text">กรม/แผนก</span>
							</label>
							<input
								type="text"
								id="department"
								name="department"
								bind:value={$form.department}
								class="input input-bordered"
								placeholder="เช่น สป.สธ."
							/>
						</div>
					</div>
				</div>

				<div class="modal-action">
					<button type="button" class="btn" onclick={closeModal}>ยกเลิก</button>
					<button type="submit" class="btn btn-primary" disabled={$delayed}>
						{#if $delayed}
							<span class="loading loading-spinner"></span>
						{/if}
						{editMode ? 'บันทึกการแก้ไข' : 'เพิ่มหน่วยงาน'}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}

