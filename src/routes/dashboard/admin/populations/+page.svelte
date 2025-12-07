<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedYear = $state(data.selectedYear);
	let saving = $state(false);
	let showAddYearModal = $state(false);
	let newYear = $state(new Date().getFullYear());
	let populationData = $state(
		data.hospitals.reduce((acc, h) => {
			acc[h.id] = h.population;
			return acc;
		}, {} as Record<number, number>)
	);

	// Update populationData when data changes (after year change)
	$effect(() => {
		// Sync populationData with loaded data
		const newData: Record<number, number> = {};
		data.hospitals.forEach(h => {
			newData[h.id] = h.population;
		});
		populationData = newData;
		selectedYear = data.selectedYear;
	});

	function handleYearChange() {
		const params = new URLSearchParams();
		params.set('year', selectedYear.toString());
		goto(`/dashboard/admin/populations?${params.toString()}`);
	}

	function calculateTotal() {
		return Object.values(populationData).reduce((sum, val) => sum + (val || 0), 0);
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

	<!-- Instructions -->
	<div class="alert alert-info">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
		</svg>
		<div>
			<div class="font-bold">วิธีใช้งาน:</div>
			<div class="text-sm">
				1. เลือกปีที่ต้องการจัดการ<br/>
				2. กรอกจำนวนประชากรของแต่ละหน่วยงาน<br/>
				3. คลิก "บันทึกข้อมูล" เพื่อบันทึก (ระบบจะอัพเดทหรือสร้างข้อมูลใหม่อัตโนมัติ)
			</div>
		</div>
	</div>

	<!-- Population Form -->
	<form method="POST" action="?/updatePopulations" use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}}>
		<input type="hidden" name="year" value={selectedYear} />

		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<div class="flex justify-between items-center mb-4">
					<h2 class="card-title">ข้อมูลประชากรแต่ละหน่วยงาน</h2>
					<div class="text-lg">
						<span class="font-semibold">รวมทั้งหมด:</span>
						<span class="text-primary font-bold ml-2">
							{calculateTotal().toLocaleString('th-TH')} คน
						</span>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th class="w-12">#</th>
								<th>ชื่อหน่วยงาน</th>
								<th>รหัส 9 หลัก</th>
								<th class="w-64">จำนวนประชากร (คน)</th>
							</tr>
						</thead>
						<tbody>
							{#if data.hospitals.length === 0}
								<tr>
									<td colspan="4" class="text-center text-base-content/60 py-8">
										ไม่พบข้อมูลหน่วยงาน
									</td>
								</tr>
							{:else}
								{#each data.hospitals as hospital, index}
									<tr>
										<td>{index + 1}</td>
										<td class="font-semibold">{hospital.name}</td>
										<td class="font-mono text-sm">{hospital.code9 || '-'}</td>
										<td>
											<input
												type="number"
												name="amount_{hospital.id}"
												bind:value={populationData[hospital.id]}
												class="input input-bordered w-full"
												placeholder="กรอกจำนวนประชากร"
												min="0"
												step="1"
											/>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
						<tfoot>
							<tr class="font-bold">
								<td colspan="3" class="text-right">รวมทั้งหมด:</td>
								<td class="text-primary text-lg">
									{calculateTotal().toLocaleString('th-TH')} คน
								</td>
							</tr>
						</tfoot>
					</table>
				</div>

				<div class="card-actions justify-end mt-6">
					<button type="submit" class="btn btn-primary btn-lg" disabled={saving}>
						{#if saving}
							<span class="loading loading-spinner"></span>
						{/if}
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
						</svg>
						บันทึกข้อมูลประชากรปี {selectedYear + 543}
					</button>
				</div>
			</div>
		</div>
	</form>

	<!-- Statistics -->
	<div class="stats shadow w-full">
		<div class="stat">
			<div class="stat-title">จำนวนหน่วยงาน</div>
			<div class="stat-value text-primary">{data.hospitals.length}</div>
			<div class="stat-desc">หน่วยงานทั้งหมด</div>
		</div>
		<div class="stat">
			<div class="stat-title">มีข้อมูลประชากร</div>
			<div class="stat-value text-success">
				{data.hospitals.filter(h => h.population > 0).length}
			</div>
			<div class="stat-desc">หน่วยงานที่มีข้อมูล</div>
		</div>
		<div class="stat">
			<div class="stat-title">ยังไม่มีข้อมูล</div>
			<div class="stat-value text-warning">
				{data.hospitals.filter(h => h.population === 0).length}
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

