import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "text";

const BUTTON_BASE =
	"inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-[18px] py-3 text-sm leading-[1.3] font-semibold no-underline";

const BUTTON_VARIANTS: Record<Variant, string> = {
	primary: "bg-blue text-white enabled:hover:bg-[#1645b0]",
	secondary:
		"border border-[#cbd5e3] bg-white text-[#243b56] enabled:hover:bg-[#f1f5fb]",
	danger:
		"border border-[#e3b4ae] bg-[#ffedeb] text-[#a33b31] enabled:hover:bg-[#ffe0dc]",
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
		<section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_3px_8px_#182b4210]">
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
			<h2 className="text-[19px] leading-[1.4] tracking-[-0.35px]">{title}</h2>
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
			<p className="mb-3 text-xs font-bold tracking-[1.8px] text-blue uppercase">
				{eyebrow}
			</p>
			<h1 className="mb-3 text-[clamp(29px,3.5vw,40px)] leading-[1.15] font-bold tracking-[-1px] tablet:tracking-[-1.5px]">
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
		<div className="mb-[22px] flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-[#e9f1ff] px-5 py-4 text-[#254e92]">
			{children}
		</div>
	);
}

export function SectionLabel({ children }: { children: ReactNode }) {
	return (
		<span className="text-xs font-bold tracking-[1.4px] text-muted uppercase">
			{children}
		</span>
	);
}

export function CountPill({ children }: { children: ReactNode }) {
	return (
		<span className="rounded-md bg-[#edf2fa] px-[9px] py-1.5 text-xs font-semibold text-[#415876]">
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
			<strong className="font-semibold text-[#253d59]">{value}</strong>
		</div>
	);
}
