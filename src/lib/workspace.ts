import { type AttemptAction, updateAttempt } from "#/lib/attempt";
import { newId } from "#/lib/ids";
import type { ParsedFile } from "#/lib/parser";
import type { Attempt, Quiz, WorkspaceState } from "#/lib/schema";

export type WorkspaceAction =
	| { type: "addQuizzes"; quizzes: Quiz[] }
	| { type: "startAttempt"; quizId: string; attempt: Attempt }
	| { type: "attempt"; quizId: string; action: AttemptAction }
	| { type: "replaceState"; state: WorkspaceState };

export function createQuiz(
	parsed: ParsedFile,
	name: string,
	addedAt: string,
): Quiz {
	const id = newId();
	return {
		id,
		name,
		filename: parsed.filename,
		title: parsed.title,
		course: parsed.course,
		questions: parsed.questions.map((content, i) => ({
			...content,
			quizId: id,
			id: `${id}:${i + 1}`,
		})),
		history: [],
		attempt: null,
		addedAt,
	};
}

export function findQuiz(
	state: WorkspaceState,
	quizId: string,
): Quiz | undefined {
	return state.quizzes.find((quiz) => quiz.id === quizId);
}

function updateQuiz(
	state: WorkspaceState,
	quizId: string,
	change: (quiz: Quiz) => Quiz,
): WorkspaceState {
	return {
		...state,
		quizzes: state.quizzes.map((quiz) =>
			quiz.id === quizId ? change(quiz) : quiz,
		),
	};
}

function applyAttemptAction(quiz: Quiz, action: AttemptAction): Quiz {
	if (!quiz.attempt) return quiz;
	return { ...quiz, attempt: updateAttempt(quiz.attempt, action) };
}

export function workspaceReducer(
	state: WorkspaceState,
	action: WorkspaceAction,
): WorkspaceState {
	switch (action.type) {
		case "addQuizzes":
			return { ...state, quizzes: [...state.quizzes, ...action.quizzes] };
		case "startAttempt":
			return updateQuiz(state, action.quizId, (quiz) => ({
				...quiz,
				attempt: action.attempt,
			}));
		case "attempt":
			return updateQuiz(state, action.quizId, (quiz) =>
				applyAttemptAction(quiz, action.action),
			);
		case "replaceState":
			return action.state;
	}
}

// Where the play screen should send the learner. null means stay on play.
export function playRedirect(
	attempt: Attempt | null,
): "quiz" | "results" | null {
	if (!attempt) return "quiz";
	return attempt.status === "submitted" ? "results" : null;
}

// Where the results screen should send the learner. null means stay on results.
export function resultsRedirect(
	attempt: Attempt | null,
): "quiz" | "play" | null {
	if (!attempt) return "quiz";
	return attempt.status === "active" ? "play" : null;
}
