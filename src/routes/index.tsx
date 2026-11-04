import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, useState } from "react";
import { Button, PageHeading, Panel, PanelBody } from "#/components/ui";
import { createAttempt } from "#/lib/attempt";
import { readUpload } from "#/lib/parser";
import { createQuiz } from "#/lib/workspace";
import { useWorkspace } from "#/state/workspace";

export const Route = createFileRoute("/")({ component: Home });

// Temporary phase 1 page. The real library screen replaces it later.
function Home() {
	const { state, dispatch } = useWorkspace();
	const navigate = useNavigate();
	const [errors, setErrors] = useState<string[]>([]);

	async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		const problems: string[] = [];
		for (const file of files) {
			const result = await readUpload(file);
			if (!result.ok) {
				problems.push(...result.errors);
				continue;
			}
			const quiz = createQuiz(result, result.title, new Date().toISOString());
			dispatch({ type: "addQuizzes", quizzes: [quiz] });
		}
		setErrors(problems);
	}

	function startAll(quizId: string) {
		const quiz = state.quizzes.find((item) => item.id === quizId);
		if (!quiz) return;
		const attempt = createAttempt(quiz.questions);
		dispatch({ type: "startAttempt", quizId, attempt });
		navigate({ to: "/quizzes/$quizId/play", params: { quizId } });
	}

	return (
		<>
			<PageHeading
				eyebrow="Quiz Prep"
				title="Question banks"
				lede="Upload a Markdown quiz file to begin."
			/>
			<Panel>
				<PanelBody>
					<input type="file" accept=".md" multiple onChange={handleFiles} />
					{errors.map((message) => (
						<p key={message} role="alert">
							{message}
						</p>
					))}
					<ul className="mt-6">
						{state.quizzes.map((quiz) => (
							<li
								key={quiz.id}
								className="flex items-center justify-between gap-3 border-t border-line py-4"
							>
								<span>
									{quiz.name} ({quiz.questions.length} questions)
								</span>
								<Button variant="primary" onClick={() => startAll(quiz.id)}>
									Start all questions
								</Button>
							</li>
						))}
					</ul>
				</PanelBody>
			</Panel>
		</>
	);
}
