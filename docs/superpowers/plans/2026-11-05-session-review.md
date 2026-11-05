# Past Session Review and Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save every finished session's answers, and let the learner open a read-only review of any session from a score history that groups retries under their original session. Add light and dark mode across the whole app.

**Architecture:** History entries gain two defaulted fields, `review` and `retryOf`, so old saves load unchanged. Questions are read from the quiz, not copied. A new route renders a session through the existing review components in a read-only mode. Export carries history optionally, keyed by question number so it survives the new ids that import assigns. Themes move every colour into tokens in `src/styles.css`, which dark mode overrides under `:root[data-theme="dark"]`.

**Tech Stack:** React 19, TanStack Router file routes, zod 4, Vitest, Biome, Bun.

**Spec:** `docs/superpowers/specs/2026-11-05-session-review-design.md`

## Model assignments

The owner asked for each task to use the cheapest model that can do it safely. Pass the model to the `Agent` tool's `model` parameter.

| Task | Implementer | Why |
| --- | --- | --- |
| 1. Data model and recording | `opus` | Touches the save format. A mistake here can lose the owner's data |
| 2. Reset and delete | `haiku` | One small reducer change, plus exact copy from the spec |
| 3. Export and import logic | `opus` | Id remapping and strict validation, with subtle failure modes |
| 4. Export and import dialogs | `sonnet` | Ordinary UI work against a fixed interface |
| 5. Grouped history list | `sonnet` | One pure function and a table change |
| 6. Past session page | `sonnet` | A new route built from existing components |
| 7. Colour tokens and dark palette | `sonnet` | A wide but pattern-based sweep, and a test enforces the result |
| 8. Theme choice | `sonnet` | Small, well-defined logic and one control |
| 9. README and final checks | `haiku` | Exact docs edits and running commands |

**Reviewers:** use `sonnet` for the per-task review of Tasks 2, 4, 5, 6, 7, 8 and 9, and `opus` for Tasks 1 and 3. Use `opus` for the final whole-branch review. If a `haiku` task fails its review twice, redo it on `sonnet`.

## Global Constraints

- Work on a branch named `session-review`, never on `main`.
- An existing save must load unchanged: same key `quiz-prep:v1`, same envelope `version: 1`, and no step that can fail the load.
- Best, Average, Attempts and "Total attempts" must not change. Retries stay excluded.
- Every existing export file must still import.
- No new dependencies. No network requests.
- Light mode must look the same as today. Tasks 7 and 8 run after the feature tasks, so their sweep covers the new UI too.
- Pure logic goes in `src/lib/`, with no React imports. zod schemas are the source of types.
- Every task finishes with `bun run test`, `bun run typecheck` and `bun run check` all passing. `tsconfig.json` includes tests, so fixtures must typecheck too.
- Every new or changed screen works at 360px wide with no sideways page scroll. New controls are at least 44px tall.
- **Phone-width checks:** start `bun run dev` in the background, open `http://localhost:3000` with `preview_open`, set the width with `preview_resize`, and close the tab when done. To prove there's no sideways scroll, confirm with `preview_evaluate` that `document.documentElement.scrollWidth <= window.innerWidth`. If an implementer can't reach these tools, it says so, and the controller runs the check before review.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Two tabs open:** another tab's save triggers `loadState` again. Backfill must give the same result each time and never overwrite newer data. Test in Task 1.
2. **A save whose review names a question the quiz lacks:** it must load, and the page must skip that question, not crash. Test in Task 6.
3. **A retry finished after its original was reset:** it shows as a top-level row. Test in Task 5.
4. **Questions left unanswered:** they show "Not answered" in the review, not a blank or a crash. Test in Task 6.
5. **Storage blocked or holding a junk theme value:** the app follows the device and the control still works, with no crash before first paint. Test in Task 8.

---

### Task 1: Data model and recording

**Model:** `opus`

**Files:**
- Modify: `src/lib/schema.ts`, `src/lib/attempt.ts`, `src/lib/history.ts`, `src/lib/storage.ts`
- Modify fixtures so they typecheck: `tests/history.test.ts`, `tests/transfer.test.ts`, `tests/import-copy.test.ts`, and any other test that builds a `HistoryEntry` or `Attempt` literal
- Test: `tests/history.test.ts`, `tests/storage.test.ts`, `tests/workspace.test.ts`

