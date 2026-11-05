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
	checkboxLabel?: string;
};

type ConfirmChoice = { confirmed: boolean; checked: boolean };

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

type ChoiceOptions = ConfirmOptions & { checkboxLabel: string };
type ConfirmChoiceFn = (options: ChoiceOptions) => Promise<ConfirmChoice>;

const ConfirmContext = createContext<ConfirmChoiceFn | null>(null);

export function useConfirmChoice(): ConfirmChoiceFn {
	const confirm = useContext(ConfirmContext);
	if (!confirm) throw new Error("useConfirmChoice needs a ConfirmProvider");
	return confirm;
}

export function useConfirm(): Confirm {
	const choice = useConfirmChoice();
	return useCallback(
		async (options) => (await choice(options as ChoiceOptions)).confirmed,
		[choice],
	);
}

export function ConfirmBody({
	options,
	checked,
	onCheckedChange,
}: {
	options: ConfirmOptions | null;
	checked: boolean;
	onCheckedChange(checked: boolean): void;
}) {
	return (
		<>
			<h2 className="text-[19px] font-bold leading-[1.4] tracking-[-0.35px]">
				{options?.title}
			</h2>
			<p className="my-4 leading-[1.7] text-muted">{options?.copy}</p>
			{options?.checkboxLabel && (
				<label className="mb-4 flex min-h-11 items-center gap-3 text-navy">
					<input
						type="checkbox"
						checked={checked}
						onChange={(event) => onCheckedChange(event.target.checked)}
						className="size-5 shrink-0"
					/>
					<span>{options.checkboxLabel}</span>
				</label>
			)}
		</>
	);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [options, setOptions] = useState<ConfirmOptions | null>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const resolveRef = useRef<((answer: ConfirmChoice) => void) | null>(null);
	const checkedRef = useRef(true);
	const [checked, setChecked] = useState(true);

	const confirm = useCallback<ConfirmChoiceFn>((next) => {
		resolveRef.current?.({ confirmed: false, checked: false });
		return new Promise<ConfirmChoice>((resolve) => {
			resolveRef.current = resolve;
			checkedRef.current = true;
			setChecked(true);
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
		resolveRef.current?.({ confirmed, checked: checkedRef.current });
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
					<ConfirmBody
						options={options}
						checked={checked}
						onCheckedChange={(value) => {
							checkedRef.current = value;
							setChecked(value);
						}}
					/>
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
