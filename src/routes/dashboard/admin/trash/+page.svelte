<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state(data.category || 'all');

	const tabs = [
		{ 
			id: 'all', 
			label: 'ทั้งหมด', 
			count: data.deletedPatients.length + data.deletedCases.length + data.deletedDiseases.length + data.deletedHospitals.length + data.deletedMasterData.length 
		},
		{ id: 'patients', label: 'ผู้ป่วย', count: data.deletedPatients.length },
		{ id: 'cases', label: 'รายงานเคส', count: data.deletedCases.length },
		{ id: 'diseases', label: 'โรค', count: data.deletedDiseases.length },
		{ id: 'hospitals', label: 'หน่วยงาน', count: data.deletedHospitals.length },
		{ id: 'masterdata', label: 'ข้อมูลอ้างอิง', count: data.deletedMasterData.length }
	];

	function switchTab(tabId: string) {
		activeTab = tabId;
		const params = new URLSearchParams();
		if (tabId !== 'all') {
			params.set('category', tabId);
		}
		goto(`/dashboard/admin/trash?${params.toString()}`);
	}

	async function restorePatient(id: string) {
		if (!confirm('คุณต้องการกู้คืนข้อมูลผู้ป่วยนี้หรือไม่?')) return;

		const formData = new FormData();
		formData.append('id', id);

		const response = await fetch('?/restorePatient', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	async function restoreCase(id: string) {
		if (!confirm('คุณต้องการกู้คืนรายงานเคสนี้หรือไม่?')) return;

		const formData = new FormData();
		formData.append('id', id);

		const response = await fetch('?/restoreCase', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	async function restoreDisease(id: number) {
		if (!confirm('คุณต้องการกู้คืนโรคนี้หรือไม่?')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/restoreDisease', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	async function hardDeletePatient(id: string) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบถาวรข้อมูลผู้ป่วยนี้? การกระทำนี้ไม่สามารถยกเลิกได้!')) return;

		const formData = new FormData();
		formData.append('id', id);

		const response = await fetch('?/hardDeletePatient', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	async function hardDeleteCase(id: string) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบถาวรรายงานเคสนี้? การกระทำนี้ไม่สามารถยกเลิกได้!')) return;

		const formData = new FormData();
		formData.append('id', id);

		const response = await fetch('?/hardDeleteCase', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	async function hardDeleteDisease(id: number) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบถาวรโรคนี้? การกระทำนี้ไม่สามารถยกเลิกได้!')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/hardDeleteDisease', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	async function restoreHospital(id: number) {
		if (!confirm('คุณต้องการกู้คืนหน่วยงานนี้หรือไม่?')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/restoreHospital', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	async function restoreMasterData(id: number) {
		if (!confirm('คุณต้องการกู้คืนข้อมูลอ้างอิงนี้หรือไม่?')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/restoreMasterData', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	async function hardDeleteHospital(id: number) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบถาวรหน่วยงานนี้? การกระทำนี้ไม่สามารถยกเลิกได้!')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/hardDeleteHospital', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	async function hardDeleteMasterData(id: number) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบถาวรข้อมูลอ้างอิงนี้? การกระทำนี้ไม่สามารถยกเลิกได้!')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/hardDeleteMasterData', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/admin/trash', { invalidateAll: true });
		} else {
			const result = await response.json();
			alert(result.message || 'เกิดข้อผิดพลาด');
		}
	}

	function formatDate(date: Date | null) {
		if (!date) return '-';
		return new Date(date).toLocaleDateString('th-TH', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>จัดการข้อมูลที่ถูกลบ - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการข้อมูลที่ถูกลบ</h1>
			<p class="text-base-content/60 mt-1">กู้คืนหรือลบถาวรข้อมูลที่ถูก Soft Delete</p>
		</div>
	</div>

	<!-- Tabs -->
	<div class="tabs tabs-boxed">
		{#each tabs as tab}
			<button
				class="tab"
				class:tab-active={activeTab === tab.id}
				onclick={() => switchTab(tab.id)}
			>
				{tab.label}
				{#if tab.count > 0}
					<span class="badge badge-sm badge-error ml-2">{tab.count}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Patients Tab -->
	{#if activeTab === 'all' || activeTab === 'patients'}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-lg">ผู้ป่วยที่ถูกลบ</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>ชื่อ-นามสกุล</th>
								<th>เลขบัตรประชาชน</th>
								<th>จำนวนเคส</th>
								<th>วันที่ลบ</th>
								<th>จัดการ</th>
							</tr>
						</thead>
						<tbody>
							{#if data.deletedPatients.length === 0}
								<tr>
									<td colspan="5" class="text-center text-base-content/60 py-8">
										ไม่พบข้อมูล
									</td>
								</tr>
							{:else}
								{#each data.deletedPatients as patient}
									<tr>
										<td>
											{patient.prefix || ''} {patient.firstName} {patient.lastName}
										</td>
										<td class="font-mono">{patient.idCard || '-'}</td>
										<td>
											<span class="badge badge-info">{patient._count.cases} เคส</span>
										</td>
										<td class="text-sm">{formatDate(patient.deletedAt)}</td>
										<td>
											<div class="flex gap-2">
												<button
													class="btn btn-sm btn-success"
													onclick={() => restorePatient(patient.id)}
													aria-label="กู้คืน"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
													</svg>
													กู้คืน
												</button>
												<button
													class="btn btn-sm btn-error"
													onclick={() => {
														if (patient._count.cases > 0) {
															alert(`ไม่สามารถลบถาวรได้ เนื่องจากมีเคสที่เกี่ยวข้องอยู่ ${patient._count.cases} เคส\nกรุณาลบเคสที่เกี่ยวข้องก่อน`);
															return;
														}
														if (confirm(`คุณแน่ใจหรือไม่ที่จะลบถาวรผู้ป่วยนี้?\n\nการลบนี้ไม่สามารถกู้คืนได้!`)) {
															hardDeletePatient(patient.id);
														}
													}}
													aria-label="ลบถาวร"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
													ลบถาวร
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
	{/if}

	<!-- Cases Tab -->
	{#if activeTab === 'all' || activeTab === 'cases'}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-lg">รายงานเคสที่ถูกลบ</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>ผู้ป่วย</th>
								<th>โรค</th>
								<th>หน่วยงาน</th>
								<th>วันที่ป่วย</th>
								<th>วันที่ลบ</th>
								<th>จัดการ</th>
							</tr>
						</thead>
						<tbody>
							{#if data.deletedCases.length === 0}
								<tr>
									<td colspan="6" class="text-center text-base-content/60 py-8">
										ไม่พบข้อมูล
									</td>
								</tr>
							{:else}
								{#each data.deletedCases as caseReport}
									<tr>
										<td>
											{caseReport.patient.firstName} {caseReport.patient.lastName}
											<div class="text-xs text-base-content/60">{caseReport.patient.idCard || '-'}</div>
										</td>
										<td>
											{caseReport.disease.nameTh}
											<div class="text-xs text-base-content/60">{caseReport.disease.code}</div>
										</td>
										<td>{caseReport.hospital.name}</td>
										<td class="text-sm">
											{caseReport.illnessDate ? new Date(caseReport.illnessDate).toLocaleDateString('th-TH') : '-'}
										</td>
										<td class="text-sm">{formatDate(caseReport.deletedAt)}</td>
										<td>
											<div class="flex gap-2">
												<button
													class="btn btn-sm btn-success"
													onclick={() => restoreCase(caseReport.id)}
													aria-label="กู้คืน"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
													</svg>
													กู้คืน
												</button>
												<button
													class="btn btn-sm btn-error"
													onclick={() => hardDeleteCase(caseReport.id)}
													aria-label="ลบถาวร"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
													ลบถาวร
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
	{/if}

	<!-- Diseases Tab -->
	{#if activeTab === 'all' || activeTab === 'diseases'}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-lg">โรคที่ถูกลบ</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>รหัส</th>
								<th>ชื่อโรค (ไทย)</th>
								<th>ชื่อโรค (อังกฤษ)</th>
								<th>จำนวนเคส</th>
								<th>วันที่ลบ</th>
								<th>จัดการ</th>
							</tr>
						</thead>
						<tbody>
							{#if data.deletedDiseases.length === 0}
								<tr>
									<td colspan="6" class="text-center text-base-content/60 py-8">
										ไม่พบข้อมูล
									</td>
								</tr>
							{:else}
								{#each data.deletedDiseases as disease}
									<tr>
										<td class="font-mono">{disease.code}</td>
										<td class="font-semibold">{disease.nameTh}</td>
										<td>{disease.nameEn || '-'}</td>
										<td>
											{#if disease._count.cases > 0}
												<span class="badge badge-info">{disease._count.cases} เคส</span>
											{:else}
												<span class="badge badge-ghost">ไม่มีการใช้งาน</span>
											{/if}
										</td>
										<td class="text-sm">{formatDate(disease.deletedAt)}</td>
										<td>
											<div class="flex gap-2">
												<button
													class="btn btn-sm btn-success"
													onclick={() => restoreDisease(disease.id)}
													aria-label="กู้คืน"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
													</svg>
													กู้คืน
												</button>
												<button
													class="btn btn-sm btn-error"
													onclick={() => {
														if (disease._count.cases > 0) {
															alert(`ไม่สามารถลบถาวรได้ เนื่องจากมีเคสที่เกี่ยวข้องอยู่ ${disease._count.cases} เคส\nกรุณาลบเคสที่เกี่ยวข้องก่อน`);
															return;
														}
														if (confirm(`คุณแน่ใจหรือไม่ที่จะลบถาวรโรคนี้?\n\nการลบนี้ไม่สามารถกู้คืนได้!`)) {
															hardDeleteDisease(disease.id);
														}
													}}
													aria-label="ลบถาวร"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
													ลบถาวร
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
	{/if}

	<!-- Hospitals Tab -->
	{#if activeTab === 'all' || activeTab === 'hospitals'}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-lg">หน่วยงานที่ถูกลบ</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>ชื่อหน่วยงาน</th>
								<th>รหัส</th>
								<th>จำนวนผู้ใช้</th>
								<th>จำนวนเคส</th>
								<th>วันที่ลบ</th>
								<th>จัดการ</th>
							</tr>
						</thead>
						<tbody>
							{#if data.deletedHospitals.length === 0}
								<tr>
									<td colspan="6" class="text-center text-base-content/60 py-8">
										ไม่พบข้อมูล
									</td>
								</tr>
							{:else}
								{#each data.deletedHospitals as hospital}
									<tr>
										<td class="font-semibold">{hospital.name}</td>
										<td class="font-mono">{hospital.code9New || hospital.code9 || '-'}</td>
										<td>
											<span class="badge badge-info">{hospital._count.users} คน</span>
										</td>
										<td>
											<span class="badge badge-info">{hospital._count.cases} เคส</span>
										</td>
										<td class="text-sm">{formatDate(hospital.deletedAt)}</td>
										<td>
											<div class="flex gap-2">
												<button
													class="btn btn-sm btn-success"
													onclick={() => restoreHospital(hospital.id)}
													aria-label="กู้คืน"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
													</svg>
													กู้คืน
												</button>
												<button
													class="btn btn-sm btn-error"
													onclick={() => {
														const totalUsage = hospital._count.users + hospital._count.cases;
														if (totalUsage > 0) {
															alert(`ไม่สามารถลบถาวรได้ เนื่องจากมีข้อมูลที่เกี่ยวข้องอยู่:\n- ผู้ใช้: ${hospital._count.users} คน\n- เคส: ${hospital._count.cases} เคส\n\nกรุณาลบข้อมูลที่เกี่ยวข้องก่อน`);
															return;
														}
														if (confirm(`คุณแน่ใจหรือไม่ที่จะลบถาวรหน่วยงานนี้?\n\nการลบนี้ไม่สามารถกู้คืนได้!`)) {
															hardDeleteHospital(hospital.id);
														}
													}}
													aria-label="ลบถาวร"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
													ลบถาวร
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
	{/if}

	<!-- MasterData Tab -->
	{#if activeTab === 'all' || activeTab === 'masterdata'}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-lg">ข้อมูลอ้างอิงที่ถูกลบ</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>หมวดหมู่</th>
								<th>ค่า</th>
								<th>วันที่ลบ</th>
								<th>จัดการ</th>
							</tr>
						</thead>
						<tbody>
							{#if data.deletedMasterData.length === 0}
								<tr>
									<td colspan="4" class="text-center text-base-content/60 py-8">
										ไม่พบข้อมูล
									</td>
								</tr>
							{:else}
								{#each data.deletedMasterData as item}
									<tr>
										<td>
											<span class="badge badge-primary">
												{item.category === 'PREFIX' ? 'คำนำหน้า' : 
												 item.category === 'OCCUPATION' ? 'อาชีพ' :
												 item.category === 'NATIONALITY' ? 'สัญชาติ' :
												 item.category === 'MARITAL_STATUS' ? 'สถานภาพ' : item.category}
											</span>
										</td>
										<td class="font-semibold">{item.value}</td>
										<td class="text-sm">{formatDate(item.deletedAt)}</td>
										<td>
											<div class="flex gap-2">
												<button
													class="btn btn-sm btn-success"
													onclick={() => restoreMasterData(item.id)}
													aria-label="กู้คืน"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
													</svg>
													กู้คืน
												</button>
												<button
													class="btn btn-sm btn-error"
													onclick={() => hardDeleteMasterData(item.id)}
													aria-label="ลบถาวร"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
													ลบถาวร
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
	{/if}
</div>

