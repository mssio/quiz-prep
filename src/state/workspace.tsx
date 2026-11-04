import {
	createContext,
	type Dispatch,
	type ReactNode,
	useContext,
	useEffect,
	useReducer,
	useRef,
	useState,
} from "react";
import type { WorkspaceState } from "#/lib/schema";
import {
	browserStorage,
	loadState,
	STORAGE_KEY,
	type StorageLike,
	saveState,
} from "#/lib/storage";
import { type WorkspaceAction, workspaceReducer } from "#/lib/workspace";

type WorkspaceValue = {
	state: WorkspaceState;
	dispatch: Dispatch<WorkspaceAction>;
	saveOk: boolean;
	warning: string;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

const EMPTY_STATE: WorkspaceState = { quizzes: [] };

export function useWorkspace(): WorkspaceValue {
	const value = useContext(WorkspaceContext);
	if (!value) throw new Error("useWorkspace needs a WorkspaceProvider");
	return value;
}

export function WorkspaceProvider({
	children,
	storage,
}: {
	children: ReactNode;
	storage?: StorageLike;
}) {
	const [store] = useState(() => storage ?? browserStorage());
	const [loaded] = useState(() => loadState(store));
	const [state, dispatch] = useReducer(
		workspaceReducer,
		loaded.state ?? EMPTY_STATE,
	);
	const [saveOk, setSaveOk] = useState(true);
	const [warning, setWarning] = useState(loaded.message);
	// The state object that is already in storage, so we never write it back.
	const lastSynced = useRef(state);

	useEffect(() => {
		if (state === lastSynced.current) return;
		lastSynced.current = state;
		const result = saveState(store, state);
		setSaveOk(result.ok);
		setWarning(result.message);
	}, [state, store]);

	useEffect(() => {
		function onStorage(event: StorageEvent) {
			if (event.key !== STORAGE_KEY) return;
			const fresh = loadState(store);
			if (!fresh.state) return;
			lastSynced.current = fresh.state;
			dispatch({ type: "replaceState", state: fresh.state });
		}
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, [store]);

	return (
		<WorkspaceContext.Provider value={{ state, dispatch, saveOk, warning }}>
			{children}
		</WorkspaceContext.Provider>
	);
}
