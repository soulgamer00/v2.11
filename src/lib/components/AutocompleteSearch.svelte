<script lang="ts">
	import Icon from './icons/Icon.svelte';
	import { browser } from '$app/environment';

	interface Props {
		value?: string | number | null | undefined;
		placeholder?: string;
		label?: string;
		searchUrl?: string;
		onSearch?: (query: string) => Promise<any[]>;
		clientData?: any[] | null | undefined; // For client-side search
		clientSearchFn?: (item: any, query: string) => boolean; // Custom search function for client data
		onSelect?: (item: any) => void;
		displayFn?: (item: any) => string;
		detailFn?: (item: any) => string;
		valueKey?: string; // Key to use as value (e.g., 'id', 'value')
		displayKey?: string; // Key to display in input (e.g., 'nameTh', 'name')
		minLength?: number;
		debounceMs?: number;
		class?: string;
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
	}

	let {
		value = $bindable<string | number | null | undefined>(undefined),
		placeholder = 'ค้นหา...',
		label,
		searchUrl,
		onSearch,
		clientData,
		clientSearchFn,
		onSelect,
		displayFn = (item: any) => {
			if (!item) return '';
			try {
				return item?.name || item?.title || item?.firstName || String(item || '') || '';
			} catch {
				return '';
			}
		},
		detailFn = (item: any) => {
			if (!item) return '';
			try {
				return '';
			} catch {
				return '';
			}
		},
		valueKey,
		displayKey,
		minLength = 1,
		debounceMs = 200,
		class: className = '',
		size = 'md',
		disabled = false
	}: Props = $props();

	// Normalize undefined/null values to prevent props_invalid_value error
	$effect(() => {
		if (value === undefined || value === null) {
			// Only normalize if we have a valueKey to determine the type
			if (valueKey) {
				value = valueKey === 'id' ? 0 : '';
			}
		}
	});

	let searchResults = $state<any[]>([]);
	let showSuggestions = $state(false);
	let selectedIndex = $state(-1);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let isLoading = $state(false);
	let displayValue = $state<string>('');

	// Sync displayValue with value when valueKey/displayKey is used
	$effect(() => {
		try {
			// If using valueKey/displayKey, find the display value from clientData
			if (valueKey && displayKey) {
				if (clientData && Array.isArray(clientData) && clientData.length > 0) {
					// Find selected item by valueKey
					const selectedItem = clientData.find((item: any) => {
						if (!item || item[valueKey] === undefined || item[valueKey] === null) return false;
						return item[valueKey] === value;
					});
					if (selectedItem && selectedItem[displayKey] !== undefined && selectedItem[displayKey] !== null) {
						displayValue = String(selectedItem[displayKey]);
					} else if (value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0)) {
						displayValue = '';
					}
					// If value exists but item not found, keep current displayValue
				} else {
					// clientData not loaded yet, set to empty if value is empty
					if (value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0)) {
						displayValue = '';
					}
				}
			} else {
				// For non-valueKey usage, convert to string directly
				if (value === undefined || value === null) {
					displayValue = '';
				} else {
					try {
						const val = String(value);
						displayValue = val || '';
					} catch {
						displayValue = '';
					}
				}
			}
		} catch (error) {
			console.error('Error syncing displayValue:', error);
			displayValue = '';
		}
	});

	// Autocomplete search with dropdown
	async function handleSearchInput(inputValue: string) {
		displayValue = inputValue;
		selectedIndex = -1;
		
		// Clear value if using valueKey and input is empty
		if (valueKey && inputValue === '') {
			if (valueKey === 'id') {
				value = 0;
			} else {
				value = '';
			}
		}

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		if (!inputValue || inputValue.length < minLength) {
			searchResults = [];
			showSuggestions = false;
			return;
		}

		isLoading = true;
		searchTimeout = setTimeout(async () => {
			try {
				let results: any[] = [];
				
				// Client-side search
				if (clientData && Array.isArray(clientData) && clientData.length > 0) {
					const queryLower = inputValue.toLowerCase();
					if (clientSearchFn) {
						results = clientData.filter(item => {
							try {
								return item && clientSearchFn(item, inputValue);
							} catch (error) {
								console.error('Error in clientSearchFn:', error);
								return false;
							}
						});
					} else {
						// Default client-side search
						results = clientData.filter(item => {
							if (!item) return false;
							try {
								const display = displayFn(item) || '';
								const detail = detailFn(item) || '';
								return display.toLowerCase().includes(queryLower) || detail.toLowerCase().includes(queryLower);
							} catch (error) {
								console.error('Error in default search:', error);
								return false;
							}
						});
					}
					// Limit results
					results = results.slice(0, 15);
				}
				// API search
				else if (onSearch) {
					results = await onSearch(inputValue);
				} else if (searchUrl) {
					const response = await fetch(`${searchUrl}?q=${encodeURIComponent(inputValue)}`);
					if (response.ok) {
						results = await response.json();
					}
				}
				
				searchResults = results;
				showSuggestions = results.length > 0 && displayValue.length >= minLength;
			} catch (error) {
				console.error('Search error:', error);
				searchResults = [];
				showSuggestions = false;
			} finally {
				isLoading = false;
			}
		}, debounceMs);
	}

	function selectItem(item: any) {
		if (!item) return;
		
		try {
			if (valueKey && displayKey) {
				// Set value to the valueKey property
				const newValue = item[valueKey];
				if (newValue !== undefined && newValue !== null) {
					value = newValue;
				} else {
					value = valueKey === 'id' ? 0 : '';
				}
				// Set displayValue to the displayKey property
				const display = item[displayKey];
				displayValue = display !== undefined && display !== null ? String(display) : '';
			} else {
				// Use displayFn for value
				const display = displayFn(item);
				const displayStr = display ? String(display) : '';
				value = displayStr;
				displayValue = displayStr;
			}
			
			if (onSelect) {
				onSelect(item);
			}
			showSuggestions = false;
			selectedIndex = -1;
			searchResults = [];
		} catch (error) {
			console.error('Error selecting item:', error);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!showSuggestions || searchResults.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		} else if (e.key === 'Enter' && selectedIndex >= 0) {
			e.preventDefault();
			selectItem(searchResults[selectedIndex]);
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			selectedIndex = -1;
		}
	}

	// Close suggestions when clicking outside
	if (browser) {
		$effect(() => {
			function handleClickOutside(e: MouseEvent) {
				const target = e.target as HTMLElement;
				if (!target.closest('.autocomplete-container')) {
					showSuggestions = false;
				}
			}

			if (showSuggestions) {
				document.addEventListener('click', handleClickOutside);
				return () => document.removeEventListener('click', handleClickOutside);
			}
		});
	}
