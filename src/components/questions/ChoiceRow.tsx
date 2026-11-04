import type { ReactNode } from "react";

const ROW_CLASS =
	"mb-[11px] flex cursor-pointer items-start gap-[13px] rounded-[9px] border border-line px-3 py-3.5 text-base leading-[1.6] [overflow-wrap:anywhere] phone:px-[18px] phone:py-4 has-[input:checked]:border-blue has-[input:checked]:bg-[#edf3ff] has-[input:checked]:shadow-[inset_3px_0_var(--color-blue)]";

const INPUT_CLASS = "mt-1 size-[18px] shrink-0 accent-blue";

type ChoiceRowProps = {
	type: "radio" | "checkbox";
	value: string;
	checked: boolean;
	letter: string;
	onChange: () => void;
	children: ReactNode;
};

export function ChoiceRow(props: ChoiceRowProps) {
	return (
		<label className={ROW_CLASS}>
			<input
				className={INPUT_CLASS}
				type={props.type}
				name="answer"
				value={props.value}
				checked={props.checked}
				onChange={props.onChange}
			/>
			<span className="min-w-4 text-xs leading-[26px] font-bold text-[#59718f]">
				{props.letter}
			</span>
			<span className="whitespace-pre-wrap">{props.children}</span>
		</label>
	);
}

export function letterFor(position: number): string {
	return String.fromCharCode(65 + position);
}
