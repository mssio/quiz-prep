import { MathText } from "#/components/MathText";
import { ChoiceRow, letterFor } from "./ChoiceRow";
import { HINT_CLASS } from "./fields";
import { asStringList, type QuestionProps } from "./types";

export function MultiSelect(props: QuestionProps<"multi-select">) {
	const { question, response, displayOrder, onAnswer } = props;
	const selected = asStringList(response);

	function toggle(id: string) {
		const next = selected.includes(id)
			? selected.filter((s) => s !== id)
			: [...selected, id];
		onAnswer(displayOrder.filter((d): d is string => next.includes(String(d))));
	}

	return (
		<>
			<p className={HINT_CLASS}>Select all that apply.</p>
			{displayOrder.map((id, position) => {
				const option = question.options.find((o) => o.id === id);
				if (option === undefined) return null;
				return (
					<ChoiceRow
						key={option.id}
						type="checkbox"
						value={option.id}
						checked={selected.includes(option.id)}
						letter={letterFor(position)}
						onChange={() => toggle(option.id)}
					>
						<MathText text={option.text} />
					</ChoiceRow>
				);
			})}
		</>
	);
}
