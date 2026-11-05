import { ReviewItem } from "#/components/results/ReviewItem";
import type { SessionView } from "#/lib/history";
import type { Question } from "#/lib/schema";

type Props = {
	view: SessionView;
	sourceOf(question: Question): string;
	readOnly?: boolean;
	onAssess?(questionId: string, correct: boolean): void;
};

export function ReviewList({ view, sourceOf, readOnly, onAssess }: Props) {
	return (
		<div className="mt-[25px]">
			{view.order.map((id, index) => {
				const question = view.questions.find((q) => q.id === id);
				if (!question) return null;
				return (
					<ReviewItem
						key={id}
						question={question}
						index={index}
						view={view}
						readOnly={readOnly}
						sourceName={sourceOf(question)}
						onAssess={onAssess && ((correct) => onAssess(id, correct))}
					/>
				);
			})}
		</div>
	);
}
