import { countLabel as count } from "#/lib/formats";
import type { WorkspaceState } from "#/lib/schema";
import { totalAttempts } from "#/lib/workspace";

// Says what an import throws away and what takes its place.
export function importWarning(
	current: WorkspaceState,
	incomingCount: number,
): string {
	const quizzes = count(current.quizzes.length, "quiz", "quizzes");
	const attempts = count(
		totalAttempts(current.quizzes),
		"recorded attempt",
		"recorded attempts",
	);
	const incoming = count(incomingCount, "quiz", "quizzes");
	return `This replaces your ${quizzes}, ${attempts} and their saved answers with ${incoming} from this file. This can't be undone.`;
}
