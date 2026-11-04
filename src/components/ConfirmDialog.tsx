import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/ui";

export type ConfirmOptions = {
	title: string;
	copy: string;
	actionText: string;
	cancelText?: string;
};

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function useConfirm(): Confirm {
	const confirm = useContext(ConfirmContext);
	if (!confirm) throw new Error("useConfirm needs a ConfirmProvider");
	return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [options, setOptions] = useState<ConfirmOptions | null>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const resolveRef = useRef<((answer: boolean) => void) | null>(null);

	const confirm = useCallback<Confirm>((next) => {
		resolveRef.current?.(false);
		return new Promise<boolean>((resolve) => {
			resolveRef.current = resolve;
			setOptions({ ...next });
		});
	}, []);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!options || !dialog || dialog.open) return;
		dialog.returnValue = "";
		dialog.showModal();
	}, [options]);

	function handleClose() {
		const confirmed = dialogRef.current?.returnValue === "confirm";
		resolveRef.current?.(confirmed);
		resolveRef.current = null;
	}

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			<dialog
				ref={dialogRef}
				onClose={handleClose}
				className="m-auto w-[calc(100%-32px)] max-w-[470px] rounded-[14px] border border-line p-7 text-navy shadow-[0_20px_100px_#12243b44] backdrop:bg-[#0b1b32aa]"
			>
				<form method="dialog">
					<h2 className="text-[19px] font-bold leading-[1.4] tracking-[-0.35px]">
						{options?.title}
					</h2>
					<p className="my-4 leading-[1.7] text-muted">{options?.copy}</p>
					<div className="flex flex-wrap justify-end gap-2.5">
						<Button variant="secondary" type="submit" value="cancel">
							{options?.cancelText ?? "Keep studying"}
						</Button>
						<Button variant="primary" type="submit" value="confirm">
							{options?.actionText}
						</Button>
					</div>
				</form>
			</dialog>
		</ConfirmContext.Provider>
	);
}
