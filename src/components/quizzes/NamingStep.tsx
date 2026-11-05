import { Fragment } from "react";
import {
	Button,
	CountPill,
	Panel,
	PanelBody,
	PanelHeading,
} from "#/components/ui";
import { countLabel } from "#/lib/formats";
import { canAdd, type PendingFile, validCount } from "#/lib/upload";
import { isValidName } from "#/lib/workspace";

type Props = {
	pending: PendingFile[];
	onRename(index: number, name: string): void;
	onCancel(): void;
	onAdd(): void;
};

const FILE_ICON = "rounded-lg bg-tint p-2.5 text-xs font-[750] text-steel";
const ROW =
	"flex items-start gap-[13px] border-t border-line py-4 first:border-t-0 first:pt-0";

function ValidRow({
	item,
	onChange,
}: {
	item: PendingFile;
	onChange(name: string): void;
}) {
	if (!item.result.ok) return null;
	const count = item.result.questions.length;
	const blank = !isValidName(item.name);
	return (
		<li className={ROW}>
			<span className={FILE_ICON}>MD</span>
			<div className="min-w-0 flex-1">
				<label className="mb-2 block text-sm font-semibold text-slate">
					Quiz name{" "}
					<span className="font-normal text-muted">
						· {item.result.filename} · {countLabel(count, "question")}
					</span>
					<input
						className="mt-2 min-h-12 w-full rounded-lg border border-field bg-surface px-3.5 py-3 font-normal text-heading"
						value={item.name}
						aria-invalid={blank}
						onChange={(event) => onChange(event.target.value)}
					/>
				</label>
				{blank && (
					<p role="alert" className="text-xs text-danger-text">
						Give this quiz a name.
					</p>
				)}
			</div>
			<span className="rounded-[5px] bg-success-bg px-[9px] py-1.5 text-xs text-green">
				Ready
			</span>
		</li>
	);
}

function SkippedRow({ item }: { item: PendingFile }) {
	if (item.result.ok) return null;
	return (
		<li className={ROW}>
			<span className={FILE_ICON}>MD</span>
			<div className="min-w-0 flex-1">
				<strong className="[overflow-wrap:anywhere]">
					{item.result.filename}
				</strong>
				<div className="mt-2 rounded-lg border border-notice-border bg-notice-bg px-4 py-3.5 text-sm leading-[1.6] text-warning-strong">
					{item.result.errors.map((message, index) => (
						<p key={message + String(index)}>{message}</p>
					))}
					<p>This file will be skipped.</p>
				</div>
			</div>
			<span className="rounded-[5px] bg-danger-bg px-[9px] py-1.5 text-xs text-danger-text">
				Skipped
			</span>
		</li>
	);
}

function addLabel(count: number): string {
	return `Add ${count} ${count === 1 ? "quiz" : "quizzes"}`;
}

export function NamingStep({ pending, onRename, onCancel, onAdd }: Props) {
	const count = validCount(pending);
	return (
		<Panel>
			<PanelHeading title={addLabel(count)}>
				<CountPill>
					{pending.length} {pending.length === 1 ? "file" : "files"}
				</CountPill>
			</PanelHeading>
			<PanelBody>
				<ul>
					{pending.map((item, index) => (
						<Fragment key={item.result.filename + String(index)}>
							<ValidRow
								item={item}
								onChange={(name) => onRename(index, name)}
							/>
							<SkippedRow item={item} />
						</Fragment>
					))}
				</ul>
				<div className="mt-6 flex justify-between gap-3">
					<Button variant="secondary" onClick={onCancel}>
						Cancel
					</Button>
					<Button variant="primary" disabled={!canAdd(pending)} onClick={onAdd}>
						{addLabel(count)}
					</Button>
				</div>
			</PanelBody>
		</Panel>
	);
}
