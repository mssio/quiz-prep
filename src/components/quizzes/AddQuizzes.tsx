import { type DragEvent, useRef, useState } from "react";
import { Button } from "#/components/ui";

export function AddQuizzes({
	busy,
	onFiles,
}: {
	busy: boolean;
	onFiles(files: File[]): void;
}) {
	const [dragging, setDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	function handleDrag(event: DragEvent) {
		event.preventDefault();
		setDragging(true);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		setDragging(false);
		onFiles(Array.from(event.dataTransfer.files));
	}

	const border = dragging
		? "border-blue bg-[#eaf0ff]"
		: "border-[#aabbd2] bg-[#f8faff]";

	return (
		<div id="add-quizzes">
			{/* biome-ignore lint/a11y/useSemanticElements: a drop target is not a form fieldset; the Choose files button is the keyboard path */}
			<div
				role="group"
				aria-label="Upload quizzes"
				className={`flex min-h-[170px] flex-col items-center justify-center rounded-[11px] border-[1.5px] border-dashed p-[25px] text-center transition ${border}`}
				onDragEnter={handleDrag}
				onDragOver={handleDrag}
				onDragLeave={() => setDragging(false)}
				onDrop={handleDrop}
			>
				<div
					aria-hidden="true"
					className="mb-[17px] grid h-12 w-11 place-items-center rounded-[7px] border-[1.5px] border-[#9eb0ca] bg-white text-[27px] text-blue shadow-[4px_4px_0_#e8edf6]"
				>
					+
				</div>
				<h3 className="mb-2 text-lg font-bold">
					{busy ? "Reading your files…" : "Drop Markdown files"}
				</h3>
				<p className="mb-5 text-sm leading-[1.6] text-muted">
					One file becomes one quiz.
				</p>
				<Button
					variant="primary"
					disabled={busy}
					onClick={() => inputRef.current?.click()}
				>
					{busy ? "Reading files…" : "Choose files"}
				</Button>
				<input
					ref={inputRef}
					type="file"
					accept=".md,text/markdown"
					multiple
					hidden
					onChange={(event) => {
						onFiles(Array.from(event.target.files ?? []));
						event.target.value = "";
					}}
				/>
			</div>
			<p className="mt-4 text-[13px] leading-[1.6] text-muted">
				◇ Files are read on your device and never uploaded to a server.
			</p>
		</div>
	);
}
