<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import Icon from '$lib/components/icons/Icon.svelte';
	import AutocompleteSearch from '$lib/components/AutocompleteSearch.svelte';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		dataType: 'json',
		onResult: ({ result }) => {
			if (result.type === 'success') {
				closeModal();
			}
		}
	});

	let activeTab = $state(1); // Tab 1-5
	let showModal = $state(false);
	let searchIdCard = $state('');
	let selectedPatient = $state<any>(null);
	let amphoes = $state<any[]>([]);
	let tambons = $state<any[]>([]);
	let sickAmphoes = $state<any[]>([]);
	let sickTambons = $state<any[]>([]);

	// Set locked hospitalId on mount and when modal opens
	$effect(() => {
		if (data.lockedHospitalId && !$form.hospitalId) {
			$form.hospitalId = data.lockedHospitalId;
		}
	});

	// Handle modal open/close
	function openModal() {
		showModal = true;
		// Set locked hospitalId when opening modal
		if (data.lockedHospitalId) {
			$form.hospitalId = data.lockedHospitalId;
		}
		// Prevent body scroll when modal is open
		if (browser) {
			document.body.style.overflow = 'hidden';
		}
	}

	function closeModal() {
		showModal = false;
		// Restore body scroll
		if (browser) {
			document.body.style.overflow = '';
		}
	}

	// Validation functions for each tab
	function validateTab1(): { valid: boolean; message: string } {
		if (!$form.patient.prefix || $form.patient.prefix.trim() === '') {
			return { valid: false, message: 'กรุณาเลือกคำนำหน้า' };
		}
		if (!$form.patient.firstName || $form.patient.firstName.trim() === '') {
			return { valid: false, message: 'กรุณากรอกชื่อ' };
		}
		if (!$form.patient.lastName || $form.patient.lastName.trim() === '') {
			return { valid: false, message: 'กรุณากรอกนามสกุล' };
		}
		if (!$form.patient.gender) {
			return { valid: false, message: 'กรุณาเลือกเพศ' };
		}
		return { valid: true, message: '' };
	}

	function validateTab2(): { valid: boolean; message: string } {
		// Validate sick address if not using same address
		if (!$form.useSameAddress) {
			if (!$form.sickProvinceId || $form.sickProvinceId < 1) {
				return { valid: false, message: 'กรุณาเลือกจังหวัด (ขณะป่วย)' };
			}
			if (!$form.sickAmphoeId || $form.sickAmphoeId < 1) {
				return { valid: false, message: 'กรุณาเลือกอำเภอ (ขณะป่วย)' };
			}
			if (!$form.sickTambonId || $form.sickTambonId < 1) {
				return { valid: false, message: 'กรุณาเลือกตำบล (ขณะป่วย)' };
			}
		}
		return { valid: true, message: '' };
	}

	function validateTab3(): { valid: boolean; message: string } {
		if (!$form.hospitalId || $form.hospitalId < 1) {
			return { valid: false, message: 'กรุณาเลือกหน่วยงานที่รายงาน' };
		}
		if (!$form.diseaseId || $form.diseaseId < 1) {
			return { valid: false, message: 'กรุณาเลือกโรค' };
		}
		if (!$form.illnessDate || $form.illnessDate.trim() === '') {
			return { valid: false, message: 'กรุณาระบุวันที่เริ่มป่วย' };
		}
		return { valid: true, message: '' };
	}

	function validateTab4(): { valid: boolean; message: string } {
		// If condition is DIED, validate death information
		if ($form.condition === 'DIED') {
			if (!$form.deathDate || $form.deathDate.trim() === '') {
				return { valid: false, message: 'กรุณาระบุวันที่เสียชีวิต' };
			}
			if (!$form.causeOfDeath || $form.causeOfDeath.trim() === '') {
				return { valid: false, message: 'กรุณาระบุสาเหตุการเสียชีวิต' };
			}
		}
		return { valid: true, message: '' };
	}

	function validateTab5(): { valid: boolean; message: string } {
		// If condition is DIED, remark is required
		if ($form.condition === 'DIED') {
			if (!$form.remark || $form.remark.trim() === '') {
				return { valid: false, message: 'กรุณาระบุหมายเหตุเพิ่มเติม' };
			}
		}
		return { valid: true, message: '' };
	}

	// Check if tab can be accessed
	function canAccessTab(tab: number): boolean {
		if (tab === 1) return true;
		if (tab === 2) return validateTab1().valid;
		if (tab === 3) return validateTab1().valid && validateTab2().valid;
		if (tab === 4) return validateTab1().valid && validateTab2().valid && validateTab3().valid;
		if (tab === 5) return validateTab1().valid && validateTab2().valid && validateTab3().valid && validateTab4().valid;
		return false;
	}

	// Get validation message for current tab
	function getValidationMessage(): string {
		if (activeTab === 1) return validateTab1().message;
		if (activeTab === 2) return validateTab2().message;
		if (activeTab === 3) return validateTab3().message;
		if (activeTab === 4) return validateTab4().message;
		if (activeTab === 5) return validateTab5().message;
		return '';
	}

	// Navigate to tab with validation
	function goToTab(tab: number) {
		if (tab < activeTab) {
			// Allow going back
			activeTab = tab;
			return;
		}
		// Check if can access
		if (canAccessTab(tab)) {
			activeTab = tab;
		} else {
			const msg = getValidationMessage();
			if (msg) {
				alert(msg);
			}
		}
	}


	// Select patient from search results
	async function selectPatient(patient: any) {
		selectedPatient = patient;
		$form.patient.id = patient.id;
		$form.patient.idCard = patient.idCard;
		$form.patient.prefix = patient.prefix;
		$form.patient.firstName = patient.firstName;
		$form.patient.lastName = patient.lastName;
		$form.patient.gender = patient.gender || '';
		$form.patient.birthDate = patient.birthDate ? (patient.birthDate instanceof Date ? patient.birthDate.toISOString().split('T')[0] : new Date(patient.birthDate).toISOString().split('T')[0]) : '';
		$form.patient.nationality = patient.nationality || '';
		$form.patient.maritalStatus = patient.maritalStatus || '';
		$form.patient.occupation = patient.occupation || '';
		$form.patient.phone = patient.phone || '';
		$form.patient.addressNo = patient.addressNo || '';
		$form.patient.moo = patient.moo || '';
		$form.patient.road = patient.road || '';
		$form.patient.provinceId = patient.provinceId || 0;
		$form.patient.amphoeId = patient.amphoeId || 0;
		$form.patient.tambonId = patient.tambonId || 0;
		$form.patient.postalCode = patient.postalCode || '';

		if (patient.provinceId) {
			await loadAmphoes(patient.provinceId);
		}
		if (patient.amphoeId) {
			await loadTambons(patient.amphoeId);
		}

		// Stay on Patient Info tab after selecting
		searchIdCard = '';
	}

	// Load amphoes when province changes
	async function loadAmphoes(provinceId: number) {
		const response = await fetch(`/api/geo/amphoes?provinceId=${provinceId}`);
		if (response.ok) {
			amphoes = await response.json();
		}
	}

	// Load tambons when amphoe changes
	async function loadTambons(amphoeId: number) {
		const response = await fetch(`/api/geo/tambons?amphoeId=${amphoeId}`);
		if (response.ok) {
			tambons = await response.json();
		}
	}

	// Load sick amphoes
	async function loadSickAmphoes(provinceId: number) {
		const response = await fetch(`/api/geo/amphoes?provinceId=${provinceId}`);
		if (response.ok) {
			sickAmphoes = await response.json();
		}
	}

	// Load sick tambons
	async function loadSickTambons(amphoeId: number) {
		const response = await fetch(`/api/geo/tambons?amphoeId=${amphoeId}`);
		if (response.ok) {
			sickTambons = await response.json();
		}
	}

	// Handle province select
	async function handleProvinceSelect(province: any) {
		if (province && province.id) {
			$form.patient.provinceId = province.id;
			await loadAmphoes(province.id);
			$form.patient.amphoeId = undefined;
			$form.patient.tambonId = undefined;
		}
	}

	// Handle amphoe select
	async function handleAmphoeSelect(amphoe: any) {
		if (amphoe && amphoe.id) {
			$form.patient.amphoeId = amphoe.id;
			await loadTambons(amphoe.id);
			$form.patient.tambonId = undefined;
		}
	}

	// Handle tambon select
	function handleTambonSelect(tambon: any) {
		if (tambon && tambon.id) {
			$form.patient.tambonId = tambon.id;
			if (tambon.postalCode) {
				$form.patient.postalCode = tambon.postalCode;
			}
		}
	}

	// Handle sick province select
	async function handleSickProvinceSelect(province: any) {
		if (province && province.id) {
			$form.sickProvinceId = province.id;
			await loadSickAmphoes(province.id);
			$form.sickAmphoeId = undefined;
			$form.sickTambonId = undefined;
		}
	}

	// Handle sick amphoe select
	async function handleSickAmphoeSelect(amphoe: any) {
		if (amphoe && amphoe.id) {
			$form.sickAmphoeId = amphoe.id;
			await loadSickTambons(amphoe.id);
			$form.sickTambonId = undefined;
		}
	}

	// Handle sick tambon select
	function handleSickTambonSelect(tambon: any) {
		if (tambon && tambon.id) {
			$form.sickTambonId = tambon.id;
			if (tambon.postalCode) {
				$form.sickPostalCode = tambon.postalCode;
			}
		}
	}

	// Copy address from patient
	function handleUseSameAddress(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.checked) {
			$form.sickAddressNo = $form.patient.addressNo;
			$form.sickMoo = $form.patient.moo;
			$form.sickRoad = $form.patient.road;
			$form.sickPostalCode = $form.patient.postalCode;
			$form.sickProvinceId = $form.patient.provinceId;
			$form.sickAmphoeId = $form.patient.amphoeId;
			$form.sickTambonId = $form.patient.tambonId;

			if ($form.patient.provinceId) {
				loadSickAmphoes($form.patient.provinceId);
			}
			if ($form.patient.amphoeId) {
				loadSickTambons($form.patient.amphoeId);
			}
		}
	}

