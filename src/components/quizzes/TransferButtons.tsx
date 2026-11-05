import { useRef, useState } from "react";
import { useConfirm, useConfirmChoice } from "#/components/ConfirmDialog";
import { Button } from "#/components/ui";
import { importWarning } from "#/lib/import-copy";
import {
	buildExport,
	EXPORT_FILENAME,
	exportHasHistory,
	parseExport,
	quizzesFromExport,
	serializeExport,
} from "#/lib/transfer";
import { useWorkspace } from "#/state/workspace";

const READ_FAILED_MESSAGE = "This file couldn't be read. Nothing was changed.";

function downloadText(text: string, filename: string) {
	const url = URL.createObjectURL(
		new Blob([text], { type: "application/json" }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	// Revoking at once can cut the download off in some browsers.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readText(file: File): Promise<string | null> {
	try {
		return await file.text();
	} catch {
		return null;
	}
}

export function TransferButtons({
	busy,
	onImported,
}: {
	busy: boolean;
	onImported(): void;
}) {
	const { state, dispatch } = useWorkspace();
	const confirm = useConfirm();
	const confirmChoice = useConfirmChoice();
	const inputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);

	async function exportQuizzes() {
		const exportedAt = new Date().toISOString();
		let includeHistory = false;
		if (exportHasHistory(buildExport(state, exportedAt, true).quizzes)) {
			const choice = await confirmChoice({
				title: "Export quizzes",
				copy: "Score history includes your saved answers from past sessions.",
				actionText: "Export",
				cancelText: "Cancel",
				checkboxLabel: "Include score history",
			});
			if (!choice.confirmed) return;
			includeHistory = choice.checked;
		}
		const file = buildExport(state, exportedAt, includeHistory);
		downloadText(serializeExport(file), EXPORT_FILENAME);
	}

	async function importFile(file: File) {
		setError(null);
		const text = await readText(file);
		if (text === null) return setError(READ_FAILED_MESSAGE);
		const parsed = parseExport(text);
		if (!parsed.ok) return setError(parsed.message);
		const replace = {
			title: "Replace everything?",
			copy: importWarning(state, parsed.quizzes.length),
			actionText: "Replace everything",
			cancelText: "Cancel",
		};
		let includeHistory = false;
		if (exportHasHistory(parsed.quizzes)) {
			const choice = await confirmChoice({
				...replace,
				checkboxLabel: "Include score history",
			});
			if (!choice.confirmed) return;
			includeHistory = choice.checked;
		} else if (!(await confirm(replace))) {
			return;
		}
		const quizzes = quizzesFromExport(
			parsed.quizzes,
			new Date().toISOString(),
			includeHistory,
		);
		dispatch({ type: "replaceState", state: { quizzes } });
		onImported();
	}

	return (
		<>
			<div className="mb-4 grid grid-cols-2 gap-2">
				<Button
					variant="secondary"
					disabled={state.quizzes.length === 0}
					onClick={exportQuizzes}
				>
					Export
				</Button>
				<Button
					variant="secondary"
					disabled={busy}
					onClick={() => inputRef.current?.click()}
				>
					Import
				</Button>
				<input
					ref={inputRef}
					type="file"
					accept=".json,application/json"
					hidden
					onChange={(event) => {
						const file = event.target.files?.[0];
						event.target.value = "";
						if (file) importFile(file);
					}}
				/>
			</div>
			{error && (
				<p role="alert" className="mb-4 text-sm leading-[1.6] text-[#b3261e]">
					{error}
				</p>
			)}
		</>
	);
}
