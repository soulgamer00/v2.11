<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{ title: 'รายงานทั้งหมด', value: data.stats.totalCases, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-primary' },
		{ title: 'รายงานเดือนนี้', value: data.stats.casesThisMonth, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-secondary' },
		{ title: 'ผู้ป่วยทั้งหมด', value: data.stats.totalPatients, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'bg-accent' },
		{ title: 'หน่วยงาน', value: data.stats.totalHospitals, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'bg-info' }
	]);
</script>

<svelte:head>
	<title>แดชบอร์ด - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">แดชบอร์ด</h1>
		<p class="text-sm sm:text-base text-base-content/60 mt-1">ภาพรวมระบบฐานข้อมูลโรคติดต่อนำโดยแมลง</p>
	</div>

	<!-- Welcome Card -->
	<div class="alert alert-info">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
		</svg>
		<span>ยินดีต้อนรับ, <strong>{data.user?.fullName}</strong> ({data.user?.role})</span>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
		{#each stats as stat}
			<div class="stats shadow">
				<div class="stat">
					<div class="stat-figure text-primary">
						<div class="{stat.color} rounded-full p-3 text-white">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={stat.icon} />
							</svg>
						</div>
					</div>
					<div class="stat-title">{stat.title}</div>
					<div class="stat-value">{stat.value.toLocaleString('th-TH')}</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Recent Cases -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">รายงานล่าสุด</h2>
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>วันที่ป่วย</th>
							<th>ชื่อ-นามสกุล</th>
							<th>โรค</th>
							<th>หน่วยงาน</th>
							<th>สถานะ</th>
						</tr>
					</thead>
					<tbody>
						{#if data.recentCases.length === 0}
							<tr>
								<td colspan="5" class="text-center text-base-content/60">ไม่พบข้อมูล</td>
							</tr>
						{:else}
							{#each data.recentCases as caseReport}
								<tr>
									<td>{new Date(caseReport.illnessDate || '').toLocaleDateString('th-TH')}</td>
									<td>
										{caseReport.patient.prefix} {caseReport.patient.firstName} {caseReport.patient.lastName}
									</td>
									<td>
										<div class="badge badge-primary">{caseReport.disease.nameTh}</div>
									</td>
									<td class="text-sm">{caseReport.hospital.name}</td>
									<td>
										{#if caseReport.condition === 'RECOVERED'}
											<span class="badge badge-success">หาย</span>
										{:else if caseReport.condition === 'DIED'}
											<span class="badge badge-error">เสียชีวิต</span>
										{:else}
											<span class="badge badge-warning">รักษาอยู่</span>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
			<div class="card-actions justify-end mt-4">
				<a href="/dashboard/cases" class="btn btn-primary btn-sm flex items-center justify-center gap-2">
					<span class="whitespace-nowrap">ดูทั้งหมด</span>
				</a>
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
			<a href="/dashboard/cases/new" class="card bg-gradient-to-br from-primary to-primary-focus text-primary-content shadow-xl hover:shadow-2xl transition-all">
				<div class="card-body items-center text-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					<h3 class="card-title">บันทึกรายงานใหม่</h3>
				</div>
			</a>
		{/if}

		<a href="/dashboard/reports" class="card bg-gradient-to-br from-secondary to-secondary-focus text-secondary-content shadow-xl hover:shadow-2xl transition-all">
			<div class="card-body items-center text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				<h3 class="card-title">ดูรายงาน/สถิติ</h3>
			</div>
		</a>

		<a href="/dashboard/patients" class="card bg-gradient-to-br from-accent to-accent-focus text-accent-content shadow-xl hover:shadow-2xl transition-all">
			<div class="card-body items-center text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				<h3 class="card-title">ทะเบียนผู้ป่วย</h3>
			</div>
		</a>
	</div>
</div>



