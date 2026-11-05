import { useTheme } from "#/components/useTheme";
import { isThemeChoice } from "#/lib/theme";

export function ThemeSelect() {
	const { choice, setChoice } = useTheme();
	return (
		<select
			aria-label="Theme"
			value={choice}
			onChange={(event) => {
				const next = event.target.value;
				if (isThemeChoice(next)) setChoice(next);
			}}
			className="min-h-11 shrink-0 cursor-pointer rounded-md border border-topbar-muted bg-navy px-3 text-sm text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
		>
			<option value="system">System</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	);
}
