import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { Button } from "#/components/ui";
import { HINT_CLASS } from "./fields";
import { OrderRow } from "./OrderRow";
import { asStringList, type QuestionProps } from "./types";

const HELP =
	"Drag the handles to arrange items. On a keyboard, focus a handle, press Space, move with ↑ and ↓, then press Space to drop.";

function startingOrder(props: QuestionProps<"ordering">): string[] {
	const saved = asStringList(props.response);
	if (saved.length > 0) return saved;
	return props.displayOrder.map(String);
}

export function Ordering(props: QuestionProps<"ordering">) {
	const { question, response, onAnswer } = props;
	const [order, setOrder] = useState(() => startingOrder(props));
	const [recorded, setRecorded] = useState(response !== undefined);
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function record(next: string[]) {
		onAnswer(next);
		setRecorded(true);
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (over === null || active.id === over.id) return;
		const next = arrayMove(
			order,
			order.indexOf(String(active.id)),
			order.indexOf(String(over.id)),
		);
		setOrder(next);
		record(next);
	}

	return (
		<>
			<p className={HINT_CLASS}>{HELP}</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
				accessibility={{ screenReaderInstructions: { draggable: HELP } }}
			>
				<SortableContext items={order} strategy={verticalListSortingStrategy}>
					<ol className="m-0 mb-4 list-none p-0">
						{order.map((id, index) => (
							<OrderRow
								key={id}
								id={id}
								text={question.items.find((i) => i.id === id)?.text ?? id}
								position={index + 1}
								total={order.length}
							/>
						))}
					</ol>
				</SortableContext>
			</DndContext>
			<Button variant="secondary" onClick={() => record([...order])}>
				Use this order
			</Button>
			<p
				className="mt-3 min-h-[18px] text-[13px] text-green"
				aria-live="polite"
			>
				{recorded ? "Order recorded." : ""}
			</p>
		</>
	);
}
