import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "text";

const BUTTON_BASE =
	"inline-flex min-h-11 items-center justify-center gap-2 text-sm leading-[1.3] font-[650] no-underline";

const BOXED = "rounded-lg px-[18px] py-3";

const BUTTON_VARIANTS: Record<Variant, string> = {
	primary: `${BOXED} bg-accent text-on-accent enabled:hover:bg-accent-hover`,
	secondary: `${BOXED} border border-edge bg-surface text-strong enabled:hover:bg-hover`,
	danger: `${BOXED} border border-danger-border bg-danger-bg text-danger-text enabled:hover:bg-danger-hover`,
	text: "rounded-[5px] bg-transparent p-2 text-blue",
};

export function Button({
	variant,
	full = false,
	type = "button",
	className = "",
	...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	variant: Variant;
	full?: boolean;
}) {
	const width = full ? "w-full" : "";
	return (
		<button
			type={type}
			className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${width} ${className}`}
			{...rest}
		/>
	);
}

export function Panel({ children }: { children: ReactNode }) {
	return (
		<section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_3px_8px_var(--color-shadow-soft)]">
			{children}
		</section>
	);
}

export function PanelHeading({
	title,
	children,
}: {
	title: string;
	children?: ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-line px-5 py-5 phone:px-7 phone:py-[23px]">
			<h2 className="text-[19px] font-bold leading-[1.4] tracking-[-0.35px]">
				{title}
			</h2>
			{children}
		</div>
	);
}

export function PanelBody({ children }: { children: ReactNode }) {
	return (
		<div className="px-[18px] py-[22px] phone:p-[22px] tablet:p-7">
			{children}
		</div>
	);
}

export function PageHeading({
	eyebrow,
	title,
	lede,
}: {
	eyebrow: string;
	title: string;
	lede: string;
}) {
	return (
		<div className="mb-[30px]">
			<p className="mb-3 text-xs font-[750] tracking-[1.8px] text-blue uppercase">
				{eyebrow}
			</p>
			<h1 className="mb-3 text-[clamp(29px,3.5vw,40px)] leading-[1.15] font-[750] tracking-[-1px] tablet:tracking-[-1.5px]">
				{title}
			</h1>
			<p className="text-base leading-[1.7] text-muted">{lede}</p>
		</div>
	);
}

export function WorkspaceGrid({
	main,
	aside,
}: {
	main: ReactNode;
	aside: ReactNode;
}) {
	return (
		<div className="grid items-start gap-6 phone:grid-cols-[minmax(0,1fr)_250px] phone:gap-[17px] tablet:grid-cols-[minmax(0,1fr)_302px] tablet:gap-6">
			<div className="min-w-0">{main}</div>
			<aside>{aside}</aside>
		</div>
	);
}

export function Notice({ children }: { children: ReactNode }) {
	return (
		<div className="mb-[22px] flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-info-bg px-5 py-4 text-info-text">
			{children}
		</div>
	);
}

export function SectionLabel({ children }: { children: ReactNode }) {
	return (
		<span className="text-xs font-[750] tracking-[1.4px] text-muted uppercase">
			{children}
		</span>
	);
}

export function CountPill({ children }: { children: ReactNode }) {
	return (
		<span className="rounded-md bg-chip px-[9px] py-1.5 text-xs font-[650] text-slate">
			{children}
		</span>
	);
}

export function SummaryRow({
	label,
	value,
}: {
	label: string;
	value: ReactNode;
}) {
	return (
		<div className="mb-[13px] flex justify-between gap-2.5 text-sm leading-[1.6] text-muted">
			<span>{label}</span>
			<strong className="font-semibold text-strong">{value}</strong>
		</div>
	);
}
