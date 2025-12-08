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
				goto('/dashboard/admin/occupations', { invalidateAll: true });
			}
		}
	});

	let showModal = $state(false);
	let editMode = $state(false);
	let searchQuery = $state(data.search || '');
	let selectedOccupation: any = null;

	// Filter occupations based on search
	let filteredOccupations = $derived(
		selectedOccupation
			? data.occupations.filter(o => o.id === selectedOccupation.id)
			: searchQuery
				? data.occupations.filter((o) =>
						o.value.toLowerCase().includes(searchQuery.toLowerCase())
				  )
				: data.occupations
	);

	function handleOccupationSelect(occupation: any) {
		selectedOccupation = occupation;
		searchQuery = occupation.value;
	}

	function clearSearch() {
		searchQuery = '';
		selectedOccupation = null;
	}

	function openAddModal() {
		editMode = false;
		$form = {
			value: ''
		};
		showModal = true;
	}

	function openEditModal(occupation: any) {
		editMode = true;
		$form = {
			id: occupation.id,
			value: occupation.value
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editMode = false;
	}

	async function handleDelete(id: number) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบอาชีพนี้? (ข้อมูลที่เกี่ยวข้องจะถูกล้างออก)')) {
			return;
		}

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/occupations', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
		}
	}

</script>

<svelte:head>
	<title>จัดการอาชีพ - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการอาชีพ</h1>
			<p class="text-base-content/60 mt-1">จัดการข้อมูลอาชีพสำหรับผู้ป่วย</p>
		</div>
		<button class="btn btn-primary" onclick={openAddModal}>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			เพิ่มอาชีพ
		</button>
	</div>

	<!-- Search Bar -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<AutocompleteSearch
				bind:value={searchQuery}
				placeholder="ค้นหาอาชีพ..."
				clientData={data.occupations}
				clientSearchFn={(occupation, query) => {
					if (!occupation || !query) return false;
					const value = occupation.value || '';
					return value.toLowerCase().includes(query.toLowerCase());
				}}
				onSelect={handleOccupationSelect}
				displayFn={(occupation) => occupation.value || ''}
				detailFn={(occupation) => {
					return occupation.usageCount > 0 ? `ใช้งาน ${occupation.usageCount} รายการ` : 'ไม่มีการใช้งาน';
				}}
				size="sm"
			/>
			{#if searchQuery || selectedOccupation}
				<button class="btn btn-ghost btn-sm mt-2" onclick={clearSearch}>
					ล้างการค้นหา
				</button>
			{/if}
		</div>
	</div>

	<!-- Statistics -->
	<div class="stats shadow w-full">
		<div class="stat">
			<div class="stat-title">อาชีพทั้งหมด</div>
			<div class="stat-value text-primary">{data.occupations.length}</div>
		</div>
		<div class="stat">
			<div class="stat-title">มีการใช้งาน</div>
			<div class="stat-value text-success">
				{data.occupations.filter((occ) => occ.usageCount > 0).length}
			</div>
		</div>
		<div class="stat">
			<div class="stat-title">แสดงผล</div>
			<div class="stat-value text-info">{filteredOccupations.length}</div>
		</div>
	</div>

	<!-- Occupations Table -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>#</th>
							<th>ชื่ออาชีพ</th>
							<th>จำนวนการใช้งาน</th>
							<th>จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if data.occupations.length === 0}
							<tr>
								<td colspan="4" class="text-center text-base-content/60 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each filteredOccupations as occupation, index}
								<tr>
									<td>{index + 1}</td>
									<td class="font-semibold">{occupation.value}</td>
									<td>
										{#if occupation.usageCount > 0}
											<span class="badge badge-info">{occupation.usageCount} รายการ</span>
										{:else}
											<span class="badge badge-ghost">ไม่มีการใช้งาน</span>
										{/if}
									</td>
									<td>
										<div class="flex gap-2">
											<button
												class="btn btn-sm btn-ghost"
												onclick={() => openEditModal(occupation)}
												aria-label="แก้ไข"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
											</button>
											<button
												class="btn btn-sm btn-ghost hover:btn-error"
												onclick={() => handleDelete(occupation.id)}
												aria-label="ลบ"
											>
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
		<div class="modal-box max-w-lg">
			<h3 class="font-bold text-lg mb-4">
				{editMode ? 'แก้ไขอาชีพ' : 'เพิ่มอาชีพใหม่'}
			</h3>

			<form method="POST" action="?/{editMode ? 'update' : 'create'}" use:enhance>
				{#if editMode}
					<input type="hidden" name="id" bind:value={$form.id} />
				{/if}

				<div class="space-y-4">
					<!-- Value -->
					<div class="form-control">
						<label class="label" for="value">
							<span class="label-text">ชื่ออาชีพ <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="value"
							name="value"
							bind:value={$form.value}
							class="input input-bordered"
							class:input-error={$errors.value}
							placeholder="เช่น เกษตรกร, พนักงานเอกชน"
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
					<button type="button" class="btn" onclick={closeModal}>ยกเลิก</button>
					<button type="submit" class="btn btn-primary" disabled={$delayed}>
						{#if $delayed}
							<span class="loading loading-spinner"></span>
						{/if}
						{editMode ? 'บันทึกการแก้ไข' : 'เพิ่มอาชีพ'}
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}