**Interfaces:**
- Produces in `schema.ts`: `sessionReviewSchema` and type `SessionReview = { order: string[]; responses: Record<string, ResponseValue>; assessments: Record<string, boolean>; flags: Record<string, boolean> }`
- Produces on `HistoryEntry`: `review: SessionReview | null` and `retryOf: string | null`, both `.nullable().default(null)`
- Produces on `Attempt`: `retryOf: string | null`, `.nullable().default(null)`
- Produces in `attempt.ts`: `AttemptOptions` gains `retryOf?: string | null`
- Produces in `history.ts`: `reviewOf(attempt: Attempt): SessionReview` and `backfillReviews(state: WorkspaceState): WorkspaceState`

- [ ] **Step 1: Create the branch and commit the docs**

```bash
git switch -c session-review
git add README.md docs
git commit -m "docs: add explanation instructions and session review design"
```

- [ ] **Step 2: Write the failing tests**

```ts
// tests/storage.test.ts
test("a save from before session review loads with default fields", () => {
	// Build a saved state, then delete review/retryOf from each history entry
	// and retryOf from the attempt, as an old save would have.
	const { state } = loadState(storageWith(oldSave));
	expect(state?.quizzes[0].history[0].review).toBeNull();
	expect(state?.quizzes[0].history[0].retryOf).toBeNull();
	expect(quizStats(state!.quizzes[0].history)).toEqual(statsBefore);
});

test("loading backfills the latest finalized attempt only", () => {
	// Two history entries, attempt.id matches the second.
	const { state } = loadState(storageWith(oldSave));
	expect(state?.quizzes[0].history[0].review).toBeNull();
	expect(state?.quizzes[0].history[1].review?.responses).toEqual(attempt.responses);
});

test("backfill gives the same result when run twice", () => {
	const once = backfillReviews(state);
	expect(backfillReviews(once)).toEqual(once);
});

test("backfill keeps a review that already exists", () => {
	// Entry's review differs from the attempt: it must stay as it is.
});

// tests/history.test.ts
test("a finalized attempt's entry carries its answers and retry link", () => {
	const entry = historyEntryFor(finalizedRetry, 5);
	expect(entry?.review?.order).toEqual(finalizedRetry.order);
	expect(entry?.review?.responses).toEqual(finalizedRetry.responses);
	expect(entry?.review?.flags).toEqual(finalizedRetry.flags);
	expect(entry?.retryOf).toBe("original");
});

// tests/quiz.test.ts or tests/history.test.ts
test("a retry links to its source, and a retry of a retry to the original", () => {
	const first = retryMissed(finalized);
	expect(first?.retryOf).toBe(finalized.id);
	const second = retryMissed(finalizedVersionOf(first));
	expect(second?.retryOf).toBe(finalized.id);
});

// tests/workspace.test.ts
test("changing a self-assessment updates the saved answers", () => {
	// Finalize with assessment true, then assess false.
	expect(next.quizzes[0].history[0].review?.assessments["q:1"]).toBe(false);
});

test("an all-unknown session records no entry", () => {
	expect(next.quizzes[0].history).toEqual([]);
});
```

- [ ] **Step 3: Run them to confirm they fail**

Run: `bun run test tests/history.test.ts tests/storage.test.ts tests/workspace.test.ts`
Expected: FAIL on the new tests, because `review` and `retryOf` don't exist.

- [ ] **Step 4: Implement**

- `schema.ts`: add the schema and fields above. Add no refinement that ties a review to quiz questions, because a load must not fail on it.
- `attempt.ts`: `createAttempt` writes `retryOf` from its options, default `null`. `retryMissed` passes `retryOf: attempt.retryOf ?? attempt.id`.
- `history.ts`: `reviewOf` deep-copies `order`, `responses`, `assessments` and `flags`. `historyEntryFor` sets `review: reviewOf(attempt)` and `retryOf: attempt.retryOf`.
- `history.ts`: `backfillReviews` handles each quiz whose `attempt` is finalized and has a history entry with the same id and `review === null`. It sets only `review`, and returns the same quiz object when nothing changes.
- `storage.ts`: in `parseSavedState`, return `backfillReviews(workspaceStateSchema.parse(envelope.state))`.
- `recordHistory` in `workspace.ts` needs no change, because it replaces the whole entry.

