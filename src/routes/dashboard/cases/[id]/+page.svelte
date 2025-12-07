<script lang="ts">
	import type { PageData } from './$types';
	import { formatDateThai } from '$lib/utils/date';
	import Icon from '$lib/components/icons/Icon.svelte';

	let { data }: { data: PageData } = $props();

	const caseReport = data.caseReport;

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

	function getConditionBadge(condition: string | null | undefined) {
		if (!condition) return 'badge-ghost';
		const map: Record<string, string> = {
			RECOVERED: 'badge-success',
			DIED: 'badge-error',
			UNDER_TREATMENT: 'badge-warning'
		};
		return map[condition] || 'badge-ghost';
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
	<title>รายละเอียดรายงานเคส - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">รายละเอียดรายงานเคส</h1>
			<p class="text-xs sm:text-sm text-base-content/60 mt-1 break-all">ข้อมูลรายงานเคส ID: {caseReport.id}</p>
		</div>
		<div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
			<a href="/dashboard/cases" class="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto flex items-center justify-center gap-2">
				<Icon name="arrowLeft" size={18} class="flex-shrink-0" />
				<span class="whitespace-nowrap">กลับ</span>
			</a>
			{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
				<a href="/dashboard/cases/{caseReport.id}/edit" class="btn btn-warning btn-sm sm:btn-md w-full sm:w-auto flex items-center justify-center gap-2">
					<Icon name="edit" size={18} class="flex-shrink-0" />
					<span class="whitespace-nowrap">แก้ไข</span>
				</a>
			{/if}
		</div>
	</div>

	<!-- Patient Information -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-lg sm:text-xl mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
				<Icon name="user" size={20} class="flex-shrink-0 text-primary" />
				<span class="whitespace-nowrap">ข้อมูลผู้ป่วย</span>
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">เลขบัตรประชาชน</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.idCard || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">คำนำหน้า</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.prefix || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">ชื่อ-นามสกุล</span>
					</label>
					<div class="text-base-content/80 font-semibold">
						{caseReport.patient.firstName} {caseReport.patient.lastName}
					</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">เพศ</span>
					</label>
					<div class="text-base-content/80">
						{caseReport.patient.gender === 'MALE' ? 'ชาย' : 'หญิง'}
					</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">วันเกิด</span>
					</label>
					<div class="text-base-content/80">{formatDate(caseReport.patient.birthDate)}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">อายุ</span>
					</label>
					<div class="text-base-content/80">{caseReport.ageYears} ปี</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">สัญชาติ</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.nationality || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">อาชีพ</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.occupation || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">สถานภาพ</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.maritalStatus || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">เบอร์โทรศัพท์</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.phone || '-'}</div>
				</div>
			</div>

			<!-- Patient Address -->
			<div class="divider"></div>
			<h3 class="font-semibold mb-2">ที่อยู่ผู้ป่วย</h3>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">บ้านเลขที่</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.addressNo || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">หมู่ที่</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.moo || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">ถนน</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.road || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">ตำบล/แขวง</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.tambon?.nameTh || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">อำเภอ/เขต</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.amphoe?.nameTh || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">จังหวัด</span>
					</label>
					<div class="text-base-content/80">{caseReport.patient.province?.nameTh || '-'}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Case Information -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-lg sm:text-xl mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
				<Icon name="cases" size={20} class="flex-shrink-0 text-primary" />
				<span class="whitespace-nowrap">ข้อมูลการเจ็บป่วย</span>
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">โรค</span>
					</label>
					<div class="text-base-content/80">
						<div class="font-semibold">{caseReport.disease.nameTh}</div>
						<div class="text-sm text-base-content/60">
							{caseReport.disease.code} {caseReport.disease.nameEn ? `(${caseReport.disease.nameEn})` : ''}
						</div>
					</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">หน่วยงาน</span>
					</label>
					<div class="text-base-content/80">
						<div class="font-semibold">{caseReport.hospital.name}</div>
						<div class="text-sm text-base-content/60">
							{caseReport.hospital.code9New || caseReport.hospital.code9 || ''}
						</div>
					</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">วันที่เริ่มป่วย</span>
					</label>
					<div class="text-base-content/80">{formatDate(caseReport.illnessDate)}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">วันที่รับการรักษา</span>
					</label>
					<div class="text-base-content/80">{formatDate(caseReport.treatDate)}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">วันที่วินิจฉัย</span>
					</label>
					<div class="text-base-content/80">{formatDate(caseReport.diagnosisDate)}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">ประเภทผู้ป่วย</span>
					</label>
					<div class="text-base-content/80">{getPatientTypeText(caseReport.patientType)}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">สถานะ</span>
					</label>
					<div>
						<span class="badge {getConditionBadge(caseReport.condition)}">
							{getConditionText(caseReport.condition)}
						</span>
					</div>
				</div>
				{#if caseReport.condition === 'DIED'}
					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold">วันที่เสียชีวิต</span>
						</label>
						<div class="text-base-content/80">{formatDate(caseReport.deathDate)}</div>
					</div>
					<div class="form-control">
						<label class="label">
							<span class="label-text font-semibold">สาเหตุการเสียชีวิต</span>
						</label>
						<div class="text-base-content/80">{caseReport.causeOfDeath || '-'}</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Sick Address -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body p-3 sm:p-4 md:p-6">
			<h2 class="card-title text-lg sm:text-xl mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
				<Icon name="location" size={20} class="flex-shrink-0 text-primary" />
				<span class="whitespace-nowrap">ที่อยู่ขณะป่วย</span>
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">บ้านเลขที่</span>
					</label>
					<div class="text-base-content/80">{caseReport.sickAddressNo || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">หมู่ที่</span>
					</label>
					<div class="text-base-content/80">{caseReport.sickMoo || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">ถนน</span>
					</label>
					<div class="text-base-content/80">{caseReport.sickRoad || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">ตำบล/แขวง</span>
					</label>
					<div class="text-base-content/80">{caseReport.sickTambon?.nameTh || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">อำเภอ/เขต</span>
					</label>
					<div class="text-base-content/80">{caseReport.sickAmphoe?.nameTh || '-'}</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">จังหวัด</span>
					</label>
					<div class="text-base-content/80">{caseReport.sickProvince?.nameTh || '-'}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Lab Results and Notes -->
	{#if caseReport.labResult1 || caseReport.labResult2 || caseReport.remark || caseReport.reporterName}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body p-3 sm:p-4 md:p-6">
				<h2 class="card-title text-lg sm:text-xl mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
					<Icon name="lab" size={20} class="flex-shrink-0 text-primary" />
					<span class="whitespace-nowrap">ผลแลปและหมายเหตุ</span>
				</h2>
				<div class="space-y-4">
					{#if caseReport.labResult1}
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">ผลแลป 1</span>
							</label>
							<div class="text-base-content/80 whitespace-pre-wrap">{caseReport.labResult1}</div>
						</div>
					{/if}
					{#if caseReport.labResult2}
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">ผลแลป 2</span>
							</label>
							<div class="text-base-content/80 whitespace-pre-wrap">{caseReport.labResult2}</div>
						</div>
					{/if}
					{#if caseReport.remark}
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">หมายเหตุ</span>
							</label>
							<div class="text-base-content/80 whitespace-pre-wrap">{caseReport.remark}</div>
						</div>
					{/if}
					{#if caseReport.reporterName}
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">ผู้รายงาน</span>
							</label>
							<div class="text-base-content/80">{caseReport.reporterName}</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

