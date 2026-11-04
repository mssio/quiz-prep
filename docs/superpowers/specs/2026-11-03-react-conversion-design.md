# Quiz Workspace: React conversion + quiz management — design

Date: 2026-11-03 (updated 2026-11-04)
Status: awaiting owner approval

## Intent

`.private/gpt-generated/` holds a working quiz site that GPT wrote as about 540 lines of dense, hand-built vanilla JavaScript (`dist/js/*.js`, `dist/styles.css`, `dist/index.html`). It works, but it's hard to read and hard to change.

This project does two things:

1. **Converts** the site into this repo's stack (Bun + Vite + React 19 + TanStack Router + Tailwind 4, already scaffolded) so it is **easy to read and maintain**. The quiz-taking experience behaves and looks the same.
2. **Adds quiz management**, as the owner asked:
   - each uploaded file becomes a named quiz that you can rename
   - all quizzes are kept in local storage
   - a quiz list page shows each quiz's score history, average and best score
   - there are buttons to delete a quiz, reset one quiz's scores, and reset everything
   - quizzes can be exported to one file and imported by someone else, which replaces their data

Today the site merges every uploaded file into one pool and forgets your score as soon as you start again. The new version lets the owner keep a set of chapter quizzes and see whether they're improving.

## Goals

- Quiz-taking (question formats, grading, flags, results review, short-answer self-assessment, retry missed) works the same as the old site.
- The Markdown format and import rules are unchanged. A file that imports today imports in the new app with the same questions, and a file that's rejected today is rejected with the same messages.
- Quiz management works as described in "Quiz management".
- The code is TypeScript, split into small files that each do one clear job. A reader can find "how is matching graded?" or "what does the ordering question look like?" by file name.
- The pure logic (parsing, grading, attempts, history stats, storage) is kept separate from React and covered by tests.
- The example banks in `.private/example-input/` import with the same question counts as today.
- The look stays close to the old site. The owner asked to "keep the design similar to the current GPT quiz page".

## Non-goals (this phase)

- **Practising several quizzes mixed together.** It's planned for a later phase, and this design must not make it harder (see "Future phase").
- Changes to the Markdown format or new question formats.
- Accounts, syncing, a server, analytics, or any network request.
- Choosing a host or deploying. The owner will put the site on a new host, not the old OpenAI Sites location, and hasn't picked one yet.
- Carrying over progress saved by the old site.
- Matching the old ordering question's exact keyboard and tap interactions (see "Ordering question").
- Undo for delete or reset.

## Anti-goals (failures even if the app "works")

- A question bank that imports today is rejected, or a question is graded differently.
- An invalid file that is rejected today is accepted.
- Retry attempts change a quiz's best or average score.
- Reset scores on one quiz touches any other quiz.
- Imported text is rendered as HTML. It must stay plain text. React's default escaping already handles this, so never use `dangerouslySetInnerHTML`.
- The new code is as dense or clever as the old code. Readability is the point.

## Constraints

- The stack already in the repo: Vite 8, React 19, TanStack Router (file-based routes in `src/routes/`, with a generated `routeTree.gen.ts`), Tailwind 4, Biome, Bun. The import alias `#/*` → `src/*`.
- `.private/` is gitignored. Anything tests need (such as fixtures) has to be copied into the repo.
- Client-only SPA, no SSR.
- Everything persists in `localStorage`, which allows about 5 MB per origin. The largest example bank is about 20 KB, so dozens of quizzes fit easily. A failed save shows a warning, as it does today (see "Storage").

## Source material

