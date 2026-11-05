import { AddQuizzes } from "#/components/quizzes/AddQuizzes";
import { TransferButtons } from "#/components/quizzes/TransferButtons";
import { Button, SectionLabel, SummaryRow } from "#/components/ui";
import { storageStatus } from "#/lib/storage";

type Props = {
	quizCount: number;
	attemptCount: number;
	saveOk: boolean;
	busy: boolean;
	onFiles(files: File[]): void;
	onResetEverything(): void;
	onImported(): void;
};

export function LibrarySidebar(props: Props) {
	const status = storageStatus(props.saveOk);
	return (
		<section className="rounded-2xl border border-line bg-white p-6 shadow-[0_3px_8px_#182b4210] phone:p-[22px] tablet:p-[26px]">
			<SectionLabel>Add quizzes</SectionLabel>
			<div className="mt-4">
				<AddQuizzes busy={props.busy} onFiles={props.onFiles} />
			</div>
			<hr className="my-[22px] border-line" />
			<SummaryRow label="Quizzes" value={props.quizCount} />
			<SummaryRow label="Total attempts" value={props.attemptCount} />
			<SummaryRow label="Progress" value={status.library} />
			<hr className="my-[22px] border-line" />
			<TransferButtons busy={props.busy} onImported={props.onImported} />
			<Button variant="danger" full onClick={props.onResetEverything}>
				Reset everything
			</Button>
			<p className="mt-3 text-center text-xs leading-[1.6] text-muted">
				Deletes all quizzes and score history in this browser.
			</p>
		</section>
	);
}
