import { type AttemptAction, updateAttempt } from "#/lib/attempt";
import { summarize } from "#/lib/grading";
import { historyEntryFor, quizStats } from "#/lib/history";
import { newId } from "#/lib/ids";
import type { ParsedFile } from "#/lib/parser";
import type { Attempt, Question, Quiz, WorkspaceState } from "#/lib/schema";

export type WorkspaceAction =
	| { type: "addQuizzes"; quizzes: Quiz[] }
	| { type: "startAttempt"; quizId: string; attempt: Attempt }
	| { type: "attempt"; quizId: string; action: AttemptAction }
	| { type: "renameQuiz"; quizId: string; name: string }
	| { type: "resetScores"; quizId: string }
	| { type: "deleteQuiz"; quizId: string }
	| { type: "resetEverything" }
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
		questions: parsed.questions.map((content) => ({
			...content,
			quizId: id,
			id: `${id}:${content.number}`,
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

// Records the attempt in history the moment it is finalized, and keeps that
// entry in step if a self-assessment changes afterwards.
function recordHistory(quiz: Quiz, before: Attempt, after: Attempt): Quiz {
	const wasFinal = summarize(before).finalized;
	if (!summarize(after).finalized) return quiz;
	const entry = historyEntryFor(after, quiz.questions.length);
	if (!entry) return quiz;
	if (!wasFinal) return { ...quiz, history: [...quiz.history, entry] };
	const exists = quiz.history.some((item) => item.id === entry.id);
	if (!exists) return quiz;
	return {
		...quiz,
		history: quiz.history.map((item) => (item.id === entry.id ? entry : item)),
	};
}

function applyAttemptAction(quiz: Quiz, action: AttemptAction): Quiz {
	if (!quiz.attempt) return quiz;
	const attempt = updateAttempt(quiz.attempt, action);
	return recordHistory({ ...quiz, attempt }, quiz.attempt, attempt);
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
		case "renameQuiz":
			if (!isValidName(action.name)) return state;
			return updateQuiz(state, action.quizId, (quiz) => ({
				...quiz,
				name: action.name.trim(),
			}));
		case "resetScores":
			return updateQuiz(state, action.quizId, (quiz) => ({
				...quiz,
				history: [],
			}));
		case "deleteQuiz":
			return {
				...state,
				quizzes: state.quizzes.filter((quiz) => quiz.id !== action.quizId),
			};
		case "resetEverything":
			return { ...state, quizzes: [] };
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

export type QuizStatus = "none" | "active" | "pending" | "submitted";

export function quizStatus(quiz: Quiz): QuizStatus {
	if (!quiz.attempt) return "none";
	if (quiz.attempt.status === "active") return "active";
	return summarize(quiz.attempt).finalized ? "submitted" : "pending";
}

export function sortedQuizzes(quizzes: Quiz[]): Quiz[] {
	return [...quizzes].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, {
			numeric: true,
			sensitivity: "base",
		}),
	);
}

export function totalAttempts(quizzes: Quiz[]): number {
	return quizzes.reduce(
		(sum, quiz) => sum + quizStats(quiz.history).attempts,
		0,
	);
}

export function isValidName(name: string): boolean {
	return name.trim() !== "";
}

// The source line under a question: its quiz's current name.
export function questionSource(question: Question, quizzes: Quiz[]): string {
	const quiz = quizzes.find((item) => item.id === question.quizId);
	return quiz ? quiz.name : "Question bank";
}
