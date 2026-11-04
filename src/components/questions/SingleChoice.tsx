import { MathText } from "#/components/MathText";
import { ChoiceRow, letterFor } from "./ChoiceRow";
import type { QuestionProps } from "./types";

export function SingleChoice(props: QuestionProps<"single-choice">) {
	const { question, response, displayOrder, onAnswer } = props;
	return displayOrder.map((id, position) => {
		const option = question.options.find((o) => o.id === id);
		if (option === undefined) return null;
		return (
			<ChoiceRow
				key={option.id}
				type="radio"
				value={option.id}
				checked={response === option.id}
				letter={letterFor(position)}
				onChange={() => onAnswer(option.id)}
			>
				<MathText text={option.text} />
			</ChoiceRow>
		);
	});
}
