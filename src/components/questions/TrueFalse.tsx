import { ChoiceRow, letterFor } from "./ChoiceRow";
import type { QuestionProps } from "./types";

export function TrueFalse(props: QuestionProps<"true-false">) {
	const { response, displayOrder, onAnswer } = props;
	return displayOrder.map((value, position) => {
		if (typeof value !== "boolean") return null;
		return (
			<ChoiceRow
				key={String(value)}
				type="radio"
				value={String(value)}
				checked={response === value}
				letter={letterFor(position)}
				onChange={() => onAnswer(value)}
			>
				{value ? "True" : "False"}
			</ChoiceRow>
		);
	});
}
