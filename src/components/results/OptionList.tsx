import { MathText } from "#/components/MathText";
import type { Question } from "#/lib/schema";

type Props = { question: Question; response: unknown };

function isPicked(response: unknown, id: string): boolean {
	if (Array.isArray(response)) return response.includes(id);
	return response === id;
}

function isKey(answer: unknown, id: string): boolean {
	if (Array.isArray(answer)) return answer.includes(id);
	return answer === id;
}

const MARKER = "rounded-[5px] px-2 py-1 text-xs font-[650]";

// Every option of a choice question, in file order, with which one the learner
// picked and which is right.
export function OptionList({ question, response }: Props) {
	if (question.format !== "single-choice" && question.format !== "multi-select")
		return null;
	return (
		<>
			<span className="text-[13px] font-[650]">Options</span>
			<ul
				data-testid="option-list"
				className="mt-2 mb-5 list-none rounded-[7px] bg-[#f4f7fc] p-0"
			>
				{question.options.map((option) => (
					<li
						key={option.id}
						className="flex flex-wrap items-start gap-2 border-b border-line p-3.5 leading-[1.65] last:border-b-0"
					>
						<span
							data-testid="option-text"
							className="min-w-0 flex-1 basis-40 [overflow-wrap:anywhere] whitespace-pre-wrap"
						>
							<MathText text={option.text} />
						</span>
						{isPicked(response, option.id) && (
							<span
								data-marker="picked"
								className={`${MARKER} bg-[#e8effc] text-[#1d4ba8]`}
							>
								Your answer
							</span>
						)}
						{question.answer !== null && isKey(question.answer, option.id) && (
							<span
								data-marker="correct"
								className={`${MARKER} bg-[#e7f4ed] text-[#176542]`}
							>
								Correct
							</span>
						)}
					</li>
				))}
			</ul>
		</>
	);
}
