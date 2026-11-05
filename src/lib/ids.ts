// crypto.randomUUID only exists in secure contexts (https or localhost), so it
// is missing when the app is opened over plain http on a LAN address.
// getRandomValues is available everywhere, so we fall back to building the id.
export function newId(): string {
	if (typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return buildVersion4Id();
}

function buildVersion4Id(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
	const hex = Array.from(bytes, toTwoDigitHex).join("");
	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20),
	].join("-");
}

function toTwoDigitHex(byte: number): string {
	return byte.toString(16).padStart(2, "0");
}
