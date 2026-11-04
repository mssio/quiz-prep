import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/quizzes/$quizId/")({
	component: () => <Navigate to="/" />,
});
