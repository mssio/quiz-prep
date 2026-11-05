import { blankCount } from "#/lib/grading";
import { FIELD_LABEL_CLASS, HINT_CLASS, TEXT_FIELD_CLASS } from "./fields";
import { asStringList, type QuestionProps } from "./types";

export function FillInBlank(props: QuestionProps<"fill-in-blank">) {
	const { question, response, onAnswer } = props;
	const count = blankCount(question);
	const saved = asStringList(response);
	const values = Array.from({ length: count }, (_, i) => saved[i] ?? "");

	function change(index: number, value: string) {
		const next = [...values];
		next[index] = value;
		onAnswer(next);
	}

	return (
		<>
			{values.map((value, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: blanks are a fixed list identified by position.
				<div key={index} className="mb-[17px]">
					<label className={FIELD_LABEL_CLASS} htmlFor={`blank-${index}`}>
						{count === 1 ? "Your answer" : `Blank ${index + 1}`}
					</label>
					<input
						id={`blank-${index}`}
						className={TEXT_FIELD_CLASS}
						type="text"
						autoComplete="off"
						value={value}
						onChange={(event) => change(index, event.target.value)}
					/>
				</div>
			))}
			<p className={HINT_CLASS}>
				Capitalization and extra spaces won’t affect your score.
			</p>
		</>
	);
}
