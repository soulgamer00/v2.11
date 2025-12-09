/**
 * Validate Thai ID Card (13 digits with checksum)
 */
export function validateThaiIdCard(idCard: string): boolean {
	if (!idCard || idCard.length !== 13) return false;
	
	// Check if all characters are digits
	if (!/^\d+$/.test(idCard)) return false;
	
	// Calculate checksum
	let sum = 0;
	for (let i = 0; i < 12; i++) {
		sum += parseInt(idCard.charAt(i)) * (13 - i);
	}
	
	const checkDigit = (11 - (sum % 11)) % 10;
	return checkDigit === parseInt(idCard.charAt(12));
}

/**
 * Validate Thai phone number
 */
export function validateThaiPhone(phone: string): boolean {
	if (!phone) return true; // Optional field
	
	// Remove dashes and spaces
	const cleaned = phone.replace(/[-\s]/g, '');
	
	// Check format: 10 digits starting with 0
	return /^0\d{9}$/.test(cleaned);
}

/**
 * Format Thai phone number
 */
export function formatThaiPhone(phone: string): string {
	if (!phone) return '';
	const cleaned = phone.replace(/[-\s]/g, '');
	
	if (cleaned.length === 10) {
		return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
	}
	
	return phone;
}








