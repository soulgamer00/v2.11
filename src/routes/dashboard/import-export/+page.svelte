<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import * as XLSX from 'xlsx';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('export');
	let importFile = $state<File | null>(null);
	let importResult = $state<any>(null);
	let isImporting = $state(false);
	
	// Export filters
	let exportStartDate = $state('');
	let exportEndDate = $state('');
	let requireDateRange = $state(true); // บังคับให้เลือกช่วงวันที่

	// Set default date range (last 30 days)
	$effect(() => {
		if (!exportStartDate && !exportEndDate) {
			const endDate = new Date();
			const startDate = new Date();
			startDate.setDate(endDate.getDate() - 30);
			exportEndDate = endDate.toISOString().split('T')[0];
			exportStartDate = startDate.toISOString().split('T')[0];
		}
	});

	async function exportCases(format: 'xlsx' | 'csv' = 'xlsx') {
		// Validate date range if required
		if (requireDateRange && (!exportStartDate || !exportEndDate)) {
			alert('กรุณาเลือกช่วงวันที่ที่ต้องการส่งออก');
			return;
		}

		if (exportStartDate && exportEndDate && new Date(exportStartDate) > new Date(exportEndDate)) {
			alert('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
			return;
		}

		// Check date range (max 365 days)
		if (exportStartDate && exportEndDate) {
			const start = new Date(exportStartDate);
			const end = new Date(exportEndDate);
			const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
			if (daysDiff > 365) {
				alert('ช่วงวันที่ต้องไม่เกิน 365 วัน กรุณาเลือกช่วงวันที่ที่สั้นลง');
				return;
			}
		}

		try {
			const params = new URLSearchParams();
			if (exportStartDate) params.append('startDate', exportStartDate);
			if (exportEndDate) params.append('endDate', exportEndDate);
			
			const url = format === 'csv' 
				? `/api/export/cases/csv?${params.toString()}`
				: `/api/export/cases?${params.toString()}`;
			
			const response = await fetch(url);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'เกิดข้อผิดพลาดในการส่งออก' }));
				throw new Error(errorData.error || 'เกิดข้อผิดพลาดในการส่งออก');
			}

			const blob = await response.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = downloadUrl;
			// Extract filename from Content-Disposition header or use default
			const contentDisposition = response.headers.get('Content-Disposition');
			const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
			const filename = filenameMatch ? filenameMatch[1] : `cases_${new Date().toISOString().split('T')[0]}.${format}`;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(downloadUrl);
		} catch (error: any) {
			alert(error.message || 'เกิดข้อผิดพลาดในการส่งออก');
		}
	}

	async function exportPatients() {
		try {
			const response = await fetch('/api/export/patients');
			if (!response.ok) {
				throw new Error('เกิดข้อผิดพลาดในการส่งออก');
			}

			const blob = await response.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = downloadUrl;
			// Extract filename from Content-Disposition header or use default
			const contentDisposition = response.headers.get('Content-Disposition');
			const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
			const filename = filenameMatch ? filenameMatch[1] : `patients_${new Date().toISOString().split('T')[0]}.xlsx`;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(downloadUrl);
		} catch (error: any) {
			alert(error.message || 'เกิดข้อผิดพลาดในการส่งออก');
		}
	}

	async function downloadTemplate() {
		try {
			const response = await fetch('/api/export/template');
			if (!response.ok) {
				throw new Error('เกิดข้อผิดพลาดในการดาวน์โหลด template');
			}

			const blob = await response.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = downloadUrl;
			a.download = 'template_import_cases.xlsx';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(downloadUrl);
		} catch (error: any) {
			alert(error.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด template');
		}
	}

	async function handleImport() {
		if (!importFile) {
			alert('กรุณาเลือกไฟล์');
			return;
		}

		// Check file size and row count before importing
		try {
			const arrayBuffer = await importFile.arrayBuffer();
			const workbook = XLSX.read(arrayBuffer, { type: 'array' });
			const sheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[sheetName];
			const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
			
			const MAX_ROWS = 100;
			if (data.length > MAX_ROWS) {
				alert(`ไฟล์มีข้อมูลเกิน ${MAX_ROWS} แถว (พบ ${data.length} แถว)\nกรุณาแบ่งไฟล์ออกเป็นหลายไฟล์หรือลดจำนวนแถวลง`);
				return;
			}
		} catch (error) {
			// If we can't read the file, let the server handle it
			console.warn('Could not pre-validate file:', error);
		}

		isImporting = true;
		importResult = null;

		try {
			const formData = new FormData();
			formData.append('file', importFile);

			const response = await fetch('/api/import/cases', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				importResult = {
					success: true,
					message: `นำเข้าสำเร็จ ${result.successCount || result.processed} แถว`,
					errors: result.errors || []
				};
				importFile = null;
				// Refresh cases page
				setTimeout(() => {
					goto('/dashboard/cases', { invalidateAll: true });
				}, 2000);
			} else {
				importResult = {
					success: false,
					message: result.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล',
					errors: []
				};
			}
		} catch (error: any) {
			importResult = {
				success: false,
				message: error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล',
				errors: []
			};
		} finally {
			isImporting = false;
		}
	}

</script>

<svelte:head>
	<title>นำเข้า/ส่งออกข้อมูล - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold">นำเข้า/ส่งออกข้อมูล</h1>
		<p class="text-base-content/60 mt-1">ส่งออกและนำเข้าข้อมูลในรูปแบบ Excel</p>
	</div>

	<!-- Tabs -->
	<div class="tabs tabs-boxed">
		<button
			class="tab"
			class:tab-active={activeTab === 'export'}
			onclick={() => (activeTab = 'export')}
		>
			ส่งออกข้อมูล
		</button>
		<button
			class="tab"
			class:tab-active={activeTab === 'import'}
			onclick={() => (activeTab = 'import')}
		>
			นำเข้าข้อมูล
		</button>
	</div>

	<!-- Export Tab -->
	{#if activeTab === 'export'}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">ส่งออกข้อมูล</h2>
				<p class="text-base-content/60 mb-6">
					เลือกประเภทข้อมูลที่ต้องการส่งออกเป็นไฟล์ Excel
				</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Export Cases -->
					<div class="card bg-base-200 shadow">
						<div class="card-body">
							<h3 class="card-title">รายงานเคส</h3>
							<p class="text-sm text-base-content/60 mb-4">
								ส่งออกรายงานเคสตามช่วงวันที่ที่เลือก
							</p>
							
							<!-- Date Range Filter -->
							<div class="space-y-3 mb-4">
								<div class="form-control">
									<label class="label py-1">
										<span class="label-text text-sm">วันที่เริ่มต้น <span class="text-error">*</span></span>
									</label>
									<input
										type="date"
										bind:value={exportStartDate}
										class="input input-bordered input-sm"
										required
									/>
								</div>
								<div class="form-control">
									<label class="label py-1">
										<span class="label-text text-sm">วันที่สิ้นสุด <span class="text-error">*</span></span>
									</label>
									<input
										type="date"
										bind:value={exportEndDate}
										class="input input-bordered input-sm"
										required
									/>
								</div>
								<div class="alert alert-warning text-xs py-2">
									<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
									<span>กรุณาเลือกช่วงวันที่เพื่อ Eport ข้อมูล</span>
								</div>
							</div>
							
							<div class="card-actions justify-end mt-4 gap-2">
								<button class="btn btn-primary btn-sm" onclick={() => exportCases('xlsx')}>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									ส่งออก Excel
								</button>
								<button class="btn btn-outline btn-sm" onclick={() => exportCases('csv')}>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									ส่งออก CSV
								</button>
							</div>
						</div>
					</div>

					<!-- Export Patients -->
					<div class="card bg-base-200 shadow">
						<div class="card-body">
							<h3 class="card-title">ทะเบียนผู้ป่วย</h3>
							<p class="text-sm text-base-content/60">
								ส่งออกข้อมูลผู้ป่วยทั้งหมดพร้อมที่อยู่และจำนวนรายงาน
							</p>
							<div class="card-actions justify-end mt-4">
								<button class="btn btn-primary" onclick={exportPatients}>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									ส่งออก Excel
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Import Tab -->
	{#if activeTab === 'import'}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">นำเข้าข้อมูล</h2>
				<p class="text-base-content/60 mb-6">
					นำเข้าข้อมูลรายงานเคสจากไฟล์ Excel
				</p>

				<!-- Import Form -->
				<div class="space-y-4">
					<div class="form-control">
						<label class="label">
							<span class="label-text">เลือกไฟล์ Excel</span>
						</label>
						<input
							type="file"
							accept=".xlsx,.xls"
							class="file-input file-input-bordered w-full"
							onchange={(e) => {
								const files = (e.target as HTMLInputElement).files;
								if (files && files.length > 0) {
									importFile = files[0];
								}
							}}
						/>
						<label class="label">
							<span class="label-text-alt">รองรับไฟล์ .xlsx และ .xls</span>
						</label>
					</div>

					<div class="alert alert-info">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						<span>
							<strong>คำแนะนำ:</strong> ใช้ไฟล์ Excel ที่มีรูปแบบเดียวกับไฟล์ที่ส่งออก
							<br />
							คอลัมน์ที่จำเป็น: ชื่อ, นามสกุล, รหัสโรค, รหัสหน่วยงาน, วันที่เริ่มป่วย
							<br />
							<strong class="text-warning">⚠️ จำกัดการนำเข้าครั้งละไม่เกิน 100 แถว</strong>
						</span>
					</div>

					<div class="flex gap-2">
						<button
							class="btn btn-outline"
							onclick={downloadTemplate}
						>
							ดาวน์โหลด Template
						</button>
						<button
							class="btn btn-primary"
							onclick={handleImport}
							disabled={!importFile || isImporting}
						>
							{#if isImporting}
								<span class="loading loading-spinner"></span>
								กำลังนำเข้า...
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
								</svg>
								นำเข้าข้อมูล
							{/if}
						</button>
					</div>

					<!-- Import Result -->
					{#if importResult}
						<div class="alert" class:alert-success={importResult.success} class:alert-error={!importResult.success}>
							<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<h3 class="font-bold">{importResult.success ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'}</h3>
								<div class="text-xs">{importResult.message}</div>
								{#if importResult.errors && importResult.errors.length > 0}
									<div class="mt-2">
										<details class="collapse collapse-arrow bg-base-200">
											<input type="checkbox" />
											<div class="collapse-title text-xs font-medium">
												ดูรายละเอียดข้อผิดพลาด ({importResult.errors.length} รายการ)
											</div>
											<div class="collapse-content">
												<ul class="list-disc list-inside text-xs space-y-1">
													{#each importResult.errors as error}
														<li>{error}</li>
													{/each}
												</ul>
											</div>
										</details>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