</script>

<svelte:head>
	<title>บันทึกรายงานใหม่ - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-2 sm:px-4">
	<h1 class="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">บันทึกรายงานผู้ป่วยโรคติดต่อ</h1>

	<!-- Patient Search Section (Compact) -->
	<div class="mb-4">
		<div class="flex gap-2 items-end">
			<div class="flex-1">
				<AutocompleteSearch
					bind:value={searchIdCard}
					label="ค้นหาผู้ป่วย"
					placeholder="เลขบัตรประชาชน หรือ ชื่อ-นามสกุล"
					searchUrl="/api/patients/search"
					onSelect={(patient) => {
						if (patient) {
							selectPatient(patient);
							openModal();
						}
					}}
					displayFn={(patient) => {
						if (!patient) return '';
						return `${patient.prefix || ''} ${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'ไม่มีข้อมูล';
					}}
					detailFn={(patient) => {
						if (!patient) return '';
						let details = [];
						if (patient.idCard) details.push(`เลขบัตร: ${patient.idCard}`);
						if (patient.phone) details.push(`โทร: ${patient.phone}`);
						return details.join(' • ') || '';
					}}
					size="sm"
				/>
			</div>
			<button type="button" class="btn btn-outline btn-sm" onclick={() => { searchIdCard = ''; openModal(); }}>
				เพิ่มผู้ป่วยใหม่
			</button>
		</div>
	</div>

	<!-- Open Form Button -->
	<div class="text-center mb-6">
		<button type="button" class="btn btn-primary btn-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2" onclick={openModal}>
			<Icon name="add" size={20} class="flex-shrink-0" />
			<span class="whitespace-nowrap">เริ่มบันทึกรายงานใหม่</span>
		</button>
	</div>
</div>

<!-- Modal Form -->
{#if showModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col p-0 m-2 sm:m-4">
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-3 sm:p-4 border-b border-base-300 bg-gradient-to-r from-primary/10 to-secondary/10">
				<h3 class="font-bold text-base sm:text-lg flex items-center gap-1 sm:gap-2 flex-wrap">
					<Icon name="document" size={18} class="text-primary hidden sm:inline flex-shrink-0" />
					<span class="text-sm sm:text-base whitespace-nowrap">บันทึกรายงานผู้ป่วยโรคติดต่อ</span>
				</h3>
				<button type="button" class="btn btn-xs btn-circle btn-ghost hover:bg-error/20 hover:text-error transition-all" onclick={closeModal}>
					<Icon name="close" size={16} />
				</button>
			</div>

			<!-- Modal Body (Scrollable) -->
			<div class="flex-1 overflow-y-auto p-2 sm:p-4">
				<!-- Progress Indicator -->
				<div class="mb-3">
					<div class="flex items-center justify-between mb-1">
						<span class="text-xs font-medium">ขั้นตอนที่ {activeTab} จาก 5</span>
						<span class="text-xs text-base-content/70">
							{Math.round((activeTab / 5) * 100)}% เสร็จสมบูรณ์
						</span>
					</div>
					<progress class="progress progress-primary progress-xs w-full" value={activeTab} max="5"></progress>
					{#if getValidationMessage()}
						<div class="alert alert-warning alert-sm mt-1">
							<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							<span class="text-xs">{getValidationMessage()}</span>
						</div>
					{/if}
				</div>

				<!-- Tabs -->
				<div class="tabs tabs-boxed tabs-xs sm:tabs-sm mb-3 overflow-x-auto">
					<button
						type="button"
						class="tab hover:scale-105 transition-all duration-200 whitespace-nowrap"
						class:tab-active={activeTab === 1}
						class:tab-disabled={!canAccessTab(1) && activeTab > 1}
						onclick={() => goToTab(1)}
					>
						<Icon name="user" size={14} class="flex-shrink-0 mr-1 hidden sm:inline" />
						<span class="text-xs sm:text-sm whitespace-nowrap">ข้อมูลผู้ป่วย</span>
					</button>
					<button
						type="button"
						class="tab hover:scale-105 transition-all duration-200 whitespace-nowrap"
						class:tab-active={activeTab === 2}
						class:tab-disabled={!canAccessTab(2) && activeTab > 2}
						onclick={() => goToTab(2)}
					>
						<Icon name="location" size={14} class="flex-shrink-0 mr-1 hidden sm:inline" />
						<span class="text-xs sm:text-sm whitespace-nowrap">ที่อยู่</span>
					</button>
					<button
						type="button"
						class="tab hover:scale-105 transition-all duration-200 whitespace-nowrap"
						class:tab-active={activeTab === 3}
						class:tab-disabled={!canAccessTab(3) && activeTab > 3}
						onclick={() => goToTab(3)}
					>
						<Icon name="hospital" size={14} class="flex-shrink-0 mr-1 hidden sm:inline" />
						<span class="text-xs sm:text-sm whitespace-nowrap">ข้อมูลการเจ็บป่วย</span>
					</button>
					<button
						type="button"
						class="tab hover:scale-105 transition-all duration-200 whitespace-nowrap"
						class:tab-active={activeTab === 4}
						class:tab-disabled={!canAccessTab(4) && activeTab > 4}
						onclick={() => goToTab(4)}
					>
						<Icon name="status" size={14} class="flex-shrink-0 mr-1 hidden sm:inline" />
						<span class="text-xs sm:text-sm whitespace-nowrap">สถานะและผลการรักษา</span>
					</button>
					<button
						type="button"
						class="tab hover:scale-105 transition-all duration-200 whitespace-nowrap"
						class:tab-active={activeTab === 5}
						class:tab-disabled={!canAccessTab(5) && activeTab > 5}
						onclick={() => goToTab(5)}
					>
						<Icon name="lab" size={14} class="flex-shrink-0 mr-1 hidden sm:inline" />
						<span class="text-xs sm:text-sm whitespace-nowrap">ผลแลปและหมายเหตุ</span>
					</button>
				</div>

				<form method="POST" use:enhance>
		<!-- Tab 1: Patient Info -->
		{#if activeTab === 1}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-4">
					<h2 class="card-title text-lg mb-3 flex items-center gap-2">
						<Icon name="user" size={18} class="text-primary" />
						ข้อมูลผู้ป่วย
					</h2>

					<!-- Patient Form Fields -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
						<!-- ID Card -->
						<div class="form-control md:col-span-2">
						<label class="label py-1" for="idCard">
							<span class="label-text text-xs">เลขบัตรประชาชน</span>
						</label>
						<input
							type="text"
							id="idCard"
							bind:value={$form.patient.idCard}
							class="input input-bordered input-sm"
								class:input-error={$errors.patient?.idCard}
								placeholder="กรอก 13 หลัก (ถ้ามี)"
								maxlength="13"
							/>
							{#if $errors.patient?.idCard}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.patient.idCard}</span>
								</label>
							{/if}
						</div>

						<!-- Prefix -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.patient.prefix}
								label="คำนำหน้า"
								placeholder="เลือกคำนำหน้า"
								clientData={data.masterData?.PREFIX || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.value?.toLowerCase().includes(query.toLowerCase()) || false;
								}}
								onSelect={(item) => {
									if (item?.value) {
										$form.patient.prefix = item.value;
									}
								}}
								displayFn={(item) => item?.value || ''}
								size="sm"
								class={$errors.patient?.prefix ? 'input-error' : ''}
							/>
							{#if $errors.patient?.prefix}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.patient.prefix}</span>
								</label>
							{/if}
						</div>

						<!-- Gender -->
						<div class="form-control">
						<label class="label py-1" for="gender">
							<span class="label-text text-xs">เพศ <span class="text-error">*</span></span>
						</label>
						<select
							id="gender"
							bind:value={$form.patient.gender}
							class="select select-bordered select-sm"
								class:select-error={$errors.patient?.gender}
								required
							>
								<option value="">เลือกเพศ</option>
								<option value="MALE">ชาย</option>
								<option value="FEMALE">หญิง</option>
							</select>
							{#if $errors.patient?.gender}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.patient.gender}</span>
								</label>
							{/if}
						</div>

						<!-- First Name -->
						<div class="form-control">
						<label class="label py-1" for="firstName">
							<span class="label-text text-xs">ชื่อ <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="firstName"
							bind:value={$form.patient.firstName}
							class="input input-bordered input-sm"
								class:input-error={$errors.patient?.firstName}
								required
							/>
							{#if $errors.patient?.firstName}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.patient.firstName}</span>
								</label>
							{/if}
						</div>

						<!-- Last Name -->
						<div class="form-control">
						<label class="label py-1" for="lastName">
							<span class="label-text text-xs">นามสกุล <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="lastName"
							bind:value={$form.patient.lastName}
							class="input input-bordered input-sm"
								class:input-error={$errors.patient?.lastName}
								required
							/>
							{#if $errors.patient?.lastName}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.patient.lastName}</span>
								</label>
							{/if}
						</div>

						<!-- Birth Date -->
						<div class="form-control">
						<label class="label py-1" for="birthDate">
							<span class="label-text text-xs">วันเดือนปีเกิด</span>
						</label>
						<input
							type="date"
							id="birthDate"
							bind:value={$form.patient.birthDate}
							class="input input-bordered input-sm"
							/>
						</div>

						<!-- Nationality -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.patient.nationality}
								label="สัญชาติ"
								placeholder="เลือกสัญชาติ"
								clientData={data.masterData?.NATIONALITY || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.value?.toLowerCase().includes(query.toLowerCase()) || false;
								}}
								onSelect={(item) => {
									if (item?.value) {
										$form.patient.nationality = item.value;
									}
								}}
								displayFn={(item) => item?.value || ''}
								size="sm"
							/>
						</div>

						<!-- Occupation -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.patient.occupation}
								label="อาชีพ"
								placeholder="เลือกอาชีพ"
								clientData={data.masterData?.OCCUPATION || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.value?.toLowerCase().includes(query.toLowerCase()) || false;
								}}
								onSelect={(item) => {
									if (item?.value) {
										$form.patient.occupation = item.value;
									}
								}}
								displayFn={(item) => item?.value || ''}
								size="sm"
							/>
						</div>

						<!-- Marital Status -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.patient.maritalStatus}
								label="สถานภาพ"
								placeholder="เลือกสถานภาพ"
								clientData={data.masterData?.MARITAL_STATUS || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.value?.toLowerCase().includes(query.toLowerCase()) || false;
								}}
								onSelect={(item) => {
									if (item?.value) {
										$form.patient.maritalStatus = item.value;
									}
								}}
								displayFn={(item) => item?.value || ''}
								size="sm"
							/>
						</div>

						<!-- Phone -->
						<div class="form-control">
						<label class="label py-1" for="phone">
							<span class="label-text text-xs">เบอร์โทรศัพท์</span>
						</label>
						<input
							type="tel"
							id="phone"
							bind:value={$form.patient.phone}
							class="input input-bordered input-sm"
								placeholder="0812345678"
							/>
						</div>
					</div>

					<!-- Navigation Buttons -->
					<div class="card-actions justify-end mt-3">
						<button type="button" class="btn btn-primary btn-sm hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-2" onclick={() => goToTab(2)}>
							<span class="whitespace-nowrap">ถัดไป</span>
							<Icon name="arrowRight" size={16} class="flex-shrink-0" />
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tab 2: Addresses -->
		{#if activeTab === 2}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-4">
					<h2 class="card-title text-lg mb-3 flex items-center gap-2">
						<Icon name="location" size={18} class="text-primary" />
						ที่อยู่
					</h2>

					<div class="divider my-2">ที่อยู่ผู้ป่วย</div>

					<!-- Patient Address Section -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
						<!-- Address No -->
						<div class="form-control">
							<label class="label py-1" for="addressNo">
								<span class="label-text text-xs">บ้านเลขที่</span>
							</label>
							<input
								type="text"
								id="addressNo"
								bind:value={$form.patient.addressNo}
								class="input input-bordered input-sm"
							/>
						</div>

						<!-- Moo -->
						<div class="form-control">
							<label class="label py-1" for="moo">
								<span class="label-text text-xs">หมู่ที่</span>
							</label>
							<input
								type="text"
								id="moo"
								bind:value={$form.patient.moo}
								class="input input-bordered input-sm"
							/>
						</div>

						<!-- Road -->
						<div class="form-control md:col-span-2">
							<label class="label py-1" for="road">
								<span class="label-text text-xs">ถนน</span>
							</label>
							<input
								type="text"
								id="road"
								bind:value={$form.patient.road}
								class="input input-bordered input-sm"
							/>
						</div>

						<!-- Province -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.patient.provinceId}
								label="จังหวัด"
								placeholder="เลือกจังหวัด"
								clientData={data.provinces || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
										item.code?.toLowerCase().includes(query.toLowerCase()) || false;
								}}
								onSelect={handleProvinceSelect}
								displayFn={(item) => item?.nameTh || ''}
								detailFn={(item) => `รหัส: ${item?.code || ''}`}
								valueKey="id"
								displayKey="nameTh"
								size="sm"
							/>
						</div>

						<!-- Amphoe -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.patient.amphoeId}
								label="อำเภอ/เขต"
								placeholder="เลือกอำเภอ/เขต"
								clientData={amphoes || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
										item.code?.toLowerCase().includes(query.toLowerCase()) || false;
								}}
								onSelect={handleAmphoeSelect}
								displayFn={(item) => item?.nameTh || ''}
								detailFn={(item) => `รหัส: ${item?.code || ''}`}
								valueKey="id"
								displayKey="nameTh"
								size="sm"
								disabled={!$form.patient.provinceId}
							/>
						</div>

						<!-- Tambon -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.patient.tambonId}
								label="ตำบล/แขวง"
								placeholder="เลือกตำบล/แขวง"
								clientData={tambons || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
										item.code?.toLowerCase().includes(query.toLowerCase()) ||
										(item.postalCode && item.postalCode.includes(query)) || false;
								}}
								onSelect={handleTambonSelect}
								displayFn={(item) => item?.nameTh || ''}
								detailFn={(item) => {
									const details = [];
									if (item?.code) details.push(`รหัส: ${item.code}`);
									if (item?.postalCode) details.push(`ไปรษณีย์: ${item.postalCode}`);
									return details.join(' | ');
								}}
								valueKey="id"
								displayKey="nameTh"
								size="sm"
								disabled={!$form.patient.amphoeId}
							/>
						</div>

						<!-- Postal Code -->
						<div class="form-control">
							<label class="label py-1" for="postalCode">
								<span class="label-text text-xs">รหัสไปรษณีย์</span>
							</label>
							<input
								type="text"
								id="postalCode"
								bind:value={$form.patient.postalCode}
								class="input input-bordered input-sm"
								placeholder="เช่น 67000"
								maxlength="5"
							/>
						</div>
					</div>

					<div class="divider my-2">ที่อยู่ขณะป่วย</div>

					<!-- Sick Address Section -->
					<div class="form-control mb-4">
						<label class="label cursor-pointer justify-start gap-2">
							<input
								type="checkbox"
								bind:checked={$form.useSameAddress}
								class="checkbox"
								onchange={handleUseSameAddress}
							/>
							<span class="label-text text-xs">ใช้ที่อยู่เดียวกับที่อยู่ปัจจุบัน</span>
						</label>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
						<!-- Sick Address No -->
						<div class="form-control">
							<label class="label py-1" for="sickAddressNo">
								<span class="label-text text-xs">บ้านเลขที่</span>
							</label>
							<input
								type="text"
								id="sickAddressNo"
								bind:value={$form.sickAddressNo}
								class="input input-bordered input-sm"
								disabled={$form.useSameAddress}
							/>
						</div>

						<!-- Sick Moo -->
						<div class="form-control">
							<label class="label py-1" for="sickMoo">
								<span class="label-text text-xs">หมู่ที่</span>
							</label>
							<input
								type="text"
								id="sickMoo"
								bind:value={$form.sickMoo}
								class="input input-bordered input-sm"
								disabled={$form.useSameAddress}
							/>
						</div>

						<!-- Sick Road -->
						<div class="form-control md:col-span-2">
							<label class="label py-1" for="sickRoad">
								<span class="label-text text-xs">ถนน</span>
							</label>
							<input
								type="text"
								id="sickRoad"
								bind:value={$form.sickRoad}
								class="input input-bordered input-sm"
								disabled={$form.useSameAddress}
							/>
						</div>

						<!-- Sick Province -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.sickProvinceId}
								label="จังหวัด"
								placeholder="เลือกจังหวัด"
								clientData={data.provinces || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
										item.code?.toLowerCase().includes(query.toLowerCase()) || false;
								}}
								onSelect={handleSickProvinceSelect}
								displayFn={(item) => item?.nameTh || ''}
								detailFn={(item) => `รหัส: ${item?.code || ''}`}
								valueKey="id"
								displayKey="nameTh"
								size="sm"
								disabled={$form.useSameAddress}
								class={$errors.sickProvinceId ? 'input-error' : ''}
							/>
							{#if $errors.sickProvinceId}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.sickProvinceId}</span>
								</label>
							{/if}
						</div>

						<!-- Sick Amphoe -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.sickAmphoeId}
								label="อำเภอ/เขต"
								placeholder="เลือกอำเภอ/เขต"
								clientData={sickAmphoes || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
										item.code?.toLowerCase().includes(query.toLowerCase()) || false;
								}}
								onSelect={handleSickAmphoeSelect}
								displayFn={(item) => item?.nameTh || ''}
								detailFn={(item) => `รหัส: ${item?.code || ''}`}
								valueKey="id"
								displayKey="nameTh"
								size="sm"
								disabled={$form.useSameAddress || !$form.sickProvinceId}
								class={$errors.sickAmphoeId ? 'input-error' : ''}
							/>
							{#if $errors.sickAmphoeId}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.sickAmphoeId}</span>
								</label>
							{/if}
						</div>

						<!-- Sick Tambon -->
						<div class="form-control">
							<AutocompleteSearch
								bind:value={$form.sickTambonId}
								label="ตำบล/แขวง"
								placeholder="เลือกตำบล/แขวง"
								clientData={sickTambons || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
										item.code?.toLowerCase().includes(query.toLowerCase()) ||
										(item.postalCode && item.postalCode.includes(query)) || false;
								}}
								onSelect={handleSickTambonSelect}
								displayFn={(item) => item?.nameTh || ''}
								detailFn={(item) => {
									const details = [];
									if (item?.code) details.push(`รหัส: ${item.code}`);
									if (item?.postalCode) details.push(`ไปรษณีย์: ${item.postalCode}`);
									return details.join(' | ');
								}}
								valueKey="id"
								displayKey="nameTh"
								size="sm"
								disabled={$form.useSameAddress || !$form.sickAmphoeId}
								class={$errors.sickTambonId ? 'input-error' : ''}
							/>
							{#if $errors.sickTambonId}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.sickTambonId}</span>
								</label>
							{/if}
						</div>

						<!-- Sick Postal Code -->
						<div class="form-control">
							<label class="label py-1" for="sickPostalCode">
								<span class="label-text text-xs">รหัสไปรษณีย์</span>
							</label>
							<input
								type="text"
								id="sickPostalCode"
								bind:value={$form.sickPostalCode}
								class="input input-bordered input-sm"
								placeholder="เช่น 67000"
								maxlength="5"
								disabled={$form.useSameAddress}
							/>
						</div>
					</div>

					<!-- Navigation Buttons -->
					<div class="card-actions justify-between mt-3">
						<button type="button" class="btn btn-outline btn-sm hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-2" onclick={() => goToTab(1)}>
							<Icon name="arrowLeft" size={16} class="flex-shrink-0" />
							<span class="whitespace-nowrap">ย้อนกลับ</span>
						</button>
						<button type="button" class="btn btn-primary btn-sm hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-2" onclick={() => goToTab(3)}>
							<span class="whitespace-nowrap">ถัดไป</span>
							<Icon name="arrowRight" size={16} class="flex-shrink-0" />
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tab 3: Case Info -->
		{#if activeTab === 3}
					<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-4">
					<h2 class="card-title text-lg mb-3 flex items-center gap-2">
						<Icon name="hospital" size={18} class="text-primary" />
						ข้อมูลการเจ็บป่วย
					</h2>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
						<!-- Hospital -->
						<div class="form-control md:col-span-2">
							<AutocompleteSearch
								bind:value={$form.hospitalId}
								label="หน่วยงานที่รายงาน"
								placeholder="เลือกหน่วยงาน"
								clientData={data.hospitals || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									const q = query.toLowerCase();
									return item.name?.toLowerCase().includes(q) ||
										item.code9?.toLowerCase().includes(q) ||
										item.code9New?.toLowerCase().includes(q) ||
										item.code5?.toLowerCase().includes(q) || false;
								}}
								onSelect={(item) => {
									if (item?.id) {
										$form.hospitalId = item.id;
									}
								}}
								displayFn={(item) => item?.name || ''}
								detailFn={(item) => {
									const details = [];
									if (item?.code9New) details.push(`รหัส: ${item.code9New}`);
									if (item?.code5) details.push(`รหัส 5 หลัก: ${item.code5}`);
									return details.join(' | ');
								}}
								valueKey="id"
								displayKey="name"
								size="sm"
								disabled={!!data.lockedHospitalId}
								class={$errors.hospitalId ? 'input-error' : ''}
							/>
							{#if data.lockedHospitalId}
								<label class="label">
									<span class="label-text-alt text-info">หน่วยงานถูกล็อคตามสิทธิ์การเข้าถึงของคุณ</span>
								</label>
							{/if}
							{#if $errors.hospitalId}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.hospitalId}</span>
								</label>
							{/if}
						</div>

						<!-- Disease -->
						<div class="form-control md:col-span-2">
							<AutocompleteSearch
								bind:value={$form.diseaseId}
								label="โรค"
								placeholder="เลือกโรค"
								clientData={data.diseases || []}
								clientSearchFn={(item, query) => {
									if (!item || !query) return false;
									const q = query.toLowerCase();
									return item.nameTh?.toLowerCase().includes(q) ||
										item.nameEn?.toLowerCase().includes(q) ||
										item.abbreviation?.toLowerCase().includes(q) ||
										item.code?.toLowerCase().includes(q) || false;
								}}
								onSelect={(item) => {
									if (item?.id) {
										$form.diseaseId = item.id;
									}
								}}
								displayFn={(item) => item?.nameTh || ''}
								detailFn={(item) => {
									const details = [];
									if (item?.code) details.push(`รหัส: ${item.code}`);
									if (item?.abbreviation) details.push(`ย่อ: ${item.abbreviation}`);
									if (item?.nameEn) details.push(`EN: ${item.nameEn}`);
									return details.join(' | ');
								}}
								valueKey="id"
								displayKey="nameTh"
								size="sm"
								class={$errors.diseaseId ? 'input-error' : ''}
							/>
							{#if $errors.diseaseId}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.diseaseId}</span>
								</label>
							{/if}
						</div>

						<!-- Illness Date -->
						<div class="form-control">
							<label class="label py-1" for="illnessDate">
								<span class="label-text text-xs">วันที่เริ่มป่วย <span class="text-error">*</span></span>
							</label>
							<input
								type="date"
								id="illnessDate"
								bind:value={$form.illnessDate}
								class="input input-bordered input-sm"
								class:input-error={$errors.illnessDate}
								required
							/>
							{#if $errors.illnessDate}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.illnessDate}</span>
								</label>
							{/if}
						</div>

						<!-- Treat Date -->
						<div class="form-control">
							<label class="label py-1" for="treatDate">
								<span class="label-text text-xs">วันที่รับการรักษา</span>
							</label>
							<input
								type="date"
								id="treatDate"
								bind:value={$form.treatDate}
								class="input input-bordered input-sm"
							/>
						</div>

						<!-- Diagnosis Date -->
						<div class="form-control">
							<label class="label py-1" for="diagnosisDate">
								<span class="label-text text-xs">วันที่วินิจฉัย</span>
							</label>
							<input
								type="date"
								id="diagnosisDate"
								bind:value={$form.diagnosisDate}
								class="input input-bordered input-sm"
							/>
						</div>
					</div>

					<!-- Navigation Buttons -->
					<div class="card-actions justify-between mt-3">
						<button type="button" class="btn btn-outline btn-sm hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-2" onclick={() => goToTab(2)}>
							<Icon name="arrowLeft" size={16} class="flex-shrink-0" />
							<span class="whitespace-nowrap">ย้อนกลับ</span>
						</button>
						<button type="button" class="btn btn-primary btn-sm hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-2" onclick={() => goToTab(4)}>
							<span class="whitespace-nowrap">ถัดไป</span>
							<Icon name="arrowRight" size={16} class="flex-shrink-0" />
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tab 4: Status & Treatment -->
		{#if activeTab === 4}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-4">
					<h2 class="card-title text-lg mb-3 flex items-center gap-2">
						<Icon name="status" size={18} class="text-primary" />
						สถานะและผลการรักษา
					</h2>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
						<!-- Patient Type -->
						<div class="form-control">
							<label class="label py-1" for="patientType">
								<span class="label-text text-xs">ประเภทผู้ป่วย</span>
							</label>
							<select
								id="patientType"
								bind:value={$form.patientType}
								class="select select-bordered select-sm"
							>
								<option value="">เลือกประเภท</option>
								<option value="IPD">IPD (ผู้ป่วยใน)</option>
								<option value="OPD">OPD (ผู้ป่วยนอก)</option>
								<option value="ACF">ACF (Active Case Finding)</option>
							</select>
						</div>

						<!-- Condition -->
						<div class="form-control">
							<label class="label py-1" for="condition">
								<span class="label-text text-xs">สถานะ</span>
							</label>
							<select
								id="condition"
								bind:value={$form.condition}
								class="select select-bordered select-sm"
							>
								<option value="">เลือกสถานะ</option>
								<option value="RECOVERED">หาย</option>
								<option value="UNDER_TREATMENT">รักษาอยู่</option>
								<option value="DIED">เสียชีวิต</option>
							</select>
						</div>

						<!-- Death Date (Required if DIED) -->
						{#if $form.condition === 'DIED'}
							<div class="form-control">
								<label class="label py-1" for="deathDate">
									<span class="label-text text-xs">วันที่เสียชีวิต <span class="text-error">*</span></span>
								</label>
								<input
									type="date"
									id="deathDate"
									bind:value={$form.deathDate}
									class="input input-bordered input-sm"
									class:input-error={$errors.deathDate}
									required
								/>
								{#if $errors.deathDate}
									<label class="label">
										<span class="label-text-alt text-error">{$errors.deathDate}</span>
									</label>
								{/if}
							</div>

							<!-- Cause of Death (Required if DIED) -->
							<div class="form-control">
								<label class="label py-1" for="causeOfDeath">
									<span class="label-text text-xs">สาเหตุการเสียชีวิต <span class="text-error">*</span></span>
								</label>
								<input
									type="text"
									id="causeOfDeath"
									bind:value={$form.causeOfDeath}
									class="input input-bordered input-sm"
									class:input-error={$errors.causeOfDeath}
									placeholder="ระบุสาเหตุการเสียชีวิต"
									required
								/>
								{#if $errors.causeOfDeath}
									<label class="label">
										<span class="label-text-alt text-error">{$errors.causeOfDeath}</span>
									</label>
								{/if}
							</div>
						{/if}

						<!-- Reporter Name -->
						<div class="form-control">
							<label class="label py-1" for="reporterName">
								<span class="label-text text-xs">ผู้รายงาน</span>
							</label>
							<input
								type="text"
								id="reporterName"
								bind:value={$form.reporterName}
								class="input input-bordered input-sm"
							/>
						</div>

						<!-- Treating Hospital (Free text) -->
						<div class="form-control md:col-span-2">
							<label class="label py-1" for="treatingHospital">
								<span class="label-text text-xs">โรงพยาบาลที่กำลังรักษา</span>
							</label>
							<input
								type="text"
								id="treatingHospital"
								bind:value={$form.treatingHospital}
								class="input input-bordered input-sm"
								placeholder="ระบุชื่อโรงพยาบาลที่กำลังรักษา"
							/>
						</div>
					</div>

					<!-- Navigation Buttons -->
					<div class="card-actions justify-between mt-3">
						<button type="button" class="btn btn-outline btn-sm hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-2" onclick={() => goToTab(3)}>
							<Icon name="arrowLeft" size={16} class="flex-shrink-0" />
							<span class="whitespace-nowrap">ย้อนกลับ</span>
						</button>
						<button type="button" class="btn btn-primary btn-sm hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-2" onclick={() => goToTab(5)}>
							<span class="whitespace-nowrap">ถัดไป</span>
							<Icon name="arrowRight" size={16} class="flex-shrink-0" />
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tab 5: Lab Results & Notes -->
		{#if activeTab === 5}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-4">
					<h2 class="card-title text-lg mb-3 flex items-center gap-2">
						<Icon name="lab" size={18} class="text-primary" />
						ผลแลปและหมายเหตุ
					</h2>

					<div class="grid grid-cols-1 gap-2">
						<!-- Lab Result 1 -->
						<div class="form-control">
							<label class="label py-1" for="labResult1">
								<span class="label-text text-xs">ผลแลปเพิ่มเติม 1</span>
							</label>
							<textarea
								id="labResult1"
								bind:value={$form.labResult1}
								class="textarea textarea-bordered textarea-sm"
								rows="4"
								placeholder="กรอกผลแลปเพิ่มเติม..."
							></textarea>
						</div>

						<!-- Lab Result 2 -->
						<div class="form-control">
							<label class="label py-1" for="labResult2">
								<span class="label-text text-xs">ผลแลปเพิ่มเติม 2</span>
							</label>
							<textarea
								id="labResult2"
								bind:value={$form.labResult2}
								class="textarea textarea-bordered textarea-sm"
								rows="4"
								placeholder="กรอกผลแลปเพิ่มเติม..."
							></textarea>
						</div>

						<!-- Remark (Required if DIED) -->
						<div class="form-control">
							<label class="label py-1" for="remark">
								<span class="label-text text-xs">
									หมายเหตุ
									{#if $form.condition === 'DIED'}
										<span class="text-error">*</span>
									{/if}
								</span>
							</label>
							<textarea
								id="remark"
								bind:value={$form.remark}
								class="textarea textarea-bordered textarea-sm"
								class:textarea-error={$errors.remark}
								rows="3"
								placeholder={$form.condition === 'DIED' ? 'กรุณาระบุหมายเหตุเพิ่มเติม' : ''}
								required={$form.condition === 'DIED'}
							></textarea>
							{#if $errors.remark}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.remark}</span>
								</label>
							{/if}
						</div>
					</div>

					<!-- Navigation Buttons -->
					<div class="card-actions justify-between mt-3 flex-col sm:flex-row gap-2">
						<button type="button" class="btn btn-outline btn-sm hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-1 sm:gap-2" onclick={() => goToTab(4)}>
							<Icon name="arrowLeft" size={16} class="flex-shrink-0" />
							<span class="whitespace-nowrap">ย้อนกลับ</span>
						</button>
						<button type="submit" class="btn btn-primary btn-sm hover:scale-105 transition-all shadow-md hover:shadow-lg w-full sm:w-auto flex items-center justify-center gap-2" disabled={$delayed}>
							{#if $delayed}
								<span class="loading loading-spinner flex-shrink-0"></span>
							{/if}
							<span class="whitespace-nowrap">บันทึก</span>
						</button>
					</div>
				</div>
			</div>
		{/if}
				</form>
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-end gap-2 p-3 sm:p-4 border-t border-base-300">
				<button type="button" class="btn btn-outline btn-sm hover:scale-105 transition-all w-full sm:w-auto" onclick={closeModal}>
					ยกเลิก
				</button>
			</div>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}

