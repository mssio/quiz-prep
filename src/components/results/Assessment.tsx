import { Button } from "#/components/ui";

type Props = {
	assessed: boolean | undefined;
	onAssess(correct: boolean): void;
};

export function Assessment({ assessed, onAssess }: Props) {
	const title =
		assessed === undefined
			? "Does your answer express the same meaning?"
			: `Self-assessed: ${assessed ? "correct" : "incorrect"}`;
	return (
		<div className="rounded-lg border border-callout-border bg-callout-bg p-[18px]">
			<strong>{title}</strong>
			<p className="my-3.5 text-sm leading-[1.6] text-muted">
				Compare your response with the model answer. Your assessment contributes
				to the score.
			</p>
			<div className="flex flex-wrap gap-2">
				<Button
					variant="secondary"
					className="mt-2.5"
					aria-pressed={assessed === true}
					onClick={() => onAssess(true)}
				>
					Mark correct
				</Button>
				<Button
					variant="secondary"
					className="mt-2.5"
					aria-pressed={assessed === false}
					onClick={() => onAssess(false)}
				>
					Mark incorrect
				</Button>
			</div>
		</div>
	);
}