- [ ] **Step 5: Update fixtures, then run everything**

Add `review: null, retryOf: null` to `HistoryEntry` literals and `retryOf: null` to `Attempt` literals.

Run: `bun run test && bun run typecheck && bun run check`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: save each session's answers and link retries to their session"
```

---

### Task 2: Reset and delete

**Model:** `haiku`

**Files:**
- Modify: `src/lib/workspace.ts`, `src/components/quizzes/useResetScores.ts`, `src/routes/index.tsx:97-110`, `src/components/quizzes/LibrarySidebar.tsx:34`, `src/lib/import-copy.ts`
- Test: `tests/workspace.test.ts`, `tests/import-copy.test.ts`

**Interfaces:**
- Consumes: `Attempt.status`. Produces nothing new.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/workspace.test.ts
test("reset scores clears a submitted attempt", () => {
	const next = workspaceReducer(submittedState, { type: "resetScores", quizId });
	expect(next.quizzes[0].history).toEqual([]);
	expect(next.quizzes[0].attempt).toBeNull();
});

test("reset scores clears an attempt waiting for self-assessment", () => {
	// Submitted short-answer attempt, not yet assessed.
	expect(next.quizzes[0].attempt).toBeNull();
});

test("reset scores keeps an unfinished session", () => {
	const next = workspaceReducer(activeState, { type: "resetScores", quizId });
	expect(next.quizzes[0].attempt).toBe(activeState.quizzes[0].attempt);
});

// tests/import-copy.test.ts
expect(importWarning(state, 6)).toBe(
	"This replaces your 4 quizzes, 10 recorded attempts and their saved answers with 6 quizzes from this file. This can't be undone.",
);
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `bun run test tests/workspace.test.ts tests/import-copy.test.ts`
Expected: FAIL on the submitted-attempt tests and the new warning copy.

- [ ] **Step 3: Implement**

- `resetScores` reducer: also set `attempt` to `quiz.attempt?.status === "active" ? quiz.attempt : null`.
- `importWarning`: match the copy in the test, keeping the existing singular and plural handling.
- Replace copy exactly, where `NAME` is `${quiz.name}`:

| Where | Copy |
| --- | --- |
| `useResetScores.ts` | `This clears the score history and saved answers for "NAME", including your latest results. This can't be undone.` |
| `routes/index.tsx`, delete | `This removes "NAME", its score history, saved answers and any unfinished session. This can't be undone.` |
| `routes/index.tsx`, reset everything | `This removes every quiz, all score history and saved answers, and every unfinished session in this browser. This can't be undone.` |
| `LibrarySidebar.tsx` | `Deletes all quizzes, score history and saved answers in this browser.` |

- [ ] **Step 4: Run everything**

Run: `bun run test && bun run typecheck && bun run check`
Expected: all pass. If the existing test at `tests/workspace.test.ts:291` used a submitted attempt, change it to an active one.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: reset and delete erase saved answers, with clearer warnings"
```

---

### Task 3: Export and import logic

**Model:** `opus`

**Files:**
- Create: `src/lib/transfer-history.ts`
- Modify: `src/lib/transfer.ts`, `src/lib/attempt-checks.ts`
- Test: `tests/transfer.test.ts`

**Interfaces:**
- Consumes: `HistoryEntry`, `SessionReview` from Task 1
- Produces in `attempt-checks.ts`: `responseFits(question: QuestionContent, response: unknown): boolean`, which is `hasRightKind` exported under this name
- Produces in `transfer-history.ts`: `exportHistoryEntrySchema`, `toExportHistory(quiz: Quiz)`, `fromExportHistory(history, quizId: string): HistoryEntry[]`, and `checkExportHistory(questions: QuestionContent[], history): string | null`
- Produces in `transfer.ts`:
  - `buildExport(state, exportedAt, includeHistory = false)`
  - `quizzesFromExport(quizzes, addedAt, includeHistory = false)`
  - `exportHasHistory(quizzes: ExportQuiz[]): boolean`

**Format decisions:**
- `ExportQuiz` gains an optional `history`. Leave the key out entirely when not included, so the output stays identical to today's. `version` stays `1`.
- Inside an exported review, `order` and all record keys use `String(question.number)`, not the question id. Choice ids don't contain the quiz id, so `responses` values stay as they are.
- Entry ids and `retryOf` are kept as they are. Import replaces everything, so they can't collide.

- [ ] **Step 1: Write the failing tests**

```ts
test("export without history has no history key", () => {
	expect(serializeExport(buildExport(state, NOW))).not.toContain("history");
});

