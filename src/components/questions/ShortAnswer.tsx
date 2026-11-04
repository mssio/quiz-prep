import { FIELD_LABEL_CLASS, HINT_CLASS, TEXT_FIELD_CLASS } from "./fields";
import { asText, type QuestionProps } from "./types";

export function ShortAnswer(props: QuestionProps<"short-answer">) {
	const { response, onAnswer } = props;
	return (
		<>
			<label className={FIELD_LABEL_CLASS} htmlFor="short-answer">
				Your answer
			</label>
			<textarea
				id="short-answer"
				className={`${TEXT_FIELD_CLASS} min-h-[140px] resize-y leading-[1.6]`}
				value={asText(response)}
				placeholder="Write your answer here…"
				onChange={(event) => onAnswer(event.target.value)}
			/>
			<p className={HINT_CLASS}>
				After finishing, compare your response with the model answer and assess
				it yourself.
			</p>
		</>
	);
}
