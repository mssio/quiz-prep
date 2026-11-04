// Exact decimals, so rounding never trips over floating-point error.
type Decimal = { units: bigint; scale: number };
type NumericAnswer = { value: Decimal; percent: boolean };

// A rounded answer needs this many decimal places, so "1" never passes for 0.8.
const MIN_ROUNDED_PLACES = 2;
const NUMBER_PATTERN = /^([+-]?)(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d+))?(\s*%)?$/;

function parseNumber(text: string): NumericAnswer | null {
	const match = text.trim().match(NUMBER_PATTERN);
	if (!match) return null;
	const [, sign, whole, fraction = "", percent] = match;
	const digits = whole.replaceAll(",", "") + fraction;
	if (!digits) return null;
	const units = BigInt(digits) * (sign === "-" ? -1n : 1n);
	return {
		value: { units, scale: fraction.length },
		percent: percent !== undefined,
	};
}

function asFraction(percent: Decimal): Decimal {
	return { units: percent.units, scale: percent.scale + 2 };
}

function atScale(value: Decimal, scale: number): bigint {
	return value.units * 10n ** BigInt(scale - value.scale);
}

function isEqual(a: Decimal, b: Decimal): boolean {
	const scale = Math.max(a.scale, b.scale);
	return atScale(a, scale) === atScale(b, scale);
}

function isAboveOne(value: Decimal): boolean {
	const units = value.units < 0n ? -value.units : value.units;
	return units > 10n ** BigInt(value.scale);
}

// Rounds half away from zero.
function roundTo(value: Decimal, scale: number): Decimal {
	const factor = 10n ** BigInt(value.scale - scale);
	const negative = value.units < 0n;
	const size = negative ? -value.units : value.units;
	const rounded = (size + factor / 2n) / factor;
	return { units: negative ? -rounded : rounded, scale };
}

function isRoundingOf(rounded: Decimal, precise: Decimal): boolean {
	return (
		rounded.scale >= MIN_ROUNDED_PLACES &&
		rounded.scale < precise.scale &&
		isEqual(roundTo(precise, rounded.scale), rounded)
	);
}

function matches(a: Decimal, b: Decimal): boolean {
	return isEqual(a, b) || isRoundingOf(a, b) || isRoundingOf(b, a);
}

// True when both texts are numbers for the same value. A percentage matches its
// fraction (80% and 0.8) and, above 1, its plain number (80% and 80).
export function isSameNumber(expected: string, typed: string): boolean {
	const a = parseNumber(expected);
	const b = parseNumber(typed);
	if (!a || !b) return false;
	if (a.percent === b.percent) {
		return a.percent
			? matches(asFraction(a.value), asFraction(b.value))
			: matches(a.value, b.value);
	}
	const [plain, percent] = a.percent ? [b.value, a.value] : [a.value, b.value];
	return (
		matches(plain, asFraction(percent)) ||
		(isAboveOne(plain) && matches(plain, percent))
	);
}
