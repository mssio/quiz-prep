import type { ReactNode } from "react";
import { formatPercent, formatSessionDate, groupHistory } from "#/lib/history";
import type { HistoryEntry } from "#/lib/schema";

type ReviewLink = (entry: HistoryEntry) => ReactNode;

function ScoreBar({ entry }: { entry: HistoryEntry }) {
	const colour = entry.isRetry ? "bg-[#c9a24a]" : "bg-blue";
	return (
		<span className="flex items-center gap-2.5">
			<span className="inline-block h-2 w-10 shrink-0 overflow-hidden rounded bg-[#edf2fa] sm:w-[90px]">
				<span
					className={`block h-full ${colour}`}
					style={{ width: `${entry.percentage}%` }}
				/>
			</span>
			{formatPercent(entry.percentage)}
		</span>
	);
}

function HistoryRow({
	entry,
	nested,
	reviewLink,
}: {
	entry: HistoryEntry;
	nested: boolean;
	reviewLink: ReviewLink;
}) {
	return (
		<tr className="border-t border-line">
			<td className={`py-3 pr-2 sm:pr-3 ${nested ? "pl-4 sm:pl-6" : ""}`}>
				{nested && (
					<span aria-hidden="true" className="mr-1 text-muted">
						↳
					</span>
				)}
				{formatSessionDate(entry.submittedAt)}
			</td>
			<td className="py-3 pr-2 sm:pr-3">
				{entry.questionCount} of {entry.totalQuestions}
				{entry.isRetry && (
					<span className="mt-1 block w-fit rounded-md bg-[#fff1cf] px-2 py-1 text-xs font-[650] text-[#774d0b] sm:mt-0 sm:ml-2 sm:inline-block">
						Retry missed
					</span>
				)}
			</td>
			<td className="py-3 pr-2 sm:pr-3">
				<ScoreBar entry={entry} />
			</td>
			<td className="py-3 text-right">
				{entry.review !== null && reviewLink(entry)}
			</td>
		</tr>
	);
}

export function HistoryTable({
	history,
	reviewLink,
}: {
	history: HistoryEntry[];
	reviewLink: ReviewLink;
}) {
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
					<th className="pb-2" />
				</tr>
			</thead>
			<tbody>
				{groupHistory(history).map((group) => [
					<HistoryRow
						key={group.entry.id}
						entry={group.entry}
						nested={false}
						reviewLink={reviewLink}
					/>,
					...group.retries.map((retry) => (
						<HistoryRow
							key={retry.id}
							entry={retry}
							nested
							reviewLink={reviewLink}
						/>
					)),
				])}
			</tbody>
		</table>
	);
}