| Old file | What it does | Lines |
|---|---|---|
| `dist/js/parser.js` | Parses the Markdown question format, computes a SHA-256 file id, merges banks and detects duplicates | 117 |
| `dist/js/quiz.js` | Creates an attempt (random pick + shuffles); handles answer/flag/navigate/submit/assess; grading, summary, retry missed | 66 |
| `dist/js/storage.js` | Validates, saves and loads `localStorage` state; save-status wording | 56 |
| `dist/js/questions.js` | Renders each question format's inputs | 31 |
| `dist/js/ordering.js` | Ordering question: drag handles, tap-to-move, ↑/↓ keys, FLIP animation, reduced motion | 188 |
| `dist/js/results.js` | Results hero, stats, review list, short-answer self-assessment | 34 |
| `dist/js/app.js` | Screen switching, library screen, quiz screen, confirm dialog, file import | 50 |
| `dist/styles.css` | All styling (about 14 KB, minified, plain CSS with 6 colour variables) | — |
| `tests/*.test.mjs` + `tests/fixtures/*.md` | `node --test` suites for the parser, quiz, storage and review fixes | ~150 |

The old `README.md` documents the Markdown format, grading rules and storage. Together with the code, it's the behaviour spec.

Approved mockups are in `.superpowers/brainstorm/*/content/quiz-list.html`, which is gitignored and local only. The owner picked **option A (rows)** for the quiz list. Screens 2 (naming step) and 3 (quiz page) were shown and not objected to.

## Decisions

### Packages (decided with the owner)

The old site has **zero** dependencies. A hand-written part is replaced only where a library clearly helps readability.

| Replace | With |
|---|---|
| `el()`/`button()` DOM builders + manual `render()` | React components |
| `ordering.js` drag/keyboard/animation code | `@dnd-kit/core` + `@dnd-kit/sortable` (+ `@dnd-kit/utilities`) |
| `storage.js` hand-written validation | `zod` schemas |
| `styles.css` | Tailwind classes. The 6 old colour variables become `@theme` tokens. |
| `node --test` | `vitest` |

These stay hand-written: the Markdown parser (it's specific to this format), the Fisher–Yates shuffle, and the native `<dialog>` used for confirmations. `crypto.randomUUID()` is used for ids. No other packages.

### Look

Keep the old site's visual design: the navy top bar with the "Q•" brand, page headings with an eyebrow/title/lede, white panels on the light grey background, the two-column workspace with a sidebar (it stacks below 690px), the same button styles, colours, breakpoints and focus outline. The old `dist/styles.css` is the reference. New screens reuse the same building blocks, as the mockups show. New wording follows the old tone, which is short, calm and encouraging.

### Routing (decided with the owner)

TanStack Router, with normal browser history and clean paths. Any static host needs a "serve `index.html` for every path" fallback so that refreshing a deep link works. The README gets a short note about this, but no particular host is set up.

| Route | Screen | Guard |
|---|---|---|
| `/` | Quiz list (layout A: rows) | none |
| `/quizzes/$quizId` | One quiz: score history + "Your next session" start panel | unknown quiz → `/` |
| `/quizzes/$quizId/play` | Taking the quiz (the old quiz screen) | no active attempt → `/quizzes/$quizId` |
| `/quizzes/$quizId/results` | Results of the quiz's last submitted attempt (the old results screen) | no submitted attempt → `/quizzes/$quizId` |

No loaders and no search params. The current question index stays in the attempt state, as it does today, and isn't put in the URL.

### Ordering question (decided by the owner)

Use dnd-kit's standard interactions: drag by a handle with mouse or touch, and dnd-kit's built-in keyboard sensor (Space to pick up, arrows to move, Space to drop, Escape to cancel) with its own screen-reader announcements. Drop these old features: the direct ↑/↓/Home/End moves, tapping one item and then another to move it, the custom `aria-live` messages, and the tilted drag ghost.

Keep everything that affects grading or meaning:
- The list starts in the shuffled display order.
- An untouched list counts as **unanswered**.
- A "Use this order" button records the current order as the answer, and so does any move.
- Position numbers are shown.
- `prefers-reduced-motion` is respected.

### Phasing (my call)

Build it in two phases, so that "nothing broke" can be checked before new features go on top:

1. **Logic + quiz-taking.** The `lib/` modules (parser, grading, attempts, storage schemas) and their tests, including the ported old tests and the example-file counts. Then the play and results screens, the question components and the shared layout. Don't rebuild the old combined "library" screen, because phase 2 replaces it. During phase 1, a minimal temporary page that loads one file and starts it is enough for checking things by hand.
2. **Quiz management.** The quiz list, the naming step, the quiz page with history, rename, delete, reset scores, reset everything, and recording history.

## Quiz management

### Adding quizzes

- The upload box on the quiz list takes **several `.md` files at once**, chosen with the file picker or dropped onto it. **Each file becomes one quiz.**
- After files are chosen, a **naming step** (mockup screen 2) lists every file:
  - A valid file shows a name field, pre-filled with the file's `#` title (or the filename when there's no title), plus the filename and question count.
  - An invalid file shows its error list, using the same messages as today, and is marked as skipped.
  - The buttons are **Cancel** and **Add N quizzes**, where N is the number of valid files. The add button is disabled when N = 0 or when any name is blank.
  - A non-`.md` file appears as invalid, with "Choose a Markdown (.md) file."
