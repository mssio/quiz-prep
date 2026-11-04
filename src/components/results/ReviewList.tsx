import { ReviewItem } from "#/components/results/ReviewItem";
import type { Attempt } from "#/lib/schema";

type Props = {
	attempt: Attempt;
	sourceName: string;
	onAssess(questionId: string, correct: boolean): void;
};

export function ReviewList({ attempt, sourceName, onAssess }: Props) {
	return (
		<div className="mt-[25px]">
			{attempt.order.map((id, index) => {
				const question = attempt.questions.find((q) => q.id === id);
				if (!question) return null;
				return (
					<ReviewItem
						key={id}
						question={question}
						index={index}
						attempt={attempt}
						sourceName={sourceName}
						onAssess={(correct) => onAssess(id, correct)}
					/>
				);
			})}
		</div>
	);
}
