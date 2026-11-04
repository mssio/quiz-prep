import {
	createRootRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ConfirmProvider } from "#/components/ConfirmDialog";
import { SaveWarning } from "#/components/SaveWarning";
import { useFocusMain } from "#/components/useFocusMain";
import { WorkspaceProvider } from "#/state/workspace";

import "../styles.css";

export const Route = createRootRoute({
	component: RootComponent,
});

function TopBar() {
	return (
		<header className="flex min-h-[75px] items-center justify-between gap-5 bg-navy p-5 text-white phone:min-h-[88px] phone:px-[25px] tablet:px-[max(5vw,24px)]">
			<div className="flex items-center gap-[13px] text-lg tracking-[-0.3px] tablet:text-xl">
				<span className="relative pr-2 text-[31px] leading-none font-extrabold">
					Q
					<span className="absolute -top-[7px] right-0 text-[22px] text-[#e6bd55]">
						•
					</span>
				</span>
				<span>
					Quiz <strong className="font-semibold">Prep</strong>
				</span>
			</div>
			<div className="flex items-center gap-[9px] text-sm text-[#d8e2ef]">
				<span aria-hidden="true" className="text-[23px] text-[#e6bd55]">
					◈
				</span>
				<span className="hidden phone:inline">
					Your browser. Your progress.
				</span>
			</div>
		</header>
	);
}

function Footer() {
	return (
		<footer className="mx-auto flex max-w-[1192px] flex-col justify-between gap-2 border-t border-line px-4 py-5 text-xs text-muted phone:flex-row phone:gap-5 phone:px-8 phone:py-[22px]">
			<span>Made for focused practice.</span>
			<span>Files and answers stay in this browser.</span>
		</footer>
	);
}

function FocusMainOnNavigate() {
	const focusMain = useFocusMain();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const previous = useRef(pathname);

	useEffect(() => {
		if (previous.current === pathname) return;
		previous.current = pathname;
		focusMain();
	}, [pathname, focusMain]);

	return null;
}

function RootComponent() {
	return (
		<WorkspaceProvider>
			<ConfirmProvider>
				<a
					href="#main"
					className="absolute top-[-60px] left-[15px] z-10 bg-white p-3 focus:top-3"
				>
					Skip to workspace
				</a>
				<FocusMainOnNavigate />
				<TopBar />
				<SaveWarning />
				<main
					id="main"
					tabIndex={-1}
					className="mx-auto min-h-[calc(100vh-155px)] max-w-[1192px] px-4 pt-[30px] pb-10 phone:px-6 phone:pt-[35px] phone:pb-[45px] tablet:px-8 tablet:pt-[50px] tablet:pb-16 wide:pt-[65px]"
				>
					<Outlet />
				</main>
				<Footer />
			</ConfirmProvider>
		</WorkspaceProvider>
	);
}
