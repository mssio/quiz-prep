import { useConfirm } from "#/components/ConfirmDialog";
import type { Quiz } from "#/lib/schema";
import { useWorkspace } from "#/state/workspace";

// Asks before clearing one quiz's score history. Shared by the quiz list and
// the quiz page so both use the same wording.
export function useResetScores(): (quiz: Quiz) => Promise<void> {
	const { dispatch } = useWorkspace();
	const confirm = useConfirm();

	return async function resetScores(quiz) {
		const ok = await confirm({
			title: "Reset scores?",
			copy: `This clears the score history and saved answers for "${quiz.name}", including your latest results. This can't be undone.`,
			actionText: "Reset scores",
			cancelText: "Cancel",
		});
		if (ok) dispatch({ type: "resetScores", quizId: quiz.id });
	};
}
