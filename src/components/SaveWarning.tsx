import { useWorkspace } from "#/state/workspace";

export function SaveWarning() {
	const { warning } = useWorkspace();
	if (!warning) return null;
	return (
		<div
			role="alert"
			className="m-4 rounded-lg border border-[#e8ca91] bg-[#fff5df] px-4 py-3.5 text-sm leading-[1.6] text-[#73470f] phone:mx-auto phone:mt-5 phone:mb-0 phone:max-w-[1128px]"
		>
			{warning}
		</div>
	);
}
