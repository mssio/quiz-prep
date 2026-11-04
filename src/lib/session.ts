// A whole number from 1 to max, or null when the text is anything else.
export function parseCount(value: string, max: number): number | null {
	if (!/^\d+$/.test(value.trim())) return null;
	const count = Number(value);
	if (count < 1 || count > max) return null;
	return count;
}