test("round trip keeps entries, answers and retry links under new ids", () => {
	const text = serializeExport(buildExport(stateWithReview, NOW, true));
	const [quiz] = quizzesFromExport(okQuizzes(parseExport(text)), NOW, true);
	const [entry, retry] = quiz.history;
	expect(entry.percentage).toBe(original.percentage);
	expect(entry.submittedAt).toBe(original.submittedAt);
	expect(entry.review?.order).toEqual(quiz.questions.slice(0, 2).map((q) => q.id));
	expect(entry.review?.responses[quiz.questions[0].id]).toEqual(originalResponse);
	expect(retry.retryOf).toBe(entry.id);
	expect(quizStats(quiz.history)).toEqual(quizStats(source.history));
});

test("unticked import drops history from a file that has it", () => {
	const quizzes = quizzesFromExport(okQuizzes(parseExport(text)), NOW, false);
	expect(quizzes[0].history).toEqual([]);
});

test("exportHasHistory is false for old files and empty history", () => {});

test.each([
	["a question the quiz lacks", (r) => r.order.push("999")],
	["a repeated question", (r) => r.order.push(r.order[0])],
	["a key outside the order", (r) => (r.flags["999"] = true)],
	["a response of the wrong kind", (r) => (r.responses[r.order[0]] = 5)],
])("history with %s is rejected as damaged", (_name, damage) => {
	expect(parseExport(damaged(damage)).ok).toBe(false);
});

test("repeated entry ids are rejected as damaged", () => {});

test("retryOf naming a missing session is accepted", () => {
	expect(parseExport(fileWithRetryOf("missing")).ok).toBe(true);
});
```

Change the existing test at `tests/transfer.test.ts:123`, which expects a smuggled `history: [{ id: "fake" }]` to be ignored. It's now malformed history, so assert that `parseExport` returns `ok: false`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `bun run test tests/transfer.test.ts`
Expected: FAIL on the new tests.

- [ ] **Step 3: Implement**

- `attempt-checks.ts`: widen the parameter of `hasRightKind` to `QuestionContent` and export it as `responseFits`. Only `format` and choices are read.
- `transfer-history.ts`: implement the interfaces above. `checkExportHistory` returns a message if entry ids repeat, `order` repeats or names an unknown number, a record key isn't in `order`, or a response fails `responseFits`.
- `transfer.ts`: call `checkExportHistory` from `exportQuizSchema`'s `superRefine`, so damaged history gives the existing `BAD_FILE_MESSAGE`. `quizzesFromExport` calls `createQuiz`, then sets `history` from `fromExportHistory` when `includeHistory` is true.

- [ ] **Step 4: Run everything**

Run: `bun run test && bun run typecheck && bun run check`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat: carry score history and saved answers through export and import"
```

---

### Task 4: Export and import dialogs

**Model:** `sonnet`

**Files:**
- Modify: `src/components/ConfirmDialog.tsx`, `src/components/quizzes/TransferButtons.tsx`
- Test: `tests/ui.test.tsx`

**Interfaces:**
- Consumes: `buildExport`, `quizzesFromExport`, `exportHasHistory` from Task 3
- Produces in `ConfirmDialog.tsx`: `useConfirmChoice(): (options: ConfirmOptions & { checkboxLabel: string }) => Promise<{ confirmed: boolean; checked: boolean }>`. The checkbox starts ticked. `useConfirm` stays as it is.

- [ ] **Step 1: Write the failing test**

Add a test that renders the dialog's content and asserts that the checkbox and label appear only when `checkboxLabel` is set. Extract a small `ConfirmBody` component if the `<dialog>` can't render under `renderToStaticMarkup`.

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test tests/ui.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the dialog and wire it up**

