import { MathText } from "#/components/MathText";
import type { Question } from "#/lib/schema";
import { FillInBlank } from "./FillInBlank";
import { Matching } from "./Matching";
import { MultiSelect } from "./MultiSelect";
import { Ordering } from "./Ordering";
import { ShortAnswer } from "./ShortAnswer";
import { SingleChoice } from "./SingleChoice";
import { TrueFalse } from "./TrueFalse";
import type { QuestionProps } from "./types";

type Props = QuestionProps<Question["format"]>;

function FormatBody(props: Props) {
	const { question, response, displayOrder, onAnswer } = props;
	const shared = { response, displayOrder, onAnswer };
	switch (question.format) {
		case "single-choice":
			return <SingleChoice question={question} {...shared} />;
		case "multi-select":
			return <MultiSelect question={question} {...shared} />;
		case "true-false":
			return <TrueFalse question={question} {...shared} />;
		case "fill-in-blank":
			return <FillInBlank question={question} {...shared} />;
		case "short-answer":
			return <ShortAnswer question={question} {...shared} />;
		case "matching":
			return <Matching question={question} {...shared} />;
		case "ordering":
			return <Ordering key={question.id} question={question} {...shared} />;
	}
}

export function QuestionView(props: Props) {
	return (
		<div>
			<h2
				id="question-prompt"
				className="mb-[25px] text-xl leading-[1.5] font-semibold tracking-[-0.35px] break-words whitespace-pre-wrap phone:text-[23px]"
			>
				<MathText text={props.question.prompt} />
			</h2>
			<fieldset className="m-0 min-w-0 border-0 p-0">
				<legend className="sr-only">Your answer</legend>
				<FormatBody {...props} />
			</fieldset>
		</div>
	);
}