- **Duplicates are allowed.** The same file can be added twice, for example under a different name with its own history. This drops the old "Already imported" check and the merging of identical content.

### Quiz list (`/`, layout A)

- **Each quiz row** shows the MD icon, the name, "N questions · course" (or the filename when there's no course), **Best**, **Average**, **Attempts**, and four buttons:
  - **Start**, or **Resume** when the quiz has an unfinished session.
  - **Rename**, inline in the row. The name can't be blank, and names don't have to be unique.
  - **Reset scores**, which clears **this quiz's** history only.
  - **Delete**, which removes this quiz, its history and its unfinished session.
- Clicking the quiz name opens `/quizzes/$quizId`. "Start" also goes there, and the session is started from that quiz's page. "Resume" goes straight to `/quizzes/$quizId/play`.
- Quizzes are **listed by name**, A–Z (decided by the owner). The sort ignores case and treats numbers as numbers, so "Ch 2" comes before "Ch 10" (`localeCompare` with `numeric: true`, `sensitivity: 'base'`). A renamed quiz moves to its new place.
- When there are no quizzes, there's an empty state that points to the upload box.
- **The sidebar** has the upload box, a few totals (quizzes, total attempts, whether progress is saved), **Export** and **Import** (see "Export and import"), and **Reset everything**, which removes every quiz, all history and every unfinished session.
- Delete, Reset scores and Reset everything each ask for confirmation in the same `<dialog>` style the old site uses, and say that it can't be undone.
- Stats show "—" when a quiz has no counted attempts.

### Quiz page (`/quizzes/$quizId`, mockup screen 3)

- A back link to "All quizzes", and a heading with the quiz name, question count and course.
- The left panel is **Score history**:
  - Best, Average and Attempts at the top.
  - A list of finished attempts, newest first, showing date and time, "n of N questions", and the score, with a small bar.
  - Retries carry a "Retry missed" tag.
  - A note says that retries aren't counted.
  - There's a **Reset scores** button for this quiz.
- The right panel is the old "Your next session" sidebar: the number of questions (1 up to the quiz's question count, with the old validation and wording), shuffled order and choices, and **Start quiz**. If the quiz has an unfinished session, a notice offers **Resume** and says that starting a new one replaces it. Starting a new session asks for confirmation, as it does today.
- If the quiz has a submitted attempt, there's a link to view its results.

### Score history rules (decided with the owner)

- An attempt goes into history once, at the moment it is **finalised**: it has been submitted and has no short-answer questions waiting for self-assessment. If assessments are pending, the attempt is recorded when the last one is made.
- Each entry records the date and time, the number of questions in the attempt, the quiz's total question count, correct answers, number of gradable questions, the percentage, and whether it was a retry.
- **Best** and **Average** use non-retry attempts only. Shorter sessions, such as 5 of 83 questions, count normally. Average is the mean of the attempts' percentages. **Attempts** counts non-retry attempts.
- An attempt with no gradable questions (every answer is `unknown`) has no percentage. *(My call: it isn't recorded in history.)*
- **Retry missed** works the same as today. Its attempt belongs to the same quiz and is marked as a retry.

### Unfinished sessions

- Each quiz has **at most one attempt**, which is either active or the last submitted one. Different quizzes can each have their own unfinished session.
- When a session is submitted, it stays as the quiz's attempt so its results can be reviewed and missed questions retried, until a new session is started.
- A submitted attempt that still has **self-assessments pending** also counts as unfinished, because its score isn't in the history yet. *(My call.)* Its row and quiz page show **Finish assessing** where Resume would normally appear, and it links to `/quizzes/$quizId/results`. Starting a new session over it asks for confirmation, just as it does over an active one. The confirmation says that the pending score will be lost.
- A history entry's date is **when the attempt was submitted**, not when it was finalised. *(My call.)*
- **Reset scores** keeps the quiz's attempt. *(My call: an unfinished session is progress, not a score.)* **Delete** and **Reset everything** remove it.
- The quiz list has **no global "You have a saved session" notice**. It was in the mockup only because it was copied from the old page. Each row's Resume / Finish assessing button covers this, even when several quizzes are unfinished. *(My call.)* The old `storageStatus().resume` wording is dropped. The rest of `storageStatus` stays.

### Export and import (decided with the owner)

The app is for study material and test preparation, and people share quiz sets with each other this way.

- **Export** downloads **one JSON text file** containing every quiz's name, filename, `#` title, course, and questions with their answer keys. It contains **only questions and answer keys**: no score history and no unfinished sessions. Export is disabled when there are no quizzes. *(My call: JSON rather than a zip, which would need another package and add nothing for small text data.)*
- The file has a small header, for example `{format: 'quiz-workspace-export', version: 1, exportedAt, quizzes: [...]}`, and has its own `zod` schema.
- **Import** is a separate button from the upload box:
  - **Upload** adds Markdown files as new quizzes through the naming step.
  - **Import** takes an export file and **replaces the entire database**: all quizzes, history and unfinished sessions. Quiz names come from the file, so there's no naming step.
- The file is fully validated before anything changes. A damaged file, or one that isn't an export file, is rejected with a clear message and existing data stays untouched.
- A valid file then needs confirmation, in the same `<dialog>` style, stating what will be lost and what replaces it, for example "This replaces your 4 quizzes and 10 recorded attempts with 6 quizzes from this file. This can't be undone."
- Imported quizzes get fresh quiz ids and question ids and start with empty history. *(My call.)*
- Importing a file is treated as loading data, never as code. Text stays plain text, as with Markdown files.

Merging an import into existing quizzes is out of scope, and could come in a later phase.

## Data shape (decided with the owner)

Progress saved by the old site doesn't need to carry over, so the data is redesigned to be readable rather than copied.

- **One type per question format.** This is a TypeScript discriminated union on `format`, and each type has only the fields its format uses:
  - single-choice and multi-select have `options`
  - matching has `left` and `right`
  - ordering has `items`
  - true-false, fill-in-blank and short-answer have none of these lists

  Each format's `answer` (`null` when the file says `unknown`) and its response type fit the format. For example, a matching answer is a map from left id to right id.
- Every question has the common fields `id`, `quizId`, `number`, `prompt` and `explanation`. The old `sourceTitle` field is dropped. The source line ("<name> · Q3") on the quiz and results screens shows the quiz's **current name**, looked up by `quizId`, so a rename shows everywhere. *(My call.)* The attempt lives inside its quiz, so the lookup always succeeds. The old test "source label survives removal of its bank" becomes a test that the source line follows a rename.
- **A quiz** has `id` (`crypto.randomUUID()`), `name`, `filename`, `title` (the `#` title), `course`, `questions`, `history`, `attempt | null` and `addedAt`.
- **Ids:**
  - A question's id is `<quizId>:<number>`. Ids have to be unique across all quizzes so a future mixed attempt works, and a content hash no longer guarantees that because duplicates are allowed.
  - The SHA-256 content id is dropped.
- **Attempts** keep the old structure: the questions snapshot, order, display orders, responses, flags, current index, status and assessments. They also gain `isRetry`.
- **Storage:** the `localStorage` key is `quiz-workspace:v2`, in the envelope `{version: 2, state: {quizzes}}`.
  - The `zod` schemas are the single source of truth. The TypeScript types are inferred from them with `z.infer`.
  - The schemas also check that the data is consistent: answers refer to options that exist, responses belong to questions in the attempt, and so on. That covers everything the old `storage.js` checked.

## Behaviour to preserve

These come from the old code and must not change.

**Markdown format and parsing.** This works exactly as in `parser.js` and the old README:
- questions are `## Q<n>` blocks made of `- **Field:** value` lines
- fenced code is kept verbatim inside fields
- a BOM is stripped and CRLF is normalised
- the level-one `#` title falls back to the filename, and `**Course:**` metadata is read
- the seven formats keep their answer syntaxes
- an `unknown` answer makes the question unscored
- any error rejects the whole file, with messages of the form `<filename>: Q<n>: <message>` (same wording)
- a question number repeated within a file is rejected
- a non-`.md` file is rejected with "Choose a Markdown (.md) file."

The **only** intended changes are the ones already listed: duplicate files are allowed, ids are no longer derived from content, and the source line uses the quiz name.

**Attempts:**
- Pick `count` questions at random from the quiz (1 up to the quiz's question count).
- Shuffle the question order and each question's choices: true/false, options, the right column of a matching question, and ordering items.
- Track responses, flags and the current index.
- Submitting locks the answers.
- Short-answer self-assessment is only possible after submitting.
- Retry missed creates a new attempt from the incorrect questions, and only once the summary is final, with no assessments pending.
- Finishing asks for confirmation and shows the unanswered and flagged counts.

**Grading:**
- One point per fully correct question.
- Multi-select, blanks, matching and ordering are all-or-nothing.
- Blank answers are compared ignoring case and with whitespace collapsed.
- An unanswered gradable question counts as incorrect.
- A short answer stays pending until it is assessed.
- A percentage is given only when the result is final and there is at least one gradable question.

**Storage:**
- Saves on every change.
- If `localStorage` is unavailable or a save fails, show the same warning and "Not saved" wording (`storageStatus`) and keep working in memory.
- If saved data is invalid, show the "could not be restored" warning and start empty, and don't overwrite the save until the next change.

**Quiz and results screens.** These keep the same copy and controls as today.

The quiz screen has:
- a back link, which now goes to the quiz page
- "Question n of N", the format tag and the flag toggle
- the source line and the answer inputs for each format
- Previous, Next and "Review & finish" buttons
- a sidebar with the answered count, progress bar, question navigator (showing answered, flagged and current), legend and save label

The results screen has:
- the score disc
- the eyebrow, heading and copy variants
- four stat boxes
- retry and back actions; "back" now goes to the quiz page
- a collapsible review list showing your answer, the correct or model answer, and the explanation
- self-assessment buttons
- pending items open by default

**Accessibility.** These details carry over:
- a skip link
- `aria-pressed` on toggles and `aria-current` on the current navigator button
- focus moves to `<main>` and the page scrolls to the top when the screen changes
- focus returns to the flag or assessment button after toggling
- `prefers-reduced-motion` is respected

## Future phase: mixed practice (not in this phase)

The owner wants to practise several quizzes mixed together later. This phase keeps that open in three ways:
- question ids are unique across quizzes
- every question knows its `quizId`
- grading and attempt logic work on a list of questions, not on a quiz

Where a mixed attempt is stored and how its score is recorded will be decided then.

## Proposed structure (builder may adjust)

```
src/
  lib/                     # no React imports
    schema.ts              # zod schemas + inferred types (Question union, Quiz, Attempt, HistoryEntry, State)
    parser.ts              # parseQuizFile()
    attempt.ts             # createAttempt(), updateAttempt(), retryMissed()
    grading.ts             # isAnswered(), gradeQuestion(), summarize()
    history.ts             # historyEntryFor(), quizStats() (best/average/attempts, retries excluded)
    storage.ts             # loadState(), saveState(), storageStatus()
    shuffle.ts
    formats.ts             # format names / labels
  state/
    workspace.tsx          # React context + reducer wrapping lib/, persists on change
  components/
    questions/             # one component per format
      SingleChoice.tsx  MultiSelect.tsx  TrueFalse.tsx  FillInBlank.tsx
      ShortAnswer.tsx   Matching.tsx     Ordering.tsx
      QuestionView.tsx     # picks the right one
    quizzes/               # QuizRow, AddQuizzes (upload + naming step), HistoryTable, ...
    ConfirmDialog.tsx  SaveWarning.tsx  Layout pieces ...
  routes/
    __root.tsx  index.tsx
    quizzes/$quizId/index.tsx  play.tsx  results.tsx
tests/
  fixtures/                # old GPT fixtures
  fixtures/examples/       # .private/example-input
```

For state, a single React context with a reducer is enough. No state library.

## Tests and definition of done

- **Ported tests.** Port the old test files to Vitest against the new `lib/` modules.
  - Behaviour assertions stay the same: accept/reject decisions and their messages, grading, summaries and retry.
  - Data-shape assertions are updated to the new shape.
  - Tests of the dropped behaviour (deduplicating identical content, content-hash ids) are removed, and the removal is noted in the commit.
- **Fixtures.** Copy `.private/gpt-generated/tests/fixtures/*.md` into `tests/fixtures/`, and `.private/example-input/*.md` into `tests/fixtures/examples/`. They need separate folders because both contain a `ch-1-test.md`.
  - *(My call:)* convert all fixtures to LF line endings and pin that with `.gitattributes`. The old fixtures are CRLF, which makes 3 of the old 32 tests fail today, because the tests do string replacements that assume `\n`. CRLF parsing is still covered by a test that builds its own CRLF input.
- **Example files.** A test checks that each example file imports with no errors and the right count: `ch-1-test.md` 10, `ch-2-test.md` 10, `ch-3-test.md` 7, `chapter-1-questions-x-100.md` 83.
- **New logic tests:**
  - history is recorded once, when the attempt is finalised, including after the last pending self-assessment
  - retries are excluded from best, average and attempts
  - quiz stats are correct
  - reset scores clears only the target quiz and keeps its attempt
  - delete removes the quiz and its attempt
  - reset everything empties the state
  - rename rejects a blank name
  - adding the same file twice creates two quizzes with distinct question ids
  - quizzes sort by name with numbers in numeric order
  - an export contains questions and answer keys but no history or attempts
  - exporting then importing restores the same quizzes, names and questions
  - importing replaces all existing data, and an invalid file changes nothing
- **Schema tests.** The `zod` schema accepts the state produced by the app and rejects the kinds of invalid state the old `storage.js` rejected.
- **Build and lint.** `bun run build` succeeds and `bun run check` (Biome) is clean.
- **Manual pass in the browser:**
  - add the four example files in one go, plus one broken file, and rename one in the naming step
  - take a quiz that covers every format
  - reorder by mouse and with dnd-kit's keyboard controls
  - finish, self-assess, check that the history entry appears, retry missed, and check that the retry is tagged and not counted
  - leave one quiz unfinished, start another, then resume the first
  - rename, reset scores, delete and reset everything, each through its confirmation
  - export, reset everything, import the file, and confirm the quizzes return with their names and no scores
  - try importing a non-export file and confirm nothing changes
  - reload on `/quizzes/<id>/play`
  - use the browser's back button between routes
  - check the layout at about 400px wide

## Left to the builder

- The exact component breakdown and file names beyond what's listed above.
- How to translate the old CSS into Tailwind.
- The wording of new copy, in the old site's tone.
- Whether to remove the TanStack devtools from the scaffold.
- What the temporary phase 1 page looks like.
