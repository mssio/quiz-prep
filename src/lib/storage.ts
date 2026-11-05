import { backfillReviews } from "#/lib/history";
import { type WorkspaceState, workspaceStateSchema } from "#/lib/schema";

export const STORAGE_KEY = "quiz-prep:v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const SAVE_FAILED_MESSAGE =
	"Progress could not be saved in this browser. You can keep studying, but leave this tab open to keep your current answers.";
const LOAD_FAILED_MESSAGE =
	"Saved progress could not be restored. Import your files to start again; the previous save is unchanged until you make a new change.";

function blockedStorage(): StorageLike {
	return {
		getItem() {
			throw new Error("localStorage is blocked");
		},
		setItem() {
			throw new Error("localStorage is blocked");
		},
	};
}

export function browserStorage(): StorageLike {
	try {
		return window.localStorage;
	} catch {
		return blockedStorage();
	}
}

export function saveState(
	storage: StorageLike,
	state: WorkspaceState,
): { ok: boolean; message: string } {
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state }));
		return { ok: true, message: "" };
	} catch {
		return { ok: false, message: SAVE_FAILED_MESSAGE };
	}
}

function parseSavedState(raw: string): WorkspaceState {
	const envelope = JSON.parse(raw);
	if (envelope?.version !== 1) throw new Error("unknown version");
	return backfillReviews(workspaceStateSchema.parse(envelope.state));
}

export function loadState(storage: StorageLike): {
	state: WorkspaceState | null;
	message: string;
} {
	try {
		const raw = storage.getItem(STORAGE_KEY);
		if (raw === null) return { state: null, message: "" };
		return { state: parseSavedState(raw), message: "" };
	} catch {
		return { state: null, message: LOAD_FAILED_MESSAGE };
	}
}

export function storageStatus(saved: boolean): {
	library: string;
	session: string;
	results: string;
	note: string;
} {
	if (saved) {
		return {
			library: "Saved locally",
			session: "Take your time. Your answers are saved as you go.",
			results: "Your last quiz results are saved.",
			note: "Go at your own pace. Come back anytime.",
		};
	}
	return {
		library: "Not saved",
		session:
			"Your answers are not saved. Keep this tab open to keep your progress.",
		results: "These quiz results are not saved. Keep this tab open.",
		note: "Keep this tab open. Progress cannot be saved.",
	};
}
