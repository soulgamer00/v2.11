<script lang="ts">
	import type { PageData } from './$types';
	import { formatDateThai } from '$lib/utils/date';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/icons/Icon.svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let filteredPatients = $derived(
		data.patients.filter((p) =>
			searchQuery
				? p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				  p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				  p.idCard?.includes(searchQuery)
				: true
		)
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

	<!-- Search -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="form-control">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="ค้นหา: ชื่อ, นามสกุล, เลขบัตรประชาชน..."
					class="input input-bordered"
				/>
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
										<div class="flex gap-2">
											<a href="/dashboard/patients/{patient.id}" class="btn btn-ghost btn-sm">
												ดูรายละเอียด
											</a>
											{#if data.user?.role === 'SUPERADMIN' || data.user?.role === 'ADMIN'}
												<button
													class="btn btn-ghost btn-sm hover:btn-error transition-all"
													onclick={() => handleDelete(patient.id)}
													aria-label="ลบ"
													title="ลบผู้ป่วย (Soft Delete)"
												>
													<Icon name="delete" size={16} />
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

