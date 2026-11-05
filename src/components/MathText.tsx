import katex from "katex";
import "katex/dist/katex.min.css";
import { splitMath } from "#/lib/math-text";

export function renderMath(tex: string, display: boolean): string {
	return katex.renderToString(tex, {
		displayMode: display,
		trust: false,
		strict: "ignore",
		throwOnError: false,
		maxSize: 20,
	});
}

export function MathText({ text }: { text: string }) {
	const parts = splitMath(text);
	return (
		<>
			{parts.map((part, index) => {
				const key = `${index}-${part.kind}`;
				if (part.kind === "text") return <span key={key}>{part.text}</span>;
				const html = renderMath(part.tex, part.display);
				return (
					<span
						key={key}
						className={
							part.display
								? "block overflow-x-auto"
								: "inline-block max-w-[calc(100%+0.3em)] overflow-x-auto overflow-y-hidden px-[0.15em] -mx-[0.15em] py-[0.3em] -my-[0.3em] align-middle"
						}
						// biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output for math the tokenizer found; trust is off and plain text stays escaped.
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				);
			})}
		</>
	);
}
