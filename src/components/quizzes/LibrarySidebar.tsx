import { AddQuizzes } from "#/components/quizzes/AddQuizzes";
import { Button, SectionLabel, SummaryRow } from "#/components/ui";
import { storageStatus } from "#/lib/storage";

type Props = {
	quizCount: number;
	attemptCount: number;
	saveOk: boolean;
	busy: boolean;
	onFiles(files: File[]): void;
	onResetEverything(): void;
};

export function LibrarySidebar(props: Props) {
	const status = storageStatus(props.saveOk);
	return (
		<section className="rounded-2xl border border-line bg-white p-[26px] shadow-[0_3px_8px_#182b4210]">
			<SectionLabel>Add quizzes</SectionLabel>
			<div className="mt-4">
				<AddQuizzes busy={props.busy} onFiles={props.onFiles} />
			</div>
			<hr className="my-[22px] border-line" />
			<SummaryRow label="Quizzes" value={props.quizCount} />
			<SummaryRow label="Total attempts" value={props.attemptCount} />
			<SummaryRow label="Progress" value={status.library} />
			<hr className="my-[22px] border-line" />
			{/* Task 14 wires these two buttons. */}
			<div className="mb-4 grid grid-cols-2 gap-2">
				<Button variant="secondary" disabled>
					Export
				</Button>
				<Button variant="secondary" disabled>
					Import
				</Button>
			</div>
			<Button variant="danger" full onClick={props.onResetEverything}>
				Reset everything
			</Button>
			<p className="mt-3 text-center text-xs leading-[1.6] text-muted">
				Deletes all quizzes and score history in this browser.
			</p>
		</section>
	);
}
