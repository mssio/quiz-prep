import { Link } from "@tanstack/react-router";
import { PageHeading } from "#/components/ui";

export function NotFound() {
	return (
		<>
			<PageHeading
				eyebrow="NOT FOUND"
				title="That page doesn't exist."
				lede="The link may be old, or the quiz may have been deleted."
			/>
			<Link to="/" className="inline-block py-2 text-sm">
				Back to question banks
			</Link>
		</>
	);
}
