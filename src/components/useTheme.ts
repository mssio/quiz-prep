import { useCallback, useEffect, useState } from "react";
import { browserStorage } from "#/lib/storage";
import {
	loadTheme,
	resolveTheme,
	saveTheme,
	THEME_KEY,
	type ThemeChoice,
} from "#/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function applyTheme(choice: ThemeChoice) {
	const dark = window.matchMedia(DARK_QUERY).matches;
	const root = document.documentElement;
	root.dataset.theme = resolveTheme(choice, dark);
	// The top bar is navy in both modes; read it from the token.
	const navy = getComputedStyle(root).getPropertyValue("--color-navy").trim();
	if (navy) {
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", navy);
	}
}

export function useTheme(): {
	choice: ThemeChoice;
	setChoice(next: ThemeChoice): void;
} {
	const [choice, setChoiceState] = useState<ThemeChoice>(() =>
		loadTheme(browserStorage()),
	);

	useEffect(() => {
		applyTheme(choice);
		if (choice !== "system") return;
		const query = window.matchMedia(DARK_QUERY);
		const onChange = () => applyTheme("system");
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, [choice]);

	useEffect(() => {
		function onStorage(event: StorageEvent) {
			if (event.key !== THEME_KEY) return;
			setChoiceState(loadTheme(browserStorage()));
		}
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, []);

	const setChoice = useCallback((next: ThemeChoice) => {
		saveTheme(browserStorage(), next);
		setChoiceState(next);
	}, []);

	return { choice, setChoice };
}