</script>

<div class="form-control autocomplete-container relative {className}">
	{#if label}
		<label class="label">
			<span class="label-text font-semibold">{label}</span>
		</label>
	{/if}
	<div class="relative">
		<input
			type="text"
			bind:value={displayValue}
			oninput={(e) => handleSearchInput(e.currentTarget.value)}
			onkeydown={handleKeyDown}
			onfocus={() => {
				if (searchResults.length > 0 && displayValue.length >= minLength) {
					showSuggestions = true;
				}
			}}
			{placeholder}
			class="input input-bordered w-full pr-10 {size === 'sm' ? 'input-sm' : size === 'lg' ? 'input-lg' : ''} {className.includes('input-error') ? 'input-error' : ''}"
			autocomplete="off"
			{disabled}
		/>
		<Icon name="search" size={20} class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40" />
		{#if isLoading}
			<span class="loading loading-spinner loading-sm absolute right-10 top-1/2 -translate-y-1/2"></span>
		{/if}
		{#if showSuggestions && searchResults.length > 0}
			<div class="absolute z-50 w-full mt-1 bg-base-100 border-2 border-primary rounded-lg shadow-2xl max-h-80 overflow-y-auto dropdown-menu">
				<div class="px-3 py-2 text-xs font-semibold text-base-content/60 border-b border-base-300 bg-base-200 sticky top-0">
					พบ {searchResults.length} รายการที่ใกล้เคียง
				</div>
				{#each searchResults as result, index}
					{@const displayText = (() => {
						try {
							const d = displayFn(result);
							return d ? String(d) : 'ไม่มีข้อมูล';
						} catch {
							return 'ไม่มีข้อมูล';
						}
					})()}
					{@const detailText = (() => {
						try {
							const d = detailFn(result);
							return d ? String(d).trim() : '';
						} catch {
							return '';
						}
					})()}
					<button
						type="button"
						class="w-full text-left px-4 py-3 hover:bg-primary hover:text-primary-content transition-colors {index === selectedIndex
							? 'bg-primary text-primary-content'
							: 'bg-base-100'} border-b border-base-200 last:border-b-0"
						onclick={() => selectItem(result)}
						onmouseenter={() => selectedIndex = index}
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1">
								<div class="font-semibold text-base">
									{displayText}
								</div>
								{#if detailText}
									<div class="text-sm mt-1 text-base-content/60">
										{detailText}
									</div>
								{/if}
							</div>
							<div class="text-xs text-base-content/60">
								คลิกเพื่อเลือก
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
		{#if showSuggestions && searchResults.length === 0 && displayValue.length >= minLength && !isLoading}
			<div class="absolute z-50 w-full mt-1 bg-base-100 border-2 border-primary rounded-lg shadow-2xl">
				<div class="px-4 py-3 text-center text-base-content/60">
					ไม่พบข้อมูลที่ใกล้เคียง
				</div>
			</div>
		{/if}
	</div>
</div>

