import { isAnswered } from "#/lib/grading";
import type { Attempt } from "#/lib/schema";

// A whole number from 1 to max, or null when the text is anything else.
export function parseCount(value: string, max: number): number | null {
	if (!/^\d+$/.test(value.trim())) return null;
	const count = Number(value);
	if (count < 1 || count > max) return null;
	return count;
}

const REPLACE_COPY =
	"This replaces the saved attempt and its answers. Your questions and score history will stay.";

// The Start-confirm text. A pending attempt has a score that is not recorded yet.
export function replaceCopy(pending: boolean): string {
	if (pending) return `${REPLACE_COPY} The pending score will be lost.`;
	return REPLACE_COPY;
}

// The Finish-confirm text: what is still open before answers lock.
export function finishCopy(attempt: Attempt): string {
	const unanswered = attempt.questions.filter(
		(q) => !isAnswered(q, attempt.responses[q.id]),
	).length;
	const flagged = Object.values(attempt.flags).filter(Boolean).length;
	return `${unanswered} unanswered · ${flagged} flagged for review. Once submitted, your answers are locked and your results are revealed.`;
}
