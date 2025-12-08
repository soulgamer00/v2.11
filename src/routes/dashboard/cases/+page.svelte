<script lang="ts">
	import type { PageData } from './$types';
	import { formatDateThai } from '$lib/utils/date';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/icons/Icon.svelte';
	import AutocompleteSearch from '$lib/components/AutocompleteSearch.svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedCase: any = null;
	let showFilterModal = $state(false);
	
	// Filter states
	let filterDiseaseName = $state<string | null>(null);
	let filterHospitalName = $state<string | null>(null);
	let filterCondition = $state<string | null>(null);
	let filterGender = $state<string | null>(null);
	let filterStartDate = $state<string>('');
	let filterEndDate = $state<string>('');
	
	// Get unique values for filters
	let uniqueDiseases = $derived(
		Array.from(new Map(data.cases.map((c: any) => [c.disease.nameTh, c.disease.nameTh])).entries()).map(([name]) => name)
	);
	let uniqueHospitals = $derived(
		Array.from(new Map(data.cases.map((c: any) => [c.hospital.name, c.hospital.name])).entries()).map(([name]) => name)
	);
	
	let filteredCases = $derived(
		data.cases.filter((c: any) => {
			// Search filter
			if (selectedCase) {
				if (c.id !== selectedCase.id) return false;
			} else if (searchQuery) {
				const q = searchQuery.toLowerCase();
				const matchesSearch = 
					c.patient.firstName.toLowerCase().includes(q) ||
					c.patient.lastName.toLowerCase().includes(q) ||
					c.disease.nameTh.toLowerCase().includes(q);
				if (!matchesSearch) return false;
			}
			
			// Disease filter
			if (filterDiseaseName !== null && c.disease.nameTh !== filterDiseaseName) return false;
			
			// Hospital filter
			if (filterHospitalName !== null && c.hospital.name !== filterHospitalName) return false;
			
			// Condition filter
			if (filterCondition !== null && c.condition !== filterCondition) return false;
			
			// Gender filter
			if (filterGender !== null && c.patient.gender !== filterGender) return false;
			
			// Date range filter
			if (filterStartDate && c.illnessDate) {
				const illnessDate = new Date(c.illnessDate);
				const startDate = new Date(filterStartDate);
				if (illnessDate < startDate) return false;
			}
			if (filterEndDate && c.illnessDate) {
				const illnessDate = new Date(c.illnessDate);
				const endDate = new Date(filterEndDate);
				endDate.setHours(23, 59, 59, 999);
				if (illnessDate > endDate) return false;
			}
			
			return true;
		})
	);
	
	function handleCaseSelect(caseItem: any) {
		selectedCase = caseItem;
		searchQuery = `${caseItem.patient.firstName} ${caseItem.patient.lastName} - ${caseItem.disease.nameTh}`;
	}
	
	function clearFilters() {
		filterDiseaseName = null;
		filterHospitalName = null;
		filterCondition = null;
		filterGender = null;
		filterStartDate = '';
		filterEndDate = '';
	}
	
	function getActiveFilterCount() {
		let count = 0;
		if (filterDiseaseName !== null) count++;
		if (filterHospitalName !== null) count++;
		if (filterCondition !== null) count++;
		if (filterGender !== null) count++;
		if (filterStartDate) count++;
		if (filterEndDate) count++;
		return count;
	}

	async function handleDelete(id: string) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายงานเคสนี้? (ข้อมูลจะถูกย้ายไปยังถังขยะและสามารถกู้คืนได้)')) {
			return;
		}

		const formData = new FormData();
		formData.append('id', id);

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/cases', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
		}
	}
</script>

