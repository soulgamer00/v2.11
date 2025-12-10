<script lang="ts">
	import type { PageData } from './$types';
	import { formatDateThai } from '$lib/utils/date';

	let { data }: { data: PageData } = $props();

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		return formatDateThai(date);
	}

	function getConditionText(condition: string | null | undefined) {
		if (!condition) return '-';
		const map: Record<string, string> = {
			RECOVERED: 'หายแล้ว',
			DIED: 'เสียชีวิต',
			UNDER_TREATMENT: 'อยู่ระหว่างการรักษา'
		};
		return map[condition] || condition;
	}

	function getPatientTypeText(type: string | null | undefined) {
		if (!type) return '-';
		const map: Record<string, string> = {
			IPD: 'ผู้ป่วยใน',
			OPD: 'ผู้ป่วยนอก',
			ACF: 'ACF'
		};
		return map[type] || type;
	}
</script>

<svelte:head>
	<title>รายละเอียดผู้ป่วย - {data.patient.firstName} {data.patient.lastName}</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold">รายละเอียดผู้ป่วย</h1>
			<p class="text-base-content/60 mt-1">
				{data.patient.prefix || ''} {data.patient.firstName} {data.patient.lastName}
			</p>
		</div>
		<a href="/dashboard/patients" class="btn btn-ghost">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
			</svg>
			กลับ
		</a>
	</div>

	<!-- Patient Info Card -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-xl mb-4">ข้อมูลส่วนตัว</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="label">
						<span class="label-text font-semibold">เลขบัตรประชาชน</span>
					</label>
					<div class="text-lg font-mono">{data.patient.idCard || '-'}</div>
				</div>
				<div>
					<label class="label">
						<span class="label-text font-semibold">เพศ</span>
					</label>
					<div class="text-lg">{data.patient.gender === 'MALE' ? 'ชาย' : 'หญิง'}</div>
				</div>
				<div>
					<label class="label">
						<span class="label-text font-semibold">วันเกิด</span>
					</label>
					<div class="text-lg">{formatDate(data.patient.birthDate)}</div>
				</div>
				<div>
					<label class="label">
						<span class="label-text font-semibold">สัญชาติ</span>
					</label>
					<div class="text-lg">{data.patient.nationality || '-'}</div>
				</div>
				<div>
					<label class="label">
						<span class="label-text font-semibold">สถานภาพ</span>
					</label>
					<div class="text-lg">{data.patient.maritalStatus || '-'}</div>
				</div>
				<div>
					<label class="label">
						<span class="label-text font-semibold">อาชีพ</span>
					</label>
					<div class="text-lg">{data.patient.occupation || '-'}</div>
				</div>
				<div>
					<label class="label">
						<span class="label-text font-semibold">เบอร์โทรศัพท์</span>
					</label>
					<div class="text-lg">{data.patient.phone || '-'}</div>
				</div>
			</div>

			<!-- Address -->
			<div class="divider"></div>
			<h3 class="font-semibold mb-2">ที่อยู่ตามทะเบียนบ้าน</h3>
			<div class="text-base-content/80">
				{data.patient.addressNo || ''} {data.patient.moo ? `หมู่ ${data.patient.moo}` : ''} {data.patient.road || ''}
				{#if data.patient.tambon}
					<br />ตำบล {data.patient.tambon.nameTh}
				{/if}
				{#if data.patient.amphoe}
					อำเภอ {data.patient.amphoe.nameTh}
				{/if}
				{#if data.patient.province}
					จังหวัด {data.patient.province.nameTh}
				{/if}
				{#if data.patient.postalCode}
					<br />รหัสไปรษณีย์ {data.patient.postalCode}
				{/if}
			</div>
		</div>
	</div>

	<!-- Cases History -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-xl mb-4">
				ประวัติการรายงาน ({data.patient.cases.length} รายการ)
			</h2>
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>วันที่ป่วย</th>
							<th>โรค</th>
							<th>หน่วยงาน</th>
							<th>ประเภท</th>
							<th>สถานะ</th>
							<th>ที่อยู่ขณะป่วย</th>
							<th>จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if data.patient.cases.length === 0}
							<tr>
								<td colspan="7" class="text-center text-base-content/60 py-8">
									ไม่พบรายงานเคส
								</td>
							</tr>
						{:else}
							{#each data.patient.cases as caseReport}
								<tr>
									<td>{formatDate(caseReport.illnessDate)}</td>
									<td>
										<div class="font-semibold">{caseReport.disease.nameTh}</div>
										<div class="text-xs text-base-content/60">{caseReport.disease.code}</div>
									</td>
									<td>{caseReport.hospital.name}</td>
									<td>{getPatientTypeText(caseReport.patientType)}</td>
									<td>
										{#if caseReport.condition === 'DIED'}
											<span class="badge badge-error">เสียชีวิต</span>
										{:else if caseReport.condition === 'RECOVERED'}
											<span class="badge badge-success">หายแล้ว</span>
										{:else}
											<span class="badge badge-warning">อยู่ระหว่างการรักษา</span>
										{/if}
									</td>
									<td class="text-sm">
										{#if caseReport.sickTambon}
											{caseReport.sickAddressNo || ''} {caseReport.sickMoo ? `หมู่ ${caseReport.sickMoo}` : ''}
											<br />{caseReport.sickTambon.nameTh}
											{#if caseReport.sickAmphoe}
												{caseReport.sickAmphoe.nameTh}
											{/if}
											{#if caseReport.sickProvince}
												{caseReport.sickProvince.nameTh}
											{/if}
										{:else}
											-
										{/if}
									</td>
									<td>
										<a href="/dashboard/cases/{caseReport.id}/edit" class="btn btn-ghost btn-sm">
											ดูรายละเอียด
										</a>
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









