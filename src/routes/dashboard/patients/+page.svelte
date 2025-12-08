<script lang="ts">
	import type { PageData } from './$types';
	import { formatDateThai } from '$lib/utils/date';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/icons/Icon.svelte';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let showSuggestions = $state(false);
	let selectedIndex = $state(-1);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Autocomplete search with dropdown
	async function handleSearchInput(value: string) {
		searchQuery = value;
		selectedIndex = -1;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		if (!value || value.length < 1) {
			searchResults = [];
			showSuggestions = false;
			return;
		}

		searchTimeout = setTimeout(async () => {
			try {
				const response = await fetch(`/api/patients/search?q=${encodeURIComponent(value)}`);
				const results = await response.json();
				searchResults = results;
				showSuggestions = results.length > 0 && value.length > 0;
			} catch (error) {
				console.error('Search error:', error);
				searchResults = [];
				showSuggestions = false;
			}
		}, 200);
	}

	function selectPatient(patient: any) {
		searchQuery = `${patient.prefix || ''} ${patient.firstName} ${patient.lastName}`.trim();
		showSuggestions = false;
		selectedIndex = -1;
		searchResults = [];
		// Filter to show only selected patient
		filteredPatients = data.patients.filter(p => p.id === patient.id);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!showSuggestions || searchResults.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		} else if (e.key === 'Enter' && selectedIndex >= 0) {
			e.preventDefault();
			selectPatient(searchResults[selectedIndex]);
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			selectedIndex = -1;
		}
	}

	// Filter patients based on search query
	let filteredPatients = $derived(
		searchQuery && searchResults.length > 0
			? data.patients.filter((p) =>
					searchResults.some((result) => result.id === p.id)
			  )
			: searchQuery
				? data.patients.filter((p) => {
						const query = searchQuery.toLowerCase();
						return (
							p.firstName.toLowerCase().includes(query) ||
							p.lastName.toLowerCase().includes(query) ||
							`${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
							p.idCard?.includes(searchQuery)
						);
				  })
				: data.patients
	);

	async function handleDelete(id: string) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ป่วยนี้? (ข้อมูลจะถูกย้ายไปยังถังขยะและสามารถกู้คืนได้)')) {
			return;
		}

		const formData = new FormData();
		formData.append('id', id);

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/patients', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
		}
	}

	// Close suggestions when clicking outside
	if (browser) {
		$effect(() => {
			function handleClickOutside(e: MouseEvent) {
				const target = e.target as HTMLElement;
				if (!target.closest('.search-container')) {
					showSuggestions = false;
				}
			}

			if (showSuggestions) {
				document.addEventListener('click', handleClickOutside);
				return () => document.removeEventListener('click', handleClickOutside);
			}
		});
	}
</script>

<svelte:head>
	<title>ทะเบียนผู้ป่วย - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">ทะเบียนผู้ป่วย</h1>
			<p class="text-base-content/60 mt-1">รายชื่อผู้ป่วยทั้งหมดในระบบ</p>
		</div>
		<a href="/dashboard/import-export" class="btn btn-outline">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
			</svg>
			นำเข้า/ส่งออก
		</a>
	</div>

	<!-- Search with Autocomplete Dropdown -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="form-control search-container relative">
				<label class="label">
					<span class="label-text font-semibold">ค้นหาผู้ป่วย</span>
				</label>
				<div class="relative">
					<input
						type="text"
						bind:value={searchQuery}
						oninput={(e) => handleSearchInput(e.currentTarget.value)}
						onkeydown={handleKeyDown}
						onfocus={() => {
							if (searchResults.length > 0 && searchQuery.length > 0) {
								showSuggestions = true;
							}
						}}
						placeholder="พิมพ์ชื่อ, นามสกุล, หรือเลขบัตรประชาชน..."
						class="input input-bordered w-full pr-10"
						autocomplete="off"
					/>
					<Icon name="search" size={20} class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40" />
					{#if showSuggestions && searchResults.length > 0}
						<div class="absolute z-50 w-full mt-1 bg-base-100 border-2 border-primary rounded-lg shadow-2xl max-h-80 overflow-y-auto dropdown-menu">
							<div class="px-3 py-2 text-xs font-semibold text-base-content/60 border-b border-base-300 bg-base-200 sticky top-0">
								พบ {searchResults.length} รายการที่ใกล้เคียง
							</div>
							{#each searchResults as result, index}
								<button
									type="button"
									class="w-full text-left px-4 py-3 hover:bg-primary hover:text-primary-content transition-colors {index === selectedIndex
										? 'bg-primary text-primary-content'
										: 'bg-base-100'} border-b border-base-200 last:border-b-0"
									onclick={() => selectPatient(result)}
									onmouseenter={() => selectedIndex = index}
								>
									<div class="flex items-start justify-between gap-2">
										<div class="flex-1">
											<div class="font-semibold text-base">
												{result.prefix || ''} {result.firstName} {result.lastName}
											</div>
											<div class="text-sm mt-1 space-y-0.5">
												{#if result.idCard}
													<div class="flex items-center gap-2">
														<span class="text-base-content/60">เลขบัตร:</span>
														<span class="font-mono">{result.idCard}</span>
													</div>
												{/if}
												{#if result.phone}
													<div class="flex items-center gap-2">
														<span class="text-base-content/60">โทร:</span>
														<span>{result.phone}</span>
													</div>
												{/if}
											</div>
										</div>
										<div class="text-xs text-base-content/40">
											คลิกเพื่อเลือก
										</div>
									</div>
								</button>
							{/each}
							{#if searchResults.length === 0 && searchQuery.length >= 2}
								<div class="px-4 py-3 text-center text-base-content/60">
									ไม่พบข้อมูลที่ใกล้เคียง
								</div>
							{/if}
						</div>
					{/if}
				</div>
				{#if searchQuery && !showSuggestions && searchQuery.length >= 2}
					<label class="label">
						<span class="label-text-alt text-base-content/60">
							กำลังค้นหา... ({filteredPatients.length} รายการ)
						</span>
					</label>
				{/if}
			</div>
		</div>
	</div>

	<!-- Statistics -->
	<div class="stats shadow w-full">
		<div class="stat">
			<div class="stat-title">ผู้ป่วยทั้งหมด</div>
			<div class="stat-value text-primary">{data.patients.length}</div>
			<div class="stat-desc">คน</div>
		</div>
		<div class="stat">
			<div class="stat-title">ชาย</div>
			<div class="stat-value text-info">{data.patients.filter(p => p.gender === 'MALE').length}</div>
			<div class="stat-desc">คน</div>
		</div>
		<div class="stat">
			<div class="stat-title">หญิง</div>
			<div class="stat-value text-secondary">{data.patients.filter(p => p.gender === 'FEMALE').length}</div>
			<div class="stat-desc">คน</div>
		</div>
	</div>

	<!-- Patients Table -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>เลขบัตรประชาชน</th>
							<th>ชื่อ-นามสกุล</th>
							<th>เพศ</th>
							<th>วันเกิด</th>
							<th>อาชีพ</th>
							<th>จำนวนรายงาน</th>
							<th>จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredPatients.length === 0}
							<tr>
								<td colspan="7" class="text-center text-base-content/60 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each filteredPatients as patient}
								<tr>
									<td class="font-mono">{patient.idCard || '-'}</td>
									<td>
										<div class="font-semibold">
											{patient.prefix} {patient.firstName} {patient.lastName}
										</div>
										{#if patient.phone}
											<div class="text-sm text-base-content/60">{patient.phone}</div>
										{/if}
									</td>
									<td>{patient.gender === 'MALE' ? 'ชาย' : 'หญิง'}</td>
									<td>{formatDateThai(patient.birthDate)}</td>
									<td>{patient.occupation || '-'}</td>
									<td>
										<div class="badge badge-info">{patient._count.cases} รายงาน</div>
									</td>
									<td>
										<div class="flex gap-1 sm:gap-2 items-center">
											<a href="/dashboard/patients/{patient.id}" class="btn btn-ghost btn-sm btn-square" title="ดูรายละเอียด">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
												</svg>
											</a>
											{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
												<a
													href="/dashboard/patients/{patient.id}/edit"
													class="btn btn-ghost btn-sm btn-square hover:btn-primary transition-all"
													aria-label="แก้ไข"
													title="แก้ไขข้อมูลผู้ป่วย"
												>
													<Icon name="edit" size={18} />
												</a>
												<button
													class="btn btn-ghost btn-sm btn-square hover:btn-error transition-all"
													onclick={() => handleDelete(patient.id)}
													aria-label="ลบ"
													title="ลบผู้ป่วย (Soft Delete)"
												>
													<Icon name="delete" size={18} />
												</button>
											{/if}
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

