<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Chart from 'chart.js/auto';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { data }: { data: PageData } = $props();

	let genderChartCanvas: HTMLCanvasElement;
	let trendChartCanvas: HTMLCanvasElement;
	let occupationChartCanvas: HTMLCanvasElement;

	let charts: Chart[] = [];

	// Filter State
	let selectedYear = $state(data.filters.year);
	let selectedProvince = $state(data.filters.provinceId);
	let selectedAmphoe = $state(data.filters.amphoeId);
	let selectedTambon = $state(data.filters.tambonId);
	let selectedHospital = $state(data.filters.hospitalId);

	function initCharts() {
		charts.forEach(c => c.destroy());
		charts = [];

		// 1. Gender Ratio
		charts.push(new Chart(genderChartCanvas, {
			type: 'doughnut',
			data: {
				labels: ['ชาย', 'หญิง'],
				datasets: [{
					data: [data.reports.genderStats.MALE.count, data.reports.genderStats.FEMALE.count],
					backgroundColor: ['#3b82f6', '#ec4899'],
					borderWidth: 0
				}]
			},
			options: { responsive: true, cutout: '60%' }
		}));

		// 3. Incidence Rate (Trend)
		charts.push(new Chart(trendChartCanvas, {
			type: 'line',
			data: {
				labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
				datasets: [
					{
						label: 'จำนวนผู้ป่วย',
						data: data.reports.monthlyCases,
						borderColor: '#3b82f6',
						yAxisID: 'y',
						tension: 0.4
					},
					{
						label: 'อัตราป่วยต่อแสน',
						data: data.reports.monthlyIncidence,
						borderColor: '#ef4444',
						yAxisID: 'y1',
						borderDash: [5, 5],
						tension: 0.4
					}
				]
			},
			options: {
				responsive: true,
				scales: {
					y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'จำนวนราย' } },
					y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'อัตราต่อแสน' } }
				}
			}
		}));

		// 3. Occupation
		charts.push(new Chart(occupationChartCanvas, {
			type: 'bar',
			indexAxis: 'y',
			data: {
				labels: data.reports.occupations.map(o => o.name),
				datasets: [{
					label: 'จำนวนผู้ป่วย',
					data: data.reports.occupations.map(o => o.count),
					backgroundColor: 'rgba(16, 185, 129, 0.7)',
					borderRadius: 4
				}]
			},
			options: { responsive: true, plugins: { legend: { display: false } } }
		}));
	}

	onMount(() => {
		initCharts();
	});

	$effect(() => {
		// Sync local state with data from loader
		selectedYear = data.filters.year;
		selectedProvince = data.filters.provinceId;
		selectedAmphoe = data.filters.amphoeId;
		selectedTambon = data.filters.tambonId;
		selectedHospital = data.filters.hospitalId;
		
		setTimeout(initCharts, 0);
	});

	function handleFilter(level: 'province' | 'amphoe' | 'tambon' | 'hospital' | 'year') {
		const params = new URLSearchParams();
		params.set('year', selectedYear.toString());

		// Logic for clearing lower levels when upper level changes
		if (level === 'province') {
			selectedAmphoe = 0;
			selectedTambon = 0;
			selectedHospital = 0;
		} else if (level === 'amphoe') {
			selectedTambon = 0;
			selectedHospital = 0;
		} else if (level === 'tambon') {
			// Optional: Keep hospital if it makes sense, or clear it
		}

		if (selectedProvince) params.set('provinceId', selectedProvince.toString());
		if (selectedAmphoe) params.set('amphoeId', selectedAmphoe.toString());
		if (selectedTambon) params.set('tambonId', selectedTambon.toString());
		if (selectedHospital) params.set('hospitalId', selectedHospital.toString());

		goto(`?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>รายงาน: {data.disease.nameTh} - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="min-h-screen bg-base-200 font-sans pb-12">
	<!-- Navbar -->
	<div class="navbar bg-base-100 shadow-sm px-4 lg:px-8 sticky top-0 z-50">
		<div class="flex-1">
			<a href="/" class="btn btn-ghost gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				กลับหน้าหลัก
			</a>
			<div class="hidden md:flex items-center">
				<span class="text-xl font-bold ml-2">{data.disease.nameTh}</span>
				<span class="badge badge-outline ml-2">{data.disease.code}</span>
			</div>
		</div>
		<div class="flex-none gap-2">
			<ThemeToggle />
			{#if data.user}
				<a href="/dashboard" class="btn btn-primary btn-sm">Dashboard</a>
			{:else}
				<a href="/login" class="btn btn-outline btn-sm">เข้าสู่ระบบ</a>
			{/if}
		</div>
	</div>

	<div class="container mx-auto px-4 mt-8">
		<!-- Advanced Filters -->
		<div class="card bg-base-100 shadow-sm mb-8">
			<div class="card-body py-4">
				<h3 class="font-bold text-lg mb-2">ตัวกรองข้อมูล</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
					
					<!-- Year -->
					<div class="form-control w-full">
						<label class="label"><span class="label-text">ปีงบประมาณ</span></label>
						<select class="select select-bordered select-sm" bind:value={selectedYear} onchange={() => handleFilter('year')}>
							{#each Array.from({length: 10}, (_, i) => new Date().getFullYear() - i) as year}
								<option value={year}>{year + 543}</option>
							{/each}
						</select>
					</div>

					<!-- Province -->
					<div class="form-control w-full">
						<label class="label"><span class="label-text">จังหวัด</span></label>
						<select class="select select-bordered select-sm" bind:value={selectedProvince} onchange={() => handleFilter('province')}>
							<option value={0}>ทุกจังหวัด</option>
							{#each data.masterData.provinces as p}
								<option value={p.id}>{p.nameTh}</option>
							{/each}
						</select>
					</div>

					<!-- Amphoe -->
					<div class="form-control w-full">
						<label class="label"><span class="label-text">อำเภอ</span></label>
						<select 
							class="select select-bordered select-sm" 
							bind:value={selectedAmphoe} 
							onchange={() => handleFilter('amphoe')}
							disabled={!selectedProvince}
						>
							<option value={0}>ทุกอำเภอ</option>
							{#each data.masterData.amphoes as a}
								<option value={a.id}>{a.nameTh}</option>
							{/each}
						</select>
					</div>

					<!-- Tambon -->
					<div class="form-control w-full">
						<label class="label"><span class="label-text">ตำบล</span></label>
						<select 
							class="select select-bordered select-sm" 
							bind:value={selectedTambon} 
							onchange={() => handleFilter('tambon')}
							disabled={!selectedAmphoe}
						>
							<option value={0}>ทุกตำบล</option>
							{#each data.masterData.tambons as t}
								<option value={t.id}>{t.nameTh}</option>
							{/each}
						</select>
					</div>

					<!-- Hospital -->
					<div class="form-control w-full">
						<label class="label"><span class="label-text">หน่วยงานรายงาน</span></label>
						<select 
							class="select select-bordered select-sm" 
							bind:value={selectedHospital} 
							onchange={() => handleFilter('hospital')}
						>
							<option value={0}>ทุกหน่วยงาน</option>
							{#each data.masterData.hospitals as h}
								<option value={h.id}>{h.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Stats Summary Strip -->
				<div class="divider my-2"></div>
				<div class="flex flex-wrap justify-between items-center">
					<div class="text-sm text-base-content/60">
						ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')}
					</div>
					<div class="flex gap-4">
						<div class="badge badge-primary gap-2 p-3">
							อัตราป่วย: {data.stats.incidenceRate} / แสน
						</div>
						<div class="badge badge-secondary gap-2 p-3">
							ผู้ป่วย: {data.stats.totalCases.toLocaleString()} ราย
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Charts Grid -->
		<div class="space-y-6">
			
			<!-- 1. Incidence Trend -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h3 class="card-title text-base">
						<span class="w-2 h-6 bg-primary rounded mr-2"></span>
						แนวโน้มการเกิดโรครายเดือน และ อัตราป่วย (Incidence Rate)
					</h3>
					<div class="h-[300px] lg:h-[400px] w-full mt-4">
						<canvas bind:this={trendChartCanvas}></canvas>
					</div>
				</div>
			</div>

			<!-- 2. Gender & Occupation Side by Side -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
				<!-- Gender -->
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body">
						<h3 class="card-title text-base">
							<span class="w-2 h-6 bg-pink-500 rounded mr-2"></span>
							สัดส่วนเพศ
						</h3>
						<div class="h-[200px] w-full flex justify-center relative flex-shrink-0">
							<canvas bind:this={genderChartCanvas}></canvas>
							<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
								<div class="text-center">
									<div class="text-2xl font-bold">{data.reports.genderStats.total}</div>
									<div class="text-xs opacity-60">ราย</div>
								</div>
							</div>
						</div>
						<!-- Gender Statistics Table -->
						<div class="mt-4 overflow-x-auto flex-1">
							<table class="table table-xs table-zebra w-full">
								<thead>
									<tr>
										<th>เพศ</th>
										<th class="text-right">จำนวน</th>
										<th class="text-right">ร้อยละ</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td>ชาย</td>
										<td class="text-right">{data.reports.genderStats.MALE.count.toLocaleString('th-TH')}</td>
										<td class="text-right">{data.reports.genderStats.MALE.percentage}%</td>
									</tr>
									<tr>
										<td>หญิง</td>
										<td class="text-right">{data.reports.genderStats.FEMALE.count.toLocaleString('th-TH')}</td>
										<td class="text-right">{data.reports.genderStats.FEMALE.percentage}%</td>
									</tr>
								</tbody>
								<tfoot>
									<tr class="font-bold">
										<td>อัตราส่วน (หญิง:ชาย)</td>
										<td colspan="2" class="text-right">หญิง 1 : ชาย {data.reports.genderStats.ratio}</td>
									</tr>
								</tfoot>
							</table>
						</div>
					</div>
				</div>

				<!-- Occupation -->
				<div class="card bg-base-100 shadow-xl h-full">
					<div class="card-body flex flex-col h-full">
						<h3 class="card-title text-base">
							<span class="w-2 h-6 bg-green-500 rounded mr-2"></span>
							อาชีพ
						</h3>
						<div class="h-[200px] w-full mb-4 flex-shrink-0">
							<canvas bind:this={occupationChartCanvas}></canvas>
						</div>
						<!-- Occupation Statistics Table -->
						<div class="overflow-x-auto flex-1">
							<table class="table table-xs table-zebra w-full">
								<thead>
									<tr>
										<th>อาชีพ</th>
										<th class="text-right">จำนวน</th>
										<th class="text-right">ร้อยละ</th>
									</tr>
								</thead>
								<tbody>
									{#each data.reports.occupations as occ}
										<tr>
											<td>{occ.name}</td>
											<td class="text-right">{occ.count}</td>
											<td class="text-right">{occ.percentage}%</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>

			<!-- 3. Age Statistics -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h3 class="card-title text-base">
						<span class="w-2 h-6 bg-blue-500 rounded mr-2"></span>
						สถิติตามกลุ่มอายุ
					</h3>
					<div class="overflow-x-auto">
						<table class="table table-zebra">
							<thead>
								<tr>
									<th>กลุ่มอายุ</th>
									<th class="text-right">จำนวนผู้ป่วย</th>
									<th class="text-right">อัตราป่วย (/100,000)</th>
									<th class="text-right">จำนวนตาย</th>
									<th class="text-right">อัตราป่วยตาย (%)</th>
								</tr>
							</thead>
							<tbody>
								{#each data.reports.ageStats as ageStat}
									<tr>
										<td class="font-semibold">{ageStat.ageGroup}</td>
										<td class="text-right">{ageStat.count}</td>
										<td class="text-right">{ageStat.morbidityRate}</td>
										<td class="text-right">{ageStat.died}</td>
										<td class="text-right">{ageStat.deathRate}%</td>
									</tr>
								{/each}
							</tbody>
							<tfoot>
								<tr class="font-bold">
									<td>รวม</td>
									<td class="text-right">{data.stats.totalCases}</td>
									<td class="text-right">{data.stats.incidenceRate}</td>
									<td class="text-right">{data.reports.ageStats.reduce((sum, a) => sum + a.died, 0)}</td>
									<td class="text-right">
										{data.stats.totalCases > 0 
											? ((data.reports.ageStats.reduce((sum, a) => sum + a.died, 0) / data.stats.totalCases) * 100).toFixed(2)
											: '0.00'}%
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>
			</div>

			<!-- 5. Historical Data (5 Years) -->
			<div class="card bg-base-100 shadow-xl lg:col-span-2">
				<div class="card-body">
					<h3 class="card-title text-base">
						<span class="w-2 h-6 bg-purple-500 rounded mr-2"></span>
						สถานการณ์โรคย้อนหลัง 5 ปี
					</h3>
					<div class="overflow-x-auto">
						<table class="table table-zebra">
							<thead>
								<tr>
									<th>ปี</th>
									<th class="text-right">จำนวนป่วย</th>
									<th class="text-right">อัตราป่วย (/100,000 ประชากร)</th>
									<th class="text-right">จำนวนตาย</th>
									<th class="text-right">อัตราตาย (%)</th>
								</tr>
							</thead>
							<tbody>
								{#each data.reports.historicalData as hist}
									<tr>
										<td class="font-semibold">{hist.year + 543}</td>
										<td class="text-right">{hist.totalCases}</td>
										<td class="text-right">{hist.morbidityRate}</td>
										<td class="text-right">{hist.died}</td>
										<td class="text-right">{hist.deathRate}%</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>

		</div>
	</div>
</div>
