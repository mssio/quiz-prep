import type { StorageLike } from "#/lib/storage";

export const THEME_KEY = "quiz-prep:theme";

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_CHOICES: readonly ThemeChoice[] = [
	"system",
	"light",
	"dark",
];

export function isThemeChoice(value: unknown): value is ThemeChoice {
	return THEME_CHOICES.some((choice) => choice === value);
}

export function loadTheme(storage: StorageLike): ThemeChoice {
	try {
		const raw = storage.getItem(THEME_KEY);
		return isThemeChoice(raw) ? raw : "system";
	} catch {
		return "system";
	}
}

export function saveTheme(storage: StorageLike, choice: ThemeChoice): void {
	try {
		storage.setItem(THEME_KEY, choice);
	} catch {
		// The choice still applies for this visit.
	}
}

export function resolveTheme(
	choice: ThemeChoice,
	prefersDark: boolean,
): "light" | "dark" {
	if (choice === "system") return prefersDark ? "dark" : "light";
	return choice;
}
