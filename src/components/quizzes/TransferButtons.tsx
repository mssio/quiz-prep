import { useRef, useState } from "react";
import { useConfirm } from "#/components/ConfirmDialog";
import { Button } from "#/components/ui";
import { importWarning } from "#/lib/import-copy";
import {
	buildExport,
	EXPORT_FILENAME,
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
	URL.revokeObjectURL(url);
}

async function readText(file: File): Promise<string | null> {
	try {
		return await file.text();
	} catch {
		return null;
	}
}

export function TransferButtons({ onImported }: { onImported(): void }) {
	const { state, dispatch } = useWorkspace();
	const confirm = useConfirm();
	const inputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);

	function exportQuizzes() {
		const file = buildExport(state, new Date().toISOString());
		downloadText(serializeExport(file), EXPORT_FILENAME);
	}

	async function importFile(file: File) {
		setError(null);
		const text = await readText(file);
		if (text === null) return setError(READ_FAILED_MESSAGE);
		const parsed = parseExport(text);
		if (!parsed.ok) return setError(parsed.message);
		const ok = await confirm({
			title: "Replace everything?",
			copy: importWarning(state, parsed.quizzes.length),
			actionText: "Replace everything",
			cancelText: "Cancel",
		});
		if (!ok) return;
		const quizzes = quizzesFromExport(parsed.quizzes, new Date().toISOString());
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
				<Button variant="secondary" onClick={() => inputRef.current?.click()}>
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