In `TransferButtons.tsx`:

- **Export:** if no quiz has history, download at once with no history, as today. Otherwise call `useConfirmChoice` with the values below, then download with `checked` as `includeHistory`.
  - Title: `Export quizzes`
  - Copy: `Score history includes your saved answers from past sessions.`
  - Action: `Export`
  - Cancel: `Cancel`
  - Checkbox: `Include score history`
- **Import:** if `exportHasHistory(parsed.quizzes)`, use `useConfirmChoice` with the existing title, copy and buttons, plus checkbox `Include score history`, and pass `checked` to `quizzesFromExport`. Otherwise keep the existing `confirm` call.

- [ ] **Step 4: Run everything**

Run: `bun run test && bun run typecheck && bun run check`
Expected: all pass.

- [ ] **Step 5: Check the dialogs at phone width**

At 360px, open the Export dialog, and the Import dialog with a file that has history. Confirm the checkbox and both buttons are visible and reachable, and nothing overflows.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: add include score history option to export and import"
```

---

### Task 5: Grouped history list

**Model:** `sonnet`

**Files:**
- Modify: `src/lib/history.ts`, `src/components/quizzes/HistoryTable.tsx`, `src/routes/quizzes/$quizId/index.tsx`
- Test: `tests/history.test.ts`, `tests/ui.test.tsx`

**Interfaces:**
- Consumes: `HistoryEntry.retryOf` and `.review` from Task 1
- Produces in `history.ts`:
  - `type SessionGroup = { entry: HistoryEntry; retries: HistoryEntry[] }`
  - `groupHistory(history: HistoryEntry[]): SessionGroup[]`
  - `formatSessionDate(iso: string): string`, moved from `HistoryTable.tsx`
- Produces on `HistoryTable`: a new prop `reviewLink(entry: HistoryEntry): ReactNode`, so the table renders without a router in tests

- [ ] **Step 1: Write the failing tests**

```ts
test("sessions are newest first, with retries under them oldest first", () => {
	const groups = groupHistory([old, parent, retry2, retry1]);
	expect(groups.map((g) => g.entry.id)).toEqual([parent.id, old.id]);
	expect(groups[0].retries.map((r) => r.id)).toEqual([retry1.id, retry2.id]);
});

test("a retry with no original in the history is its own group", () => {
	const groups = groupHistory([e(50, { id: "r", isRetry: true, retryOf: "gone" })]);
	expect(groups).toEqual([{ entry: expect.objectContaining({ id: "r" }), retries: [] }]);
});

test("an old retry with no link stays a top-level row", () => {});

