import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/quizzes/$quizId/results")({
	component: Results,
});

// Stub. The results screen replaces it later.
function Results() {
	return (
		<Link to="/" className="text-sm">
			Question banks
		</Link>
	);
}
