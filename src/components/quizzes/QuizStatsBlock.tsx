import { formatPercent, type QuizStats } from "#/lib/history";

function Stat({ value, label }: { value: string | number; label: string }) {
	return (
		<div>
			<b className="block text-lg font-[650] text-[#17293f]">{value}</b>
			{label}
		</div>
	);
}

export function QuizStatsBlock({ stats }: { stats: QuizStats }) {
	return (
		<div className="flex gap-[22px] text-[13px] text-muted">
			<Stat value={formatPercent(stats.best)} label="Best" />
			<Stat value={formatPercent(stats.average)} label="Average" />
			<Stat value={stats.attempts} label="Attempts" />
		</div>
	);
}
