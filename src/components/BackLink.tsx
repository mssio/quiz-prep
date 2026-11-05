import { Link } from "@tanstack/react-router";

// The link back to a quiz's own page, shown above the play and results headings.
export function BackLink({ quizId }: { quizId: string }) {
	return (
		<Link
			to="/quizzes/$quizId"
			params={{ quizId }}
			className="mb-[17px] inline-block py-2 pr-2 pl-0 text-sm"
		>
			Back to quiz
		</Link>
	);
}
