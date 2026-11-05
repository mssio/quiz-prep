export type Rng = () => number;

// Fisher–Yates. Returns a new array and never touches the input.
export function shuffled<T>(values: readonly T[], rng: Rng): T[] {
	const result = [...values];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
