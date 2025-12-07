<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Chart from 'chart.js/auto';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { data }: { data: PageData } = $props();

	let trendChartCanvas: HTMLCanvasElement;
	let ageChartCanvas: HTMLCanvasElement;
	let trendChart: Chart;
	let ageChart: Chart;

	function initCharts() {
		if (trendChart) trendChart.destroy();
		if (ageChart) ageChart.destroy();

		// Trend Chart
		trendChart = new Chart(trendChartCanvas, {
			type: 'line',
			data: {
				labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
				datasets: [{
					label: 'จำนวนผู้ป่วย (ราย)',
					data: data.charts.monthlyTrend,
					borderColor: 'rgb(59, 130, 246)',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					tension: 0.4,
					fill: true,
					pointRadius: 4,
					pointHoverRadius: 6
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: { mode: 'index', intersect: false }
				},
				scales: {
					y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
					x: { grid: { display: false } }
				}
			}
		});

		// Age Chart
		ageChart = new Chart(ageChartCanvas, {
			type: 'bar',
			data: {
				labels: ['0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '60+'],
				datasets: [{
					label: 'จำนวนผู้ป่วย',
					data: data.charts.ageDistribution,
					backgroundColor: [
						'rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)',
						'rgba(239, 68, 68, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)',
						'rgba(107, 114, 128, 0.8)'
					],
					borderRadius: 4
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { display: false } },
				scales: {
					y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
					x: { grid: { display: false } }
				}
			}
		});
	}

	onMount(() => {
		initCharts();
	});

	$effect(() => {
		if (data) setTimeout(initCharts, 0);
	});
</script>

<svelte:head>
	<title>รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0 - ระบบฐานข้อมูลโรคติดต่อนำโดยแมลง</title>
</svelte:head>

<div class="min-h-screen bg-base-200 font-sans">
	<!-- Navbar -->
	<div class="navbar bg-base-100 shadow-md sticky top-0 z-50 px-4 lg:px-8">
		<div class="flex-1">
			<a href="/" class="btn btn-ghost text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-primary gap-1 sm:gap-2">
				<div class="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<span class="hidden sm:inline">รายงานสถานการณ์โรคติดต่อนำโดยแมลง</span>
				<span class="sm:hidden">รายงานโรค</span>
				<span class="text-base-content/60 text-xs sm:text-sm font-normal hidden sm:inline">v2.0</span>
			</a>
		</div>
		<div class="flex-none gap-1 sm:gap-2">
			<ThemeToggle />
			{#if data.user}
				<a href="/dashboard" class="btn btn-primary btn-xs sm:btn-sm text-xs sm:text-sm whitespace-nowrap">
					<span class="hidden sm:inline">เข้าสู่ระบบ Dashboard</span>
					<span class="sm:hidden">Dashboard</span>
				</a>
			{:else}
				<a href="/login" class="btn btn-outline btn-primary btn-xs sm:btn-sm text-xs sm:text-sm whitespace-nowrap">
					<span class="hidden sm:inline">เข้าสู่ระบบ</span>
					<span class="sm:hidden">เข้าสู่ระบบ</span>
				</a>
			{/if}
		</div>
	</div>

	<!-- Hero Section -->
	<div class="bg-gradient-to-br from-primary to-blue-600 text-white py-16">
		<div class="container mx-auto px-4 text-center">
			<h1 class="text-4xl lg:text-5xl font-bold mb-4">สถานการณ์โรคติดต่อนำโดยแมลง</h1>
			<p class="text-xl opacity-90 mb-8">รายงานและติดตามข้อมูลระบาดวิทยาแบบเรียลไทม์</p>
			
			<!-- Global Stats -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
				<div class="stats bg-white/10 text-white backdrop-blur-md border border-white/20">
					<div class="stat place-items-center p-4">
						<div class="stat-title text-white/80">ผู้ป่วยสะสม</div>
						<div class="stat-value text-2xl lg:text-3xl">{data.stats.totalCases.toLocaleString()}</div>
					</div>
				</div>
				<div class="stats bg-white/10 text-white backdrop-blur-md border border-white/20">
					<div class="stat place-items-center p-4">
						<div class="stat-title text-white/80">รักษาหาย</div>
						<div class="stat-value text-2xl lg:text-3xl text-green-300">{data.stats.recovered.toLocaleString()}</div>
					</div>
				</div>
				<div class="stats bg-white/10 text-white backdrop-blur-md border border-white/20">
					<div class="stat place-items-center p-4">
						<div class="stat-title text-white/80">เสียชีวิต</div>
						<div class="stat-value text-2xl lg:text-3xl text-red-300">{data.stats.deaths.toLocaleString()}</div>
					</div>
				</div>
				<div class="stats bg-white/10 text-white backdrop-blur-md border border-white/20">
					<div class="stat place-items-center p-4">
						<div class="stat-title text-white/80">อัตราป่วยตาย</div>
						<div class="stat-value text-2xl lg:text-3xl">{data.stats.mortalityRate}%</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Disease Cards Section -->
	<div class="container mx-auto px-4 py-12 -mt-8">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
			{#each data.diseases as disease}
				<a href="/report/{disease.id}" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer border border-base-200">
					<div class="card-body">
						<div class="flex justify-between items-start">
							<div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
								<span class="font-bold text-lg">{disease.code.substring(0, 1)}</span>
							</div>
							<div class="badge badge-outline">{disease.code}</div>
						</div>
						<h2 class="card-title mt-4 text-xl">
							{disease.nameTh}
						</h2>
						<p class="text-base-content/60 text-sm mb-4">{disease.nameEn || '-'}</p>
						
						<div class="divider my-0"></div>
						
						<div class="text-sm text-base-content/70 line-clamp-2 min-h-[2.5em]">
							{disease.symptoms || 'ไม่มีข้อมูลอาการระบุ'}
						</div>
						
						<div class="card-actions justify-end mt-4">
							<button class="btn btn-sm btn-primary btn-outline gap-2">
								ดูรายงาน
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</button>
						</div>
					</div>
				</a>
			{/each}
		</div>

		<!-- Global Charts -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<div class="card bg-base-100 shadow-xl lg:col-span-2">
				<div class="card-body">
					<h3 class="card-title">แนวโน้มผู้ป่วยรวมรายเดือน (ปี {new Date().getFullYear() + 543})</h3>
					<div class="h-[300px] w-full mt-4">
						<canvas bind:this={trendChartCanvas}></canvas>
					</div>
				</div>
			</div>
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h3 class="card-title">กลุ่มอายุผู้ป่วยรวม</h3>
					<div class="h-[300px] w-full mt-4">
						<canvas bind:this={ageChartCanvas}></canvas>
					</div>
				</div>
			</div>
		</div>
	</div>

	<footer class="footer footer-center p-10 bg-base-200 text-base-content">
		<div>
			<p class="font-bold">รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</p> 
			<p>Copyright © {new Date().getFullYear()} - All right reserved</p>
		</div>
	</footer>
</div>
