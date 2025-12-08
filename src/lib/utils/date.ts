/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date, referenceDate: Date = new Date()): number {
	const diff = referenceDate.getTime() - birthDate.getTime();
	const ageDate = new Date(diff);
	return Math.abs(ageDate.getUTCFullYear() - 1970);
}

/**
 * Format date to Thai locale
 */
export function formatDateThai(date: Date | string | null): string {
	if (!date) return '-';
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('th-TH', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
export function formatDateInput(date: Date | string | null): string {
	if (!date) return '';
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toISOString().split('T')[0];
}

/**
 * Parse date from input field
 */
export function parseDateInput(dateString: string): Date | null {
	if (!dateString) return null;
	return new Date(dateString);
}







