import { useCallback } from "react";

export function useFocusMain(): () => void {
	return useCallback(() => {
		document.getElementById("main")?.focus();
		window.scrollTo({ top: 0, behavior: "instant" });
	}, []);
}