// tests/ui.test.tsx
test("only rows with saved answers get a Review link", () => {
	const html = renderToStaticMarkup(
		<HistoryTable history={[withReview, withoutReview]} reviewLink={() => <a href="#x">Review</a>} />,
	);
	expect(html.match(/Review/g)).toHaveLength(1);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `bun run test tests/history.test.ts tests/ui.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `HistoryTable` renders `groupHistory(history)`: each group's row, then its retries, always visible, with `↳` and a left indent on the date cell.
- Add a fourth, unlabelled column. It calls `reviewLink(entry)` only when `entry.review !== null`.
- Keep the "Retry missed" tag and bar colour.
- At phone width, if the columns don't fit, move the tag under the question count, and keep the indent and a Review link on every row.
- `HistoryPanel` passes `reviewLink={() => null}` for now, because the route doesn't exist yet. Task 6 replaces it with the real `Link`.

- [ ] **Step 4: Run everything**

Run: `bun run test && bun run typecheck && bun run check`
Expected: all pass.

- [ ] **Step 5: Check the table at phone width**

At 360px, with a session and two retries in the history, confirm there's no sideways page scroll. The Review link will appear in Task 6, so recheck it there.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: group retries under their session in score history"
```

---

### Task 6: Past session page

**Model:** `sonnet`

**Files:**
- Create: `src/routes/quizzes/$quizId/sessions/$sessionId.tsx`, `src/components/results/OptionList.tsx`
- Modify: `src/lib/history.ts`, `src/lib/grading.ts`, `src/components/results/ReviewItem.tsx`, `src/components/results/ReviewList.tsx`, `src/routes/quizzes/$quizId/index.tsx`, `src/routeTree.gen.ts` (generated)
- Test: `tests/history.test.ts`, `tests/results.test.tsx`

**Interfaces:**
- Consumes: `formatSessionDate` from Task 5, `SessionReview` from Task 1
- Produces in `history.ts`:
  - `type SessionView = Pick<Attempt, "questions" | "order" | "responses" | "assessments" | "flags" | "status">`
  - `sessionView(quiz: Quiz, sessionId: string): { entry: HistoryEntry; view: SessionView } | null`
- Changes: `summarize` accepts `Pick<Attempt, "questions" | "responses" | "assessments" | "status">`. `ReviewItem` and `ReviewList` take a `SessionView` instead of an `Attempt`, plus `readOnly?: boolean`, and `onAssess` becomes optional.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/history.test.ts
test("sessionView returns null for an unknown session or one with no answers", () => {
	expect(sessionView(quiz, "missing")).toBeNull();
	expect(sessionView(quiz, entryWithoutReview.id)).toBeNull();
});

test("sessionView keeps the order shown and skips a question the quiz lacks", () => {
	const result = sessionView(quizWithReviewOrder(["q:2", "q:404", "q:1"]), "s1");
	expect(result?.view.order).toEqual(["q:2", "q:1"]);
	expect(result?.view.questions.map((q) => q.id)).toEqual(["q:2", "q:1"]);
	expect(result?.view.status).toBe("submitted");
});

// tests/results.test.tsx
test("a read-only item starts open, even when correct", () => {
	expect(readOnlyReview(correctQuestion)).toContain("<details open");
});

test("a read-only short answer shows its assessment with no way to change it", () => {
	const html = readOnlyReview(assessedShortAnswer);
	expect(html).toContain("Incorrect");
	expect(html).not.toContain("<button");
});

test("an unanswered question shows Not answered", () => {
	expect(readOnlyReview(unanswered)).toContain("Not answered");
});

test("choice questions list every option in file order with word markers", () => {
	const html = review(singleChoice, wrongOptionId);
	expect(optionTexts(html)).toEqual(singleChoice.options.map((o) => o.text));
	expect(html).toContain("Your answer");
	expect(html).toContain("Correct");
});

test("a picked correct option carries both markers", () => {});

test("other formats have no option list", () => {
	expect(review(trueFalse, true)).not.toContain('data-testid="option-list"');
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `bun run test tests/history.test.ts tests/results.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `sessionView`: find the entry, and return `null` if it's missing or `review` is `null`. Keep only the ids in `review.order` that are in `quiz.questions`, and set `status: "submitted"`.
- `ReviewItem`: `open` starts as `readOnly || grade.status === "pending"`. Show `Assessment` only when not `readOnly`.
- `OptionList({ question, response })`: for `single-choice` and `multi-select` only, a list with `data-testid="option-list"` under an "Options" label, placed before "Your answer". It shows every option in `question.options` order, without letters, through `MathText`, with the text markers "Your answer" and "Correct". `ReviewItem` renders it in both modes, so the results screen gains it too. Handle `question.answer === null` by showing no "Correct" marker.
- The route: if the quiz is missing, `<Navigate to="/" replace />`. If `sessionView` returns `null`, navigate to `/quizzes/$quizId`, replacing history.
- The page renders `BackLink`, then `PageHeading` with title `Session from ${formatSessionDate(entry.submittedAt)}`, or `Retry from …` when `entry.isRetry`. Then `ResultHero summary={summarize(view)}` and `ReviewList` with `readOnly`. It renders no retry button.
- In `HistoryPanel`, replace the placeholder with `reviewLink={(entry) => <Link to="/quizzes/$quizId/sessions/$sessionId" params={{ quizId: quiz.id, sessionId: entry.id }}>Review</Link>}`.
- Run `bun run build` to regenerate `src/routeTree.gen.ts`.

- [ ] **Step 4: Run everything**

Run: `bun run test && bun run typecheck && bun run check && bun run build`
Expected: all pass.

- [ ] **Step 5: Check it in the running app**

Run `bun run dev`. Upload `tests/fixtures/all-formats.md`, finish a session with a wrong answer, then retry it. Confirm that the retry sits under its session, both Review links open the right answers with everything expanded, and reloading a review page works.

Then repeat at 360px. Confirm Review links are at least 44px tall and on every row, and there's no sideways page scroll on the history table or the review page. Use a question with a long answer, math and a matching list.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: add read-only past session review page"
```

---

### Task 7: Colour tokens and dark palette

**Model:** `sonnet`

**Files:**
- Modify: `src/styles.css` and every file in `src/` with a raw colour (about 23 files)
- Create test: `tests/theme-colours.test.ts`

**Interfaces:**
- Produces: colour tokens in `@theme`, overridden under `:root[data-theme="dark"]`, and `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` for rare exceptions
- Produces: dark styles switched by `document.documentElement.dataset.theme = "dark"`, which Task 8 sets

- [ ] **Step 1: Write the failing test**

```ts
// tests/theme-colours.test.ts reads the files from disk.
test("components use tokens, not raw colours", () => {
	// Every .tsx under src/, except routeTree.gen.ts.
	expect(filesMatching(/#[0-9a-fA-F]{3,8}\b|\b(bg|text|border)-(white|black)\b/)).toEqual([]);
});

test.each(["light", "dark"])("text meets 4.5:1 in %s mode", (mode) => {
	// Parse token values from styles.css. PAIRS lists each text token with
	// each background it appears on, including every status badge.
	for (const [text, background] of PAIRS) {
		expect(contrast(tokens(mode)[text], tokens(mode)[background])).toBeGreaterThanOrEqual(4.5);
	}
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test tests/theme-colours.test.ts`
Expected: FAIL, listing the files with raw colours.

- [ ] **Step 3: Add the tokens and dark values to `src/styles.css`**

- Group tokens by role: page, surface, raised surface, border, text, muted text, accent and its hover, top bar, focus ring, and a background and text pair for each status (success, danger, warning, neutral).
- Keep the existing names (`navy`, `blue`, `line`, `muted`, `green`, `amber`) where they fit, and split `navy` if it's used as both a background and text.
- Light values are today's hex values. Merge only shades that can't be told apart.
- Dark values are a dark navy, not pure black. The top bar stays navy, and the gold accent stays.
- Set `color-scheme: light` on `:root`, and `color-scheme: dark` under the dark selector.
- Move hard-coded colours in the base layer to tokens, including `:root`'s text and background.
- Use a plain `@theme` block, not `@theme inline`, so utilities read the variables at runtime.

- [ ] **Step 4: Replace raw colours in components**

Work through the files in the test's output. Also cover shadows, the dialog's background and backdrop (a `<dialog>` needs an explicit background), inline `style` colours, the `ScoreBar` track, and drag states in `OrderRow.tsx`. Update any existing tests that assert a raw colour class.

- [ ] **Step 5: Run everything**

Run: `bun run test && bun run typecheck && bun run check && bun run build`
Expected: all pass.

- [ ] **Step 6: Compare both modes in the running app**

Run `bun run dev`. Compare light mode with `main` on the quiz list, quiz page, play, results and past session screens. Then set `data-theme="dark"` on `<html>` in dev tools and check the same screens, plus a dialog, a focused control, a math question and a dragged ordering item.

Repeat the dark mode pass at 360px, because phone layouts use some different classes.

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "feat: move colours to tokens and add a dark palette"
```

---

### Task 8: Theme choice

**Model:** `sonnet`

**Files:**
- Create: `src/lib/theme.ts`, `src/components/useTheme.ts`, `src/components/ThemeSelect.tsx`
- Modify: `index.html`, `src/routes/__root.tsx`
- Test: `tests/theme.test.ts`

**Interfaces:**
- Consumes: `StorageLike` and `browserStorage` from `src/lib/storage.ts`, and the `data-theme` contract from Task 7
- Produces in `theme.ts`:
  - `THEME_KEY = "quiz-prep:theme"`
  - `type ThemeChoice = "system" | "light" | "dark"`
  - `loadTheme(storage: StorageLike): ThemeChoice`
  - `saveTheme(storage: StorageLike, choice: ThemeChoice): void`
  - `resolveTheme(choice: ThemeChoice, prefersDark: boolean): "light" | "dark"`
- Produces in `useTheme.ts`: `useTheme(): { choice: ThemeChoice; setChoice(next: ThemeChoice): void }`

- [ ] **Step 1: Write the failing tests**

```ts
test("the default is system, and junk values fall back to it", () => {
	expect(loadTheme(storageWith(null))).toBe("system");
	expect(loadTheme(storageWith("purple"))).toBe("system");
});

test("blocked storage neither throws nor loses the fallback", () => {
	expect(loadTheme(blocked)).toBe("system");
	expect(() => saveTheme(blocked, "dark")).not.toThrow();
});

test("a saved choice loads back", () => {});

test("system follows the device, and a fixed choice ignores it", () => {
	expect(resolveTheme("system", true)).toBe("dark");
	expect(resolveTheme("system", false)).toBe("light");
	expect(resolveTheme("light", true)).toBe("light");
});

test("the script in index.html reads the same key", () => {
	expect(readFileSync("index.html", "utf8")).toContain(THEME_KEY);
});

test("workspace reset and export leave the theme alone", () => {
	// serializeExport output has no theme, and STORAGE_KEY differs from THEME_KEY.
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `bun run test tests/theme.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `theme.ts`: wrap storage reads and writes in `try`/`catch`.
- `index.html`: add an inline script in `<head>`, before the stylesheet and module script. Inside `try`/`catch`, it reads `quiz-prep:theme`, resolves it with `matchMedia("(prefers-color-scheme: dark)")`, and sets `document.documentElement.dataset.theme`. On failure it uses the device setting if it can, otherwise light.
- `useTheme.ts`: hold the choice in state, and on change set `dataset.theme` and update the `theme-color` meta tag. Listen for `matchMedia` changes while the choice is `system`, and for `storage` events on `THEME_KEY` so other tabs follow.
- `ThemeSelect.tsx`: a native `<select>` with `aria-label="Theme"` and options System, Light and Dark, styled for the top bar.
- `__root.tsx`: add `ThemeSelect` to `TopBar`. It must be at least 44px tall.

- [ ] **Step 4: Run everything**

Run: `bun run test && bun run typecheck && bun run check && bun run build`
Expected: all pass.

- [ ] **Step 5: Check it in the running app**

Run `bun run dev`. Confirm that all three choices work, a reload in dark mode shows no light flash, changing the device setting updates System live, a second tab follows, and Reset everything keeps the choice.

At 360px, confirm that the logo and theme control both fit in the top bar in both themes, with no sideways page scroll.

- [ ] **Step 6: Commit**

```bash
git add index.html src tests
git commit -m "feat: add system, light and dark theme choice"
```

---

### Task 9: README and final checks

**Model:** `haiku`

**Files:**
- Modify: `README.md`

**Interfaces:** None.

- [ ] **Step 1: Update `README.md`**

- In the first section's feature list, add "a review of every past session".
- In the first section, add: `It follows your device's light or dark setting, or you can choose one from the top bar.`
- In "Grading and storage", add: `Each finished session keeps your answers, so you can review it from the score history. Retries are grouped under the session they came from, and each has its own review. A session with no answer keys isn't recorded. Sessions finished before this feature have no saved answers, apart from the latest one on each quiz.`
- Replace the **Export** bullet's "It has no score history and no unfinished sessions." with `If you have score history, a checkbox lets you include it, with your saved answers. Unfinished sessions are never included.`
- Replace the **Import** bullet's "Imported quizzes start with no scores." with `If the file has score history, a checkbox lets you restore it. Otherwise imported quizzes start with no scores.`

- [ ] **Step 2: Run the full check**

Run: `bun run test && bun run typecheck && bun run check && bun run build`
Expected: all pass.

- [ ] **Step 3: Sweep every screen at phone width**

At 360px, in both themes, visit the quiz list, quiz page, play, results and past session screens, and open a dialog. On each, confirm the no-sideways-scroll check passes.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe session review, history export and themes"
```

- [ ] **Step 5: Ask the owner for the real phone check**

This step can't be done by an agent. Ask the owner to try the history table, a past session and both themes on their phone, and report anything wrong. Run `bun run dev --host` for them. WSL may block the phone from reaching it, in which case they can check `quiz.mss.io` after the branch is merged and deployed.
