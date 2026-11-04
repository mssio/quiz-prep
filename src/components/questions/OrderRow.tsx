import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MathText } from "#/components/MathText";

const ROW_CLASS =
	"relative mb-[9px] flex items-center gap-3 rounded-lg border bg-white p-3 shadow-[0_2px_5px_#17293f09]";
const IDLE_CLASS = "border-line";
const DRAGGING_CLASS =
	"z-10 border-dashed border-[#8daae7] bg-[#edf3ff] shadow-[0_4px_12px_#245ad72b]";

const HANDLE_CLASS =
	"min-h-11 min-w-11 shrink-0 cursor-grab touch-none rounded-[7px] border border-[#cbd5e3] bg-white text-[26px] leading-none text-[#415876] select-none hover:bg-[#edf3ff] hover:text-blue";

function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type OrderRowProps = {
	id: string;
	text: string;
	position: number;
	total: number;
};

export function OrderRow({ id, text, position, total }: OrderRowProps) {
	const sortable = useSortable({
		id,
		transition: prefersReducedMotion() ? null : undefined,
	});
	const style = {
		transform: CSS.Transform.toString(sortable.transform),
		transition: sortable.transition,
	};
	const state = sortable.isDragging ? DRAGGING_CLASS : IDLE_CLASS;

	return (
		<li
			ref={sortable.setNodeRef}
			style={style}
			className={`${ROW_CLASS} ${state}`}
		>
			<span className="rounded-[5px] border border-line bg-white px-[9px] py-[7px] text-xs text-muted">
				{position}
			</span>
			<span className="min-w-0 flex-1 leading-[1.5] break-words whitespace-pre-wrap">
				<MathText text={text} />
			</span>
			<button
				type="button"
				ref={sortable.setActivatorNodeRef}
				className={HANDLE_CLASS}
				aria-label={`Move ${text}, position ${position} of ${total}`}
				{...sortable.attributes}
				{...sortable.listeners}
			>
				⠿
			</button>
		</li>
	);
}
