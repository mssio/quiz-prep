import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Button, PageHeading, SummaryRow } from "#/components/ui";
import { STORAGE_KEY, type StorageLike } from "#/lib/storage";
import { useWorkspace, WorkspaceProvider } from "#/state/workspace";

function memory(value: string | null): StorageLike {
	return {
		getItem: () => value,
		setItem: () => {},
	};
}

function Probe() {
	const { state, saveOk, warning } = useWorkspace();
	return (
		<p>
			{state.quizzes.length} quizzes, saveOk={String(saveOk)}, warning=
			{warning}
		</p>
	);
}

function renderProbe(storage: StorageLike) {
	return renderToStaticMarkup(
		<WorkspaceProvider storage={storage}>
			<Probe />
		</WorkspaceProvider>,
	);
}

test("Button defaults to type button and applies the variant", () => {
	const html = renderToStaticMarkup(<Button variant="primary">Go</Button>);
	expect(html).toContain('type="button"');
	expect(html).toContain("Go");
	expect(html).toContain("bg-blue");
});

test("Button lets callers override the type", () => {
	const html = renderToStaticMarkup(
		<Button variant="secondary" type="submit" full>
			Send
		</Button>,
	);
	expect(html).toContain('type="submit"');
	expect(html).toContain("w-full");
});

test("PageHeading renders eyebrow, title and lede", () => {
	const html = renderToStaticMarkup(
		<PageHeading eyebrow="Study" title="Pick a quiz" lede="Start here." />,
	);
	expect(html).toContain("Study");
	expect(html).toContain("<h1");
	expect(html).toContain("Pick a quiz</h1>");
	expect(html).toContain("Start here.");
});

test("SummaryRow shows label and value", () => {
	const html = renderToStaticMarkup(<SummaryRow label="Files" value="3" />);
	expect(html).toContain("Files");
	expect(html).toContain("3");
});

test("provider starts empty when nothing is saved", () => {
	expect(renderProbe(memory(null))).toContain(
		"0 quizzes, saveOk=true, warning=</p>",
	);
});

test("provider starts empty and warns when the save is invalid", () => {
	const html = renderProbe(memory("not json"));
	expect(html).toContain("0 quizzes, saveOk=true");
	expect(html).toContain("Saved progress could not be restored");
});

test("provider restores a saved workspace", () => {
	const saved = JSON.stringify({ version: 1, state: { quizzes: [] } });
	expect(STORAGE_KEY).toBe("quiz-prep:v1");
	expect(renderProbe(memory(saved))).toContain("0 quizzes");
});
