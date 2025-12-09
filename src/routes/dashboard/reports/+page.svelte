<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';
    import Chart from 'chart.js/auto';
    import { generateReportPDF } from '$lib/utils/pdf';

    let { data }: { data: PageData } = $props();

    let ageChartCanvas: HTMLCanvasElement;
    let diseaseChartCanvas: HTMLCanvasElement;
    let trendChartCanvas: HTMLCanvasElement;

    // สถานะสำหรับการ Print
    let isPrinting = $state(false);
    
    // สถานะสำหรับ Preview Modal
    let showPreviewModal = $state(false);
    let previewUrl = $state<string>('');
    
    // สถานะสำหรับเลือกหน่วยงานและปี
    let selectedHospitalId = $state<string>(data.selectedHospitalId?.toString() || '');
    let selectedYear = $state<string>(data.selectedYear?.toString() || new Date().getFullYear().toString());
    let isLoading = $state(false);
    
    // Chart instances for updating
    let ageChart: Chart | null = null;
    let diseaseChart: Chart | null = null;
    let trendChart: Chart | null = null;

    // Function to initialize/update charts
    function updateCharts() {
        // Age Distribution Chart
        if (ageChart) {
            ageChart.data.datasets[0].data = data.ageDistribution;
            ageChart.update();
        } else {
            ageChart = new Chart(ageChartCanvas, {
                type: 'bar',
                data: {
                    labels: ['0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '60+'],
                    datasets: [{
                        label: 'จำนวนผู้ป่วย',
                        data: data.ageDistribution,
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // Disease Distribution Chart
        if (diseaseChart) {
            diseaseChart.data.labels = data.diseaseDistribution.map(d => d.disease);
            diseaseChart.data.datasets[0].data = data.diseaseDistribution.map(d => d.count);
            diseaseChart.update();
        } else {
            diseaseChart = new Chart(diseaseChartCanvas, {
                type: 'pie',
                data: {
                    labels: data.diseaseDistribution.map(d => d.disease),
                    datasets: [{
                        data: data.diseaseDistribution.map(d => d.count),
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)',
                            'rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)',
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 1.4, // Slightly wider for better PDF export
                    plugins: { 
                        legend: { 
                            position: 'bottom',
                            labels: {
                                padding: 10,
                                font: {
                                    size: 11
                                }
                            }
                        }
                    }
                }
            });
        }

        // Trend Chart
        if (trendChart) {
            trendChart.data.datasets[0].data = data.monthlyTrend;
            trendChart.update();
        } else {
            trendChart = new Chart(trendChartCanvas, {
                type: 'line',
                data: {
                    labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
                    datasets: [{
                        label: 'จำนวนรายงาน',
                        data: data.monthlyTrend,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    }

    onMount(() => {
        updateCharts();
    });
    
    // Watch for data changes and update charts
    $effect(() => {
        if (ageChart && diseaseChart && trendChart) {
            updateCharts();
        }
    });
    
    // Function to handle filter change (hospital or year)
    async function handleFilterChange() {
        isLoading = true;
        try {
            const params = new URLSearchParams();
            if (selectedHospitalId) {
                params.set('hospitalId', selectedHospitalId);
            }
            if (selectedYear) {
                params.set('year', selectedYear);
            }
            await goto(`/dashboard/reports?${params.toString()}`, { 
                invalidateAll: true,
                noScroll: true 
            });
        } catch (error) {
            console.error('Error loading report:', error);
        } finally {
            isLoading = false;
        }
    }

    // 🖨️ ฟังก์ชันจัดการการพิมพ์ PDF
    async function handlePrint(mode: 'save' | 'preview' = 'save') {
        if (isPrinting) return; // ป้องกันการกดซ้ำ
        isPrinting = true;
        try {
            // Convert charts to images
            const chartImages: { ageChart?: string; diseaseChart?: string; trendChart?: string } = {};
            
            if (ageChart) {
                chartImages.ageChart = ageChart.toBase64Image();
            }
            if (diseaseChart) {
                chartImages.diseaseChart = diseaseChart.toBase64Image();
            }
            if (trendChart) {
                chartImages.trendChart = trendChart.toBase64Image();
            }

            // ส่งข้อมูลทั้งหมดไปให้ฟังก์ชันเจน PDF รวมถึงชื่อหน่วยงานที่เลือก
            const result = await generateReportPDF({
                ...data,
                selectedHospitalName: data.selectedHospitalName || null,
                selectedYear: data.selectedYear,
                population: data.population
            }, chartImages, mode);
            
            // If preview mode, show modal with PDF
            if (mode === 'preview' && result) {
                // Clean up previous URL if exists
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                }
                previewUrl = result;
                showPreviewModal = true;
            }
        } catch (error) {
            console.error('PDF Generation Failed:', error);
            alert('ไม่สามารถสร้าง PDF ได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            isPrinting = false;
        }
    }
    
    // ฟังก์ชันปิด Preview Modal และลบ URL
    function closePreviewModal() {
        showPreviewModal = false;
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = '';
        }
    }
    
    // ฟังก์ชันดาวน์โหลด PDF จาก Preview
    async function confirmDownload() {
        if (!previewUrl) return;
        
        try {
            // Generate PDF again in save mode
            await handlePrint('save');
            // Close modal after download starts
            closePreviewModal();
        } catch (error) {
            console.error('Download Failed:', error);
            alert('ไม่สามารถดาวน์โหลด PDF ได้ กรุณาลองใหม่อีกครั้ง');
        }
    }
</script>

<svelte:head>
    <title>รายงาน/สถิติ - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 class="text-2xl sm:text-3xl font-bold">รายงานและสถิติ</h1>
            <p class="text-base-content/60 mt-1">สถิติและวิเคราะห์ข้อมูลโรคติดต่อ</p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <select 
                class="select select-bordered select-sm sm:select-md w-full sm:w-32" 
                bind:value={selectedYear}
                onchange={handleFilterChange}
                disabled={isLoading}
            >
                {#each data.availableYears || [] as year}
                    <option value={year.toString()}>{year + 543}</option>
                {/each}
            </select>
            
            {#if data.hospitals && data.hospitals.length > 0}
                <select 
                    class="select select-bordered select-sm sm:select-md w-full sm:w-64" 
                    bind:value={selectedHospitalId}
                    onchange={handleFilterChange}
                    disabled={isLoading}
                >
                    <option value="">ทั้งหมด</option>
                    {#each data.hospitals as hospital}
                        <option value={hospital.id.toString()}>{hospital.name}</option>
                    {/each}
                </select>
            {/if}
            
            <button class="btn btn-outline btn-sm sm:btn-md" onclick={() => handlePrint('preview')} disabled={isPrinting || isLoading}>
                {#if isPrinting}
                    <span class="loading loading-spinner"></span> กำลังสร้าง PDF...
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span class="hidden sm:inline">Preview</span>
                    <span class="sm:hidden">Preview</span>
                {/if}
            </button>
            
            <button class="btn btn-primary btn-sm sm:btn-md" onclick={() => handlePrint('save')} disabled={isPrinting || isLoading}>
                {#if isPrinting}
                    <span class="loading loading-spinner"></span> กำลังสร้าง PDF...
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span class="hidden sm:inline">Download PDF</span>
                    <span class="sm:hidden">Download</span>
                {/if}
            </button>
        </div>
    </div>
    
    {#if isLoading}
        <div class="flex justify-center items-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
            <span class="ml-3">กำลังโหลดข้อมูล...</span>
        </div>
    {/if}

    <!-- Population Info -->
    <div class="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
            <h3 class="font-bold">ข้อมูลประชากร</h3>
            <div class="text-sm">ปี พ.ศ. {data.selectedYear + 543}: {data.population?.toLocaleString('th-TH') || '0'} คน</div>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="stats shadow">
            <div class="stat">
                <div class="stat-figure text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div class="stat-title">รายงานทั้งหมด</div>
                <div class="stat-value text-primary">{data.summary.totalCases}</div>
                <div class="stat-desc">รายการ</div>
            </div>
        </div>

        <div class="stats shadow">
            <div class="stat">
                <div class="stat-figure text-success">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="stat-title">หายแล้ว</div>
                <div class="stat-value text-success">{data.summary.recovered}</div>
                <div class="stat-desc">{data.summary.totalCases > 0 ? ((data.summary.recovered / data.summary.totalCases) * 100).toFixed(1) : '0.0'}%</div>
            </div>
        </div>

        <div class="stats shadow">
            <div class="stat">
                <div class="stat-figure text-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="stat-title">รักษาอยู่</div>
                <div class="stat-value text-warning">{data.summary.underTreatment}</div>
                <div class="stat-desc">{data.summary.totalCases > 0 ? ((data.summary.underTreatment / data.summary.totalCases) * 100).toFixed(1) : '0.0'}%</div>
            </div>
        </div>

        <div class="stats shadow">
            <div class="stat">
                <div class="stat-figure text-error">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="stat-title">เสียชีวิต</div>
                <div class="stat-value text-error">{data.summary.died}</div>
                <div class="stat-desc">{data.summary.totalCases > 0 ? ((data.summary.died / data.summary.totalCases) * 100).toFixed(1) : '0.0'}%</div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title">การกระจายตามกลุ่มอายุ</h2>
                <canvas bind:this={ageChartCanvas}></canvas>
            </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title">การกระจายตามโรค</h2>
                <canvas bind:this={diseaseChartCanvas}></canvas>
            </div>
        </div>

        <div class="card bg-base-100 shadow-xl lg:col-span-2">
            <div class="card-body">
                <h2 class="card-title">แนวโน้มรายเดือน</h2>
                <canvas bind:this={trendChartCanvas}></canvas>
            </div>
        </div>
    </div>

    <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
            <h2 class="card-title">อัตราป่วย (Morbidity Rate)</h2>
            <div class="overflow-x-auto">
                <table class="table">
                    <thead>
                        <tr>
                            <th>โรค</th>
                            <th>จำนวนผู้ป่วย</th>
                            <th>ประชากร</th>
                            <th>อัตราป่วยต่อ 100,000 คน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.morbidityRates as rate}
                            <tr>
                                <td>{rate.disease}</td>
                                <td>{rate.cases}</td>
                                <td>{rate.population.toLocaleString('th-TH')}</td>
                                <td>
                                    <div class="badge badge-lg badge-primary">{rate.rate.toFixed(2)}</div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- PDF Preview Modal -->
{#if showPreviewModal}
    <div class="modal modal-open">
        <div class="modal-box max-w-7xl w-full h-[90vh] flex flex-col">
            <h3 class="font-bold text-lg mb-4">PDF Preview - รายงานสถานการณ์โรคติดต่อ</h3>
            <div class="flex-1 border border-base-300 rounded-lg overflow-hidden">
                <iframe 
                    src={previewUrl} 
                    class="w-full h-full"
                    title="PDF Preview"
                ></iframe>
            </div>
            <div class="modal-action mt-4">
                <button class="btn btn-outline" onclick={closePreviewModal}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                </button>
                <button class="btn btn-primary" onclick={confirmDownload}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Confirm Download
                </button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop" onclick={closePreviewModal}>
            <button>close</button>
        </form>
    </div>
{/if}