import { Panel } from "#/components/ui";
import type { Summary } from "#/lib/grading";
import { formatPercent } from "#/lib/history";

function eyebrow(s: Summary): string {
	if (s.pending) return "PROVISIONAL RESULT";
	return s.totalGradable ? "SESSION COMPLETE" : "UNSCORED SESSION";
}

function headline(s: Summary): string {
	if (s.pending) return "One last step: assess your answers.";
	if (!s.totalGradable) return "No answer keys to score.";
	return s.incorrect
		? "Every attempt is a step forward."
		: "All correct. Nicely done.";
}

function detail(s: Summary): string {
	if (s.pending) {
		const plural = s.pending === 1 ? "" : "s";
		return `${s.pending} short-answer response${plural} need your assessment below.`;
	}
	if (s.totalGradable) {
		return `${s.correct} of ${s.totalGradable} gradable questions correct.`;
	}
	return "You can still review your responses below.";
}

function Stat({ value, label }: { value: number; label: string }) {
	return (
		<div>
			<strong className="block text-2xl">{value}</strong>
			<span className="text-[13px] text-muted">{label}</span>
		</div>
	);
}

export function ResultHero({ summary }: { summary: Summary }) {
	return (
		<Panel>
			<div className="flex items-start gap-[18px] p-[23px] phone:items-center phone:gap-7 phone:p-8">
				<div className="flex h-24 min-w-24 items-center justify-center rounded-full border-[7px] border-ring-soft text-[25px] font-[750] tracking-[-1px] text-blue phone:h-[130px] phone:min-w-[130px] phone:border-[9px] phone:text-[34px]">
					{formatPercent(summary.percentage)}
				</div>
				<div>
					<p className="mb-3 text-xs font-[750] tracking-[1.8px] text-blue uppercase">
						{eyebrow(summary)}
					</p>
					<h2 className="text-[19px] font-bold leading-[1.4] tracking-[-0.35px]">
						{headline(summary)}
					</h2>
					<p className="my-3.5 text-sm leading-[1.6] text-muted">
						{detail(summary)}
					</p>
					<div className="mt-5 flex flex-wrap gap-3.5 phone:gap-[22px]">
						<Stat value={summary.correct} label="Correct" />
						<Stat value={summary.incorrect} label="Incorrect" />
						<Stat value={summary.pending} label="To assess" />
						<Stat value={summary.ungraded} label="Unscored" />
					</div>
				</div>
			</div>
		</Panel>
	);
}
