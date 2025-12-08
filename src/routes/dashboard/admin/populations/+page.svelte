<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Icon from '$lib/components/icons/Icon.svelte';
	import { browser } from '$app/environment';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedYear = $state(data.selectedYear);
	let saving = $state(false);
	let savingHospitalId = $state<number | null>(null);
	let showAddYearModal = $state(false);
	let newYear = $state(new Date().getFullYear());
	let searchQuery = $state('');
	
	// Create reactive local state for hospitals
	let hospitals = $state([...data.hospitals]);
	
	let newPopulationData = $state(
		hospitals.reduce((acc, h) => {
			acc[h.id] = h.population; // Initialize with current population
			return acc;
		}, {} as Record<number, number>)
	);

	// Filter hospitals based on search query
	let filteredHospitals = $derived(
		searchQuery
			? hospitals.filter((h) =>
					h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					h.code9?.includes(searchQuery)
			  )
			: hospitals
	);

	// Update hospitals and newPopulationData when data changes (after year change)
	// Use a ref to track the last data year to prevent infinite loops
	let lastDataYear = data.selectedYear;
	
	$effect(() => {
		// Only react to changes in data.selectedYear (not local selectedYear state)
		const currentDataYear = data.selectedYear;
		
		// Only update if data actually changed
		if (currentDataYear !== lastDataYear) {
			lastDataYear = currentDataYear;
			selectedYear = currentDataYear;
			// Sync hospitals with loaded data
			hospitals = [...data.hospitals];
			// Sync newPopulationData with loaded data
			const newData: Record<number, number> = {};
			hospitals.forEach(h => {
				newData[h.id] = h.population; // Initialize with current population
			});
			newPopulationData = newData;
		}
	});

	function handleYearChange() {
		const params = new URLSearchParams();
		params.set('year', selectedYear.toString());
		goto(`/dashboard/admin/populations?${params.toString()}`);
	}

	function calculateTotal() {
		return hospitals.reduce((sum, h) => sum + (h.population || 0), 0);
	}

	function calculateNewTotal() {
		return filteredHospitals.reduce((sum, h) => sum + (newPopulationData[h.id] || 0), 0);
	}

	async function handleSaveSingle(hospitalId: number, hospitalName: string) {
		const amount = newPopulationData[hospitalId] || 0;
		
		if (amount < 0) {
			alert('จำนวนประชากรต้องไม่น้อยกว่า 0');
			return;
		}

		// Save current scroll position
		const scrollPosition = window.scrollY;
		const rowElement = document.getElementById(`hospital-${hospitalId}`);
		const rowOffset = rowElement ? rowElement.offsetTop : scrollPosition;

		savingHospitalId = hospitalId;

		const formData = new FormData();
		formData.append('hospitalId', hospitalId.toString());
		formData.append('year', selectedYear.toString());
		formData.append('amount', amount.toString());

		try {
			const response = await fetch('?/updateSinglePopulation', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				// Update local state without reloading page
				// Find and update the hospital in the hospitals array
				for (let i = 0; i < hospitals.length; i++) {
					if (hospitals[i].id === hospitalId) {
						// Create a new array to trigger reactivity
						hospitals = [
							...hospitals.slice(0, i),
							{ ...hospitals[i], population: amount },
							...hospitals.slice(i + 1)
						];
						break;
					}
				}
				
				// Restore scroll position after a brief delay to allow DOM update
				setTimeout(() => {
					const updatedRowElement = document.getElementById(`hospital-${hospitalId}`);
					if (updatedRowElement) {
						updatedRowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
					} else {
						window.scrollTo(0, scrollPosition);
					}
				}, 100);
				
				// Show success message briefly
				const successMsg = document.createElement('div');
				successMsg.className = 'alert alert-success fixed top-4 right-4 z-50 shadow-lg';
				successMsg.innerHTML = `
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>บันทึกข้อมูล ${hospitalName} สำเร็จ</span>
				`;
				document.body.appendChild(successMsg);
				setTimeout(() => {
					successMsg.remove();
				}, 3000);
			} else {
				alert(result.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
			}
		} catch (error) {
			console.error('Save error:', error);
			alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
		} finally {
			savingHospitalId = null;
		}
	}

	function openAddYearModal() {
		newYear = new Date().getFullYear();
		showAddYearModal = true;
	}

	function closeAddYearModal() {
		showAddYearModal = false;
	}

	function handleAddYear() {
		if (newYear && !data.availableYears.includes(newYear)) {
			// Navigate to the new year
			const params = new URLSearchParams();
			params.set('year', newYear.toString());
			goto(`/dashboard/admin/populations?${params.toString()}`);
			closeAddYearModal();
		}
	}

	async function handleDelete(hospitalId: number, hospitalName: string) {
		if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบข้อมูลประชากรของ "${hospitalName}" ในปี ${selectedYear + 543}?`)) {
			return;
		}

		const formData = new FormData();
		formData.append('hospitalId', hospitalId.toString());
		formData.append('year', selectedYear.toString());

		const response = await fetch('?/deletePopulation', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			// Update local state without reloading page
			// Find and update the hospital in the hospitals array
			const hospitalIndex = hospitals.findIndex(h => h.id === hospitalId);
			if (hospitalIndex !== -1) {
				// Create a new array to trigger reactivity
				hospitals = [
					...hospitals.slice(0, hospitalIndex),
					{ ...hospitals[hospitalIndex], population: 0 },
					...hospitals.slice(hospitalIndex + 1)
				];
			}
			newPopulationData[hospitalId] = 0;
			
			// Show success message briefly
			const successMsg = document.createElement('div');
			successMsg.className = 'alert alert-success fixed top-4 right-4 z-50 shadow-lg';
			successMsg.innerHTML = `
				<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>ลบข้อมูล ${hospitalName} สำเร็จ</span>
			`;
			document.body.appendChild(successMsg);
			setTimeout(() => {
				successMsg.remove();
			}, 3000);
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
		}
	}
</script>

<svelte:head>
	<title>จัดการข้อมูลประชากร - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการข้อมูลประชากร</h1>
		<p class="text-base-content/60 mt-1">จัดการจำนวนประชากรแต่ละหน่วยงานตามปี</p>
	</div>

	<!-- Success Message -->
	{#if form?.success}
		<div class="alert alert-success">
			<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Year Selector -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="flex items-center gap-4 flex-wrap">
				<label class="label">
					<span class="label-text font-semibold">เลือกปี:</span>
				</label>
				<select
					bind:value={selectedYear}
					onchange={handleYearChange}
					class="select select-bordered w-40"
				>
					{#each data.availableYears as year}
						<option value={year}>{year + 543} (พ.ศ.)</option>
					{/each}
				</select>
				<button class="btn btn-sm btn-outline btn-primary" onclick={openAddYearModal}>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					เพิ่มปีใหม่
				</button>
				<div class="text-sm text-base-content/60">
					กำลังแสดงข้อมูลประชากรปี {selectedYear + 543} (พ.ศ.)
				</div>
			</div>
		</div>
	</div>

	<!-- Search -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="form-control">
				<label class="label">
					<span class="label-text font-semibold">ค้นหาหน่วยงาน</span>
				</label>
				<div class="relative">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="พิมพ์ชื่อหน่วยงานหรือรหัส 9 หลัก..."
						class="input input-bordered w-full pr-10"
						autocomplete="off"
					/>
					<Icon name="search" size={20} class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40" />
				</div>
			</div>
		</div>
	</div>

	<!-- Instructions -->
	<div class="alert alert-info">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
		</svg>
		<div>
			<div class="font-bold">วิธีใช้งาน:</div>
			<div class="text-sm">
				1. เลือกปีที่ต้องการจัดการ<br/>
				2. ค้นหาหน่วยงานที่ต้องการ (ถ้าต้องการ)<br/>
				3. ดูข้อมูลประชากรปัจจุบันในคอลัมน์ "ข้อมูลปัจจุบัน"<br/>
				4. กรอกจำนวนประชากรใหม่ในคอลัมน์ "จำนวนประชากรใหม่"<br/>
				5. คลิก icon บันทึก (💾) เพื่อบันทึกข้อมูลแต่ละหน่วยงาน
			</div>
		</div>
	</div>

	<!-- Population Table -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="flex justify-between items-center mb-4">
				<h2 class="card-title">ข้อมูลประชากรแต่ละหน่วยงาน</h2>
				<div class="flex gap-4 text-sm">
					<div>
						<span class="font-semibold">รวมปัจจุบัน:</span>
						<span class="text-base-content/70 ml-2">
							{calculateTotal().toLocaleString('th-TH')} คน
						</span>
					</div>
					<div>
						<span class="font-semibold">รวมใหม่:</span>
						<span class="text-primary font-bold ml-2">
							{calculateNewTotal().toLocaleString('th-TH')} คน
						</span>
					</div>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th class="w-12">#</th>
							<th>ชื่อหน่วยงาน</th>
							<th>รหัส 9 หลัก</th>
							<th class="w-48">ข้อมูลปัจจุบัน (คน)</th>
							<th class="w-48">จำนวนประชากรใหม่ (คน)</th>
							<th class="w-40">จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredHospitals.length === 0}
							<tr>
								<td colspan="6" class="text-center text-base-content/60 py-8">
									{#if searchQuery}
										ไม่พบหน่วยงานที่ค้นหา
									{:else}
										ไม่พบข้อมูลหน่วยงาน
									{/if}
								</td>
							</tr>
						{:else}
							{#each filteredHospitals as hospital, index}
								<tr>
									<td>{index + 1}</td>
									<td class="font-semibold">{hospital.name}</td>
									<td class="font-mono text-sm">{hospital.code9 || '-'}</td>
									<td class="font-mono text-sm">
										{hospital.population > 0 ? hospital.population.toLocaleString('th-TH') : '-'}
									</td>
									<td>
										<input
											type="number"
											bind:value={newPopulationData[hospital.id]}
											class="input input-bordered w-full {newPopulationData[hospital.id] !== hospital.population ? 'input-warning' : ''}"
											placeholder="กรอกจำนวนประชากร"
											min="0"
											step="1"
										/>
									</td>
									<td>
										<div class="flex gap-1 items-center">
											<button
												type="button"
												class="btn btn-ghost btn-sm btn-square hover:btn-success transition-all"
												onclick={() => handleSaveSingle(hospital.id, hospital.name)}
												disabled={savingHospitalId === hospital.id || newPopulationData[hospital.id] === hospital.population}
												aria-label="บันทึก"
												title="บันทึกข้อมูลประชากร"
											>
												{#if savingHospitalId === hospital.id}
													<span class="loading loading-spinner loading-sm"></span>
												{:else}
													<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
													</svg>
												{/if}
											</button>
											{#if hospital.population > 0}
												<button
													type="button"
													class="btn btn-ghost btn-sm btn-square hover:btn-error transition-all"
													onclick={() => handleDelete(hospital.id, hospital.name)}
													aria-label="ลบ"
													title="ลบข้อมูลประชากร"
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
					<tfoot>
						<tr class="font-bold">
							<td colspan="3" class="text-right">รวมทั้งหมด:</td>
							<td class="text-base-content/70">
								{calculateTotal().toLocaleString('th-TH')} คน
							</td>
							<td class="text-primary">
								{calculateNewTotal().toLocaleString('th-TH')} คน
							</td>
							<td></td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	</div>

	<!-- Statistics -->
	<div class="stats shadow w-full">
		<div class="stat">
			<div class="stat-title">จำนวนหน่วยงาน</div>
			<div class="stat-value text-primary">{hospitals.length}</div>
			<div class="stat-desc">หน่วยงานทั้งหมด</div>
		</div>
		<div class="stat">
			<div class="stat-title">มีข้อมูลประชากร</div>
			<div class="stat-value text-success">
				{hospitals.filter(h => h.population > 0).length}
			</div>
			<div class="stat-desc">หน่วยงานที่มีข้อมูล</div>
		</div>
		<div class="stat">
			<div class="stat-title">ยังไม่มีข้อมูล</div>
			<div class="stat-value text-warning">
				{hospitals.filter(h => h.population === 0).length}
			</div>
			<div class="stat-desc">หน่วยงานที่ยังไม่มีข้อมูล</div>
		</div>
	</div>
</div>

<!-- Add Year Modal -->
{#if showAddYearModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4">เพิ่มปีใหม่</h3>
			
			<div class="space-y-4">
				<div class="alert alert-info">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<span>เลือกปีที่ต้องการเพิ่มข้อมูลประชากร (สามารถเลือกปีย้อนหลังหรือปีอนาคตได้)</span>
				</div>

				<div class="form-control">
					<label class="label" for="newYear">
						<span class="label-text">เลือกปี (ค.ศ.)</span>
					</label>
					<select
						id="newYear"
						bind:value={newYear}
						class="select select-bordered"
					>
						{#each Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - 10 + i) as year}
							<option value={year} disabled={data.availableYears.includes(year)}>
								{year} ({year + 543} พ.ศ.) {data.availableYears.includes(year) ? '(มีข้อมูลแล้ว)' : ''}
							</option>
						{/each}
					</select>
					<label class="label">
						<span class="label-text-alt">แสดงปีตั้งแต่ {new Date().getFullYear() - 10} ถึง {new Date().getFullYear() + 19}</span>
					</label>
				</div>

				<div class="bg-base-200 p-4 rounded-lg">
					<div class="text-sm">
						<div class="font-semibold mb-2">ปีที่เลือก:</div>
						<div class="text-2xl font-bold text-primary">
							{newYear} (พ.ศ. {newYear + 543})
						</div>
					</div>
				</div>
			</div>

			<div class="modal-action">
				<button type="button" class="btn" onclick={closeAddYearModal}>ยกเลิก</button>
				<button 
					type="button" 
					class="btn btn-primary" 
					onclick={handleAddYear}
					disabled={data.availableYears.includes(newYear)}
				>
					เพิ่มปีและจัดการข้อมูล
				</button>
			</div>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}

