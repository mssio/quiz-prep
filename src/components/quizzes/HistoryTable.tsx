import { formatPercent } from "#/lib/history";
import type { HistoryEntry } from "#/lib/schema";

const dateFormat = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
});

function newestFirst(history: HistoryEntry[]): HistoryEntry[] {
	return [...history].sort((a, b) =>
		b.submittedAt.localeCompare(a.submittedAt),
	);
}

function ScoreBar({ entry }: { entry: HistoryEntry }) {
	const colour = entry.isRetry ? "bg-[#c9a24a]" : "bg-blue";
	return (
		<span className="flex items-center gap-2.5">
			<span className="inline-block h-2 w-[90px] overflow-hidden rounded bg-[#edf2fa]">
				<span
					className={`block h-full ${colour}`}
					style={{ width: `${entry.percentage}%` }}
				/>
			</span>
			{formatPercent(entry.percentage)}
		</span>
	);
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
	return (
		<tr className="border-t border-line">
			<td className="py-3 pr-3">
				{dateFormat.format(new Date(entry.submittedAt))}
			</td>
			<td className="py-3 pr-3">
				{entry.questionCount} of {entry.totalQuestions}
				{entry.isRetry && (
					<span className="ml-2 rounded-md bg-[#fff1cf] px-2 py-1 text-xs font-[650] text-[#774d0b]">
						Retry missed
					</span>
				)}
			</td>
			<td className="py-3">
				<ScoreBar entry={entry} />
			</td>
		</tr>
	);
}

export function HistoryTable({ history }: { history: HistoryEntry[] }) {
	if (history.length === 0) {
		return (
			<p className="leading-[1.7] text-muted">No finished attempts yet.</p>
		);
	}
	return (
		<table className="w-full text-left text-sm">
			<thead>
				<tr className="text-xs tracking-[1.4px] text-muted uppercase">
					<th className="pb-2 font-[750]">Date</th>
					<th className="pb-2 font-[750]">Questions</th>
					<th className="pb-2 font-[750]">Score</th>
				</tr>
			</thead>
			<tbody>
				{newestFirst(history).map((entry) => (
					<HistoryRow key={entry.id} entry={entry} />
				))}
			</tbody>
		</table>
	);
}