<svelte:head>
	<title>รายงานผู้ป่วย - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">รายงานผู้ป่วย</h1>
			<p class="text-xs sm:text-sm text-base-content/60 mt-1">รายการรายงานผู้ป่วยโรคติดต่อทั้งหมด</p>
		</div>
		<div class="flex gap-2 w-full sm:w-auto">
			{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
				<a href="/dashboard/cases/new" class="btn btn-primary btn-sm sm:btn-md flex items-center gap-1 sm:gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					<span class="whitespace-nowrap hidden sm:inline">บันทึกรายงานใหม่</span>
					<span class="whitespace-nowrap sm:hidden">เพิ่มใหม่</span>
				</a>
			{/if}
			<a href="/dashboard/import-export" class="btn btn-outline btn-sm sm:btn-md flex items-center gap-1 sm:gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
				</svg>
				<span class="whitespace-nowrap">นำเข้า/ส่งออก</span>
			</a>
		</div>
	</div>

	<!-- Search and Filters -->
	<div class="card bg-base-100 shadow">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<div class="flex flex-col sm:flex-row gap-2 sm:gap-4">
				<div class="flex-1">
					<AutocompleteSearch
						bind:value={searchQuery}
						placeholder="ค้นหา: ชื่อผู้ป่วย, โรค..."
						clientData={data.cases}
						clientSearchFn={(caseItem, query) => {
							if (!caseItem || !query) return false;
							const q = query.toLowerCase();
							const firstName = caseItem.patient?.firstName || '';
							const lastName = caseItem.patient?.lastName || '';
							const diseaseName = caseItem.disease?.nameTh || '';
							const diseaseCode = caseItem.disease?.code || '';
							return (
								firstName.toLowerCase().includes(q) ||
								lastName.toLowerCase().includes(q) ||
								diseaseName.toLowerCase().includes(q) ||
								diseaseCode.toLowerCase().includes(q)
							);
						}}
						onSelect={handleCaseSelect}
						displayFn={(caseItem) => {
							if (!caseItem) return '';
							const patient = caseItem.patient || {};
							const disease = caseItem.disease || {};
							return `${patient.firstName || ''} ${patient.lastName || ''} - ${disease.nameTh || ''}`.trim();
						}}
						detailFn={(caseItem) => {
							if (!caseItem) return '';
							const disease = caseItem.disease || {};
							const details = [];
							if (disease.code) details.push(`รหัสโรค: ${disease.code}`);
							if (caseItem.illnessDate) details.push(`วันที่ป่วย: ${formatDateThai(caseItem.illnessDate)}`);
							return details.join(' | ');
						}}
						size="sm"
					/>
				</div>
				<button 
					class="btn btn-outline btn-sm sm:btn-md w-full sm:w-auto relative"
					onclick={() => showFilterModal = true}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<span class="hidden sm:inline">ตัวกรอง</span>
					<span class="sm:hidden">กรอง</span>
					{#if getActiveFilterCount() > 0}
						<span class="badge badge-primary badge-sm absolute -top-2 -right-2">{getActiveFilterCount()}</span>
					{/if}
				</button>
				<!--<button class="btn btn-outline btn-success btn-sm sm:btn-md w-full sm:w-auto">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<span class="hidden sm:inline">ส่งออก Excel</span>
					<span class="sm:hidden">ส่งออก</span>
				</button>-->
			</div>
		</div>
	</div>

	<!-- Statistics -->
	<div class="stats stats-vertical sm:stats-horizontal shadow w-full">
		<div class="stat">
			<div class="stat-title">ทั้งหมด</div>
			<div class="stat-value text-primary">{data.cases.length}</div>
			<div class="stat-desc">รายการ</div>
		</div>
		<div class="stat">
			<div class="stat-title">เดือนนี้</div>
			<div class="stat-value text-secondary">{data.casesThisMonth}</div>
			<div class="stat-desc">รายการ</div>
		</div>
		<div class="stat">
			<div class="stat-title">สัปดาห์นี้</div>
			<div class="stat-value">{data.casesThisWeek}</div>
			<div class="stat-desc">รายการ</div>
		</div>
	</div>

	<!-- Cases Table/List -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body p-2 sm:p-4 md:p-6">
			<!-- Desktop Table View -->
			<div class="hidden md:block overflow-x-auto">
				<table class="table table-zebra table-sm md:table-md w-full">
					<thead>
						<tr>
							<th>วันที่ป่วย</th>
							<th>ชื่อ-นามสกุล</th>
							<th>อายุ</th>
							<th>เพศ</th>
							<th>โรค</th>
							<th>หน่วยงาน</th>
							<th>สถานะ</th>
							<th>จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredCases.length === 0}
							<tr>
								<td colspan="8" class="text-center text-base-content/60 py-8">
									ไม่พบข้อมูล
								</td>
							</tr>
						{:else}
							{#each filteredCases as caseReport}
								<tr>
									<td>{formatDateThai(caseReport.illnessDate)}</td>
									<td>
										<div class="font-semibold">
											{caseReport.patient.prefix} {caseReport.patient.firstName} {caseReport.patient.lastName}
										</div>
										{#if caseReport.patient.idCard}
											<div class="text-xs text-base-content/60">
												{caseReport.patient.idCard}
											</div>
										{/if}
									</td>
									<td>{caseReport.ageYears} ปี</td>
									<td>{caseReport.patient.gender === 'MALE' ? 'ชาย' : 'หญิง'}</td>
									<td>
										<div class="badge badge-primary badge-sm">{caseReport.disease.abbreviation || caseReport.disease.nameTh}</div>
									</td>
									<td class="text-sm max-w-[150px] truncate" title={caseReport.hospital.name}>{caseReport.hospital.name}</td>
									<td>
										{#if caseReport.condition === 'RECOVERED'}
											<span class="badge badge-success gap-1">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
												หาย
											</span>
										{:else if caseReport.condition === 'DIED'}
											<span class="badge badge-error gap-1">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
												เสียชีวิต
											</span>
										{:else}
											<span class="badge badge-warning">รักษาอยู่</span>
										{/if}
									</td>
									<td>
										<div class="flex gap-1 items-center">
											<a 
												href="/dashboard/cases/{caseReport.id}" 
												class="btn btn-ghost btn-xs hover:btn-info"
												title="ดูรายละเอียด"
											>
												<Icon name="search" size={14} />
											</a>
											{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
												<a 
													href="/dashboard/cases/{caseReport.id}/edit" 
													class="btn btn-ghost btn-xs hover:btn-warning"
													title="แก้ไข"
												>
													<Icon name="edit" size={14} />
												</a>
												<button
													class="btn btn-ghost btn-xs hover:btn-error"
													onclick={() => handleDelete(caseReport.id)}
													title="ลบ"
												>
													<Icon name="delete" size={14} />
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

			<!-- Mobile Card View -->
			<div class="md:hidden space-y-3">
				{#if filteredCases.length === 0}
					<div class="text-center text-base-content/60 py-8">
						ไม่พบข้อมูล
					</div>
				{:else}
					{#each filteredCases as caseReport}
						<div class="card bg-base-200 shadow-sm border border-base-300">
							<div class="card-body p-3">
								<!-- Header Row -->
								<div class="flex justify-between items-start mb-2">
									<div class="flex-1 min-w-0">
										<div class="font-semibold text-sm truncate">
											{caseReport.patient.prefix} {caseReport.patient.firstName} {caseReport.patient.lastName}
										</div>
										<div class="text-xs text-base-content/60 mt-0.5">
											{formatDateThai(caseReport.illnessDate)}
										</div>
									</div>
									<div class="flex gap-1 ml-2 flex-shrink-0">
										{#if caseReport.condition === 'RECOVERED'}
											<span class="badge badge-success badge-xs gap-0.5">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
												หาย
											</span>
										{:else if caseReport.condition === 'DIED'}
											<span class="badge badge-error badge-xs gap-0.5">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
												เสียชีวิต
											</span>
										{:else}
											<span class="badge badge-warning badge-xs">รักษาอยู่</span>
										{/if}
									</div>
								</div>

								<!-- Info Row -->
								<div class="flex flex-wrap gap-2 text-xs mb-2">
									<div class="badge badge-primary badge-xs">{caseReport.disease.abbreviation || caseReport.disease.nameTh}</div>
									<span class="text-base-content/60">{caseReport.ageYears} ปี</span>
									<span class="text-base-content/60">{caseReport.patient.gender === 'MALE' ? 'ชาย' : 'หญิง'}</span>
								</div>

								<!-- Hospital -->
								<div class="text-xs text-base-content/60 mb-2 truncate" title={caseReport.hospital.name}>
									{caseReport.hospital.name}
								</div>

								<!-- Actions -->
								<div class="flex gap-1 justify-end mt-2 pt-2 border-t border-base-300">
									<a 
										href="/dashboard/cases/{caseReport.id}" 
										class="btn btn-ghost btn-xs"
										title="ดูรายละเอียด"
									>
										<Icon name="search" size={14} />
										<span class="ml-1">ดู</span>
									</a>
									{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
										<a 
											href="/dashboard/cases/{caseReport.id}/edit" 
											class="btn btn-ghost btn-xs"
											title="แก้ไข"
										>
											<Icon name="edit" size={14} />
											<span class="ml-1">แก้ไข</span>
										</a>
										<button
											class="btn btn-ghost btn-xs text-error"
											onclick={() => handleDelete(caseReport.id)}
											title="ลบ"
										>
											<Icon name="delete" size={14} />
											<span class="ml-1">ลบ</span>
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Pagination -->
			<div class="flex justify-center mt-4">
				<div class="join">
					<button class="join-item btn btn-sm">«</button>
					<button class="join-item btn btn-sm btn-active">1</button>
					<button class="join-item btn btn-sm">»</button>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Filter Modal -->
{#if showFilterModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl">
			<h3 class="font-bold text-lg mb-4">ตัวกรองข้อมูล</h3>
			
			<div class="space-y-4">
				<!-- Disease Filter -->
				<div class="form-control">
					<label class="label" for="filter-disease">
						<span class="label-text">โรค</span>
					</label>
					<select 
						id="filter-disease"
						class="select select-bordered select-sm"
						bind:value={filterDiseaseName}
					>
						<option value={null}>ทุกโรค</option>
						{#each uniqueDiseases as diseaseName}
							<option value={diseaseName}>{diseaseName}</option>
						{/each}
					</select>
				</div>
				
				<!-- Hospital Filter -->
				<div class="form-control">
					<label class="label" for="filter-hospital">
						<span class="label-text">หน่วยงาน</span>
					</label>
					<select 
						id="filter-hospital"
						class="select select-bordered select-sm"
						bind:value={filterHospitalName}
					>
						<option value={null}>ทุกหน่วยงาน</option>
						{#each uniqueHospitals as hospitalName}
							<option value={hospitalName}>{hospitalName}</option>
						{/each}
					</select>
				</div>
				
				<!-- Condition Filter -->
				<div class="form-control">
					<label class="label" for="filter-condition">
						<span class="label-text">สถานะ</span>
					</label>
					<select 
						id="filter-condition"
						class="select select-bordered select-sm"
						bind:value={filterCondition}
					>
						<option value={null}>ทุกสถานะ</option>
						<option value="UNDER_TREATMENT">รักษาอยู่</option>
						<option value="RECOVERED">หาย</option>
						<option value="DIED">เสียชีวิต</option>
					</select>
				</div>
				
				<!-- Gender Filter -->
				<div class="form-control">
					<label class="label" for="filter-gender">
						<span class="label-text">เพศ</span>
					</label>
					<select 
						id="filter-gender"
						class="select select-bordered select-sm"
						bind:value={filterGender}
					>
						<option value={null}>ทุกเพศ</option>
						<option value="MALE">ชาย</option>
						<option value="FEMALE">หญิง</option>
					</select>
				</div>
				
				<!-- Date Range -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="form-control">
						<label class="label" for="filter-start-date">
							<span class="label-text">วันที่เริ่มต้น</span>
						</label>
						<input 
							id="filter-start-date"
							type="date" 
							class="input input-bordered input-sm"
							bind:value={filterStartDate}
						/>
					</div>
					<div class="form-control">
						<label class="label" for="filter-end-date">
							<span class="label-text">วันที่สิ้นสุด</span>
						</label>
						<input 
							id="filter-end-date"
							type="date" 
							class="input input-bordered input-sm"
							bind:value={filterEndDate}
						/>
					</div>
				</div>
			</div>
			
			<div class="modal-action">
				<button class="btn btn-ghost" onclick={clearFilters}>
					ล้างทั้งหมด
				</button>
				<button class="btn btn-primary" onclick={() => showFilterModal = false}>
					ปิด
				</button>
			</div>
		</div>
		<div class="modal-backdrop" role="button" tabindex="0" onclick={() => showFilterModal = false} onkeydown={(e) => e.key === 'Enter' && (showFilterModal = false)}></div>
	</div>
{/if}

