import { MathText } from "#/components/MathText";
import { hasMath } from "#/lib/math-text";
import type { Choice } from "#/lib/schema";
import { letterFor } from "./ChoiceRow";
import { HINT_CLASS, TEXT_FIELD_CLASS } from "./fields";
import { asStringMap, type QuestionProps } from "./types";

const ROW_CLASS =
	"grid grid-cols-1 items-center gap-2 border-t border-line py-3.5 phone:grid-cols-2 phone:gap-4";

function rightChoicesInOrder(
	right: Choice[],
	displayOrder: (string | boolean)[],
): Choice[] {
	return displayOrder.flatMap((id) => right.find((r) => r.id === id) ?? []);
}

function LetteredList({ choices }: { choices: Choice[] }) {
	return (
		<ul className="m-0 mb-3.5 list-none p-0">
			{choices.map((choice, position) => (
				<li key={choice.id} className="flex gap-2.5 leading-[1.6]">
					<span className="min-w-4 text-xs leading-[26px] font-bold text-[#59718f]">
						{letterFor(position)}
					</span>
					<span className="whitespace-pre-wrap">
						<MathText text={choice.text} />
					</span>
				</li>
			))}
		</ul>
	);
}

export function Matching(props: QuestionProps<"matching">) {
	const { question, response, displayOrder, onAnswer } = props;
	const values = asStringMap(response);
	const choices = rightChoicesInOrder(question.right, displayOrder);
	const mathInRight = question.right.some((r) => hasMath(r.text));

	return (
		<>
			<p className={HINT_CLASS}>Choose a match for each item.</p>
			{mathInRight ? <LetteredList choices={choices} /> : null}
			{question.left.map((item, index) => (
				<div key={item.id} className={ROW_CLASS}>
					<label
						className="text-base leading-[1.5] whitespace-pre-wrap"
						htmlFor={`match-${index}`}
					>
						<MathText text={item.text} />
					</label>
					<select
						id={`match-${index}`}
						className={TEXT_FIELD_CLASS}
						value={values[item.id] ?? ""}
						onChange={(event) =>
							onAnswer({ ...values, [item.id]: event.target.value })
						}
					>
						<option value="">Choose a match</option>
						{choices.map((choice, position) => (
							<option key={choice.id} value={choice.id}>
								{mathInRight ? letterFor(position) : choice.text}
							</option>
						))}
					</select>
				</div>
			))}
		</>
	);
}
