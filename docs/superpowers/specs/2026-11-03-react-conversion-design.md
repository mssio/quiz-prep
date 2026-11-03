# Quiz Workspace: React conversion — design

Date: 2026-11-03
Status: awaiting owner approval

## Intent

`.private/gpt-generated/` holds a working quiz site written by GPT as ~540 lines of dense, hand-built vanilla JavaScript (`dist/js/*.js`, `dist/styles.css`, `dist/index.html`). It works, but it is hard to read and hard to change.

The goal is to rebuild the same site inside this repo (Bun + Vite + React 19 + TanStack Router + Tailwind 4, already scaffolded) so that it is **easy to read and maintain**. This is a conversion, not a new product: same features, same behaviour, same look.

## Goals

- Every feature of the old site works the same way in the new one (see "Behaviour to preserve").
- Code is TypeScript, split into small files with one clear job each. A reader can find "how is matching graded?" or "what does the ordering question look like?" by file name.
- Pure logic (parsing, grading, attempt state, storage) is separate from React and covered by tests.
- The example question banks in `.private/example-input/` import successfully with the same question counts as today.

## Non-goals

- New features, new question formats, or changes to the Markdown format.
- A visual redesign.
- Accounts, syncing, a server, analytics, or any network request.
- Hosting setup or deployment. The owner decided the new site goes on a new host (not the old OpenAI Sites location) and hasn't picked one yet. Progress saved by the old site does not need to carry over.
- Matching the old ordering question's exact keyboard and tap interactions (see "Ordering question").

## Anti-goals (failure even if it "works")

- A question bank that imports today is rejected, or a question is graded differently.
- An invalid file that is rejected today is accepted.
- Imported text is rendered as HTML (it must stay plain text; React's default escaping gives this — never use `dangerouslySetInnerHTML`).
- The new code is as dense or clever as the old code. Readability is the point.

## Constraints

- Stack already in the repo: Vite 8, React 19, TanStack Router (file-based routes in `src/routes/`, generated `routeTree.gen.ts`), Tailwind 4, Biome, Bun. Import alias `#/*` → `src/*`.
- `.private/` is gitignored. Anything needed by tests (fixtures) must be copied into the repo.
- Client-only SPA. No SSR.

## Source material

| Old file | What it does | Lines |
|---|---|---|
| `dist/js/parser.js` | Parses the Markdown question format; SHA-256 file id; merges banks, detects duplicates | 117 |
| `dist/js/quiz.js` | Create attempt (random pick + shuffles), answer/flag/navigate/submit/assess, grading, summary, retry missed | 66 |
| `dist/js/storage.js` | Validate/save/load `localStorage` state; save-status wording | 56 |
| `dist/js/questions.js` | Renders each question format's inputs | 31 |
| `dist/js/ordering.js` | Ordering question: drag handles, tap-to-move, ↑/↓ keys, FLIP animation, reduced-motion | 188 |
| `dist/js/results.js` | Results hero, stats, review list, short-answer self-assessment | 34 |
| `dist/js/app.js` | Screen switching, library screen, quiz screen, confirm dialog, file import | 50 |
| `dist/styles.css` | All styling (~14 KB minified) | — |
| `tests/*.test.mjs` + `tests/fixtures/*.md` | `node --test` suites for parser, quiz, storage, review fixes | ~150 |

The old `README.md` documents the Markdown format, grading rules, and storage; it is the behavioural spec alongside the code.

## Decisions made

### Packages (decided in conversation)

The old site has **zero** dependencies. Hand-written parts are replaced only where a library clearly helps readability:

| Replace | With |
|---|---|
| `el()`/`button()` DOM builders + manual `render()` | React components |
| `ordering.js` drag/keyboard/animation code | `@dnd-kit/core` + `@dnd-kit/sortable` (+ `@dnd-kit/utilities`) |
| `storage.js` hand-written validation | `zod` schemas |
| `styles.css` | Tailwind classes |
| `node --test` | `vitest` |

Kept as hand-written code: the Markdown parser (it is specific to this format), the Fisher–Yates shuffle, `crypto.subtle` SHA-256, the native `<dialog>` for confirmations. No other packages.

### Routing (decided in conversation)

Use TanStack Router with three file routes, kept simple:

| Route | Screen | Guard |
|---|---|---|
| `/` | Library: import banks, list banks, choose question count, start / resume | none |
| `/quiz` | Active attempt | no attempt, or attempt already submitted → redirect to `/` (submitted → `/results`) |
| `/results` | Submitted attempt review | no submitted attempt → redirect to `/` |

No loaders, no search params. The current question index stays in the attempt state (as today), not in the URL.

Use normal browser history (clean `/quiz` paths; the owner chose a new host). Any static host needs a "serve `index.html` for every path" fallback so that refreshing `/quiz` works. The builder adds a short note about this to the README and doesn't set up any particular host.

### Ordering question (decided by the owner)

Use dnd-kit's standard interactions: drag by mouse or touch with a handle, and use dnd-kit's built-in keyboard sensor (Space to pick up, arrows to move, Space to drop, Escape to cancel) with its own screen-reader announcements. Drop the old direct ↑/↓/Home/End moves, the tap-one-then-tap-another move, the custom `aria-live` messages and the tilted drag ghost. Keep the parts that affect grading or meaning: the list starts in the shuffled display order; an untouched list counts as **unanswered**; a "Use this order" button records the current order as the answer, and any move records it too; show the position numbers. Respect `prefers-reduced-motion`.

## Behaviour to preserve

All of this exists in the old code and must carry over unchanged.

**Markdown format and parsing** — exactly as in `parser.js` and the old README: `## Q<n>` blocks; `- **Field:** value` lines; fenced code kept verbatim inside fields; BOM stripped and CRLF normalised; level-one `#` title (falls back to filename) and `**Course:**` metadata; the seven formats and their answer syntaxes; `unknown` answer → unscored question; whole file rejected on any error, with messages in the form `<filename>: Q<n>: <message>` (same wording); duplicate question numbers within a file rejected; identical normalised content imported once ("Already imported: …"); non-`.md` files rejected with "Choose a Markdown (.md) file."; question id = `<sha256>:<number>`; each question carries `sourceTitle`.

**Attempts** — pick `count` questions at random from the combined pool (1…pool size), shuffle question order and each question's choices (true/false, options, matching right column, ordering items); responses, flags, current index; submit locks answers; short-answer self-assessment only after submit; retry missed creates a new attempt from incorrect questions, only once the summary is finalised (no pending assessments). Starting a new attempt while one is active asks for confirmation. Finishing asks for confirmation showing unanswered and flagged counts.

**Grading** — one point per fully correct question; all-or-nothing for multi-select, blanks, matching, ordering; blank comparison ignores case and collapses whitespace; unanswered gradable → incorrect; short answer → pending until assessed; percentage only when finalised and there is at least one gradable question.

**Storage** — `localStorage` key `quiz-workspace:v1`, envelope `{version: 1, state: {databases, attempt}}`, same data shape. *(My call: keep the key and shape even though the site is moving to a new host and old saves won't be reachable. It costs nothing, and the old tests assume it.)* Questions may carry an optional `sourceTitle` string, so the schema must allow it. If `localStorage` is unavailable or a save fails, show the same warning and the "Not saved" wording (`storageStatus`) and keep working in memory. If saved data is invalid, show the "could not be restored" warning and start empty without overwriting the save until the next change.

**UI** — the same screens, copy, and controls as today: library (resume/view-results notice, bank list with remove, drop zone + file picker, import error list with "Remove rejected file", "Seven ways to practice" tags, session sidebar with question count input and validation, Start quiz disabled while import errors are shown); quiz (back link, "Question n of N", format tag, flag toggle, source line, answer inputs per format, Previous / Next / "Review & finish", sidebar with answered count, progress bar, question navigator grid showing answered/flagged/current, legend, save label); results (score disc, eyebrow/heading/copy variants, four stat boxes, retry/back actions, collapsible review list with your answer / correct or model answer / explanation, self-assessment buttons, pending items open by default). Accessibility details carry over: skip link, `aria-live` status on ordering, `aria-pressed` on toggles, `aria-current` on the current navigator button, focus moved to `<main>` and scroll to top on screen change, focus returned to the flag / assessment button after toggling, `prefers-reduced-motion` respected.

## Proposed structure (builder may adjust)

```
src/
  lib/                     # no React imports
    types.ts               # Question, QuestionBank, Attempt, Response types
    parser.ts              # parseBank(), mergeBanks()
    attempt.ts             # createAttempt(), updateAttempt(), retryMissed()
    grading.ts             # isAnswered(), gradeQuestion(), summarize()
    storage.ts             # zod schemas, loadState(), saveState(), storageStatus()
    shuffle.ts
    formats.ts             # format names / labels
  state/
    workspace.tsx          # React context + reducer wrapping lib/, persists on change
  components/
    questions/             # one component per format
      SingleChoice.tsx  MultiSelect.tsx  TrueFalse.tsx  FillInBlank.tsx
      ShortAnswer.tsx   Matching.tsx     Ordering.tsx
      QuestionView.tsx     # picks the right one
    ConfirmDialog.tsx  SaveWarning.tsx  ...
  routes/
    __root.tsx  index.tsx  quiz.tsx  results.tsx
tests/fixtures/            # copied from .private (gpt fixtures + example-input)
```

State: a single React context with a reducer is enough; no state library.

## Tests and definition of done

- Port all four old test files to Vitest against the new `lib/` modules. All of their assertions pass with LF fixtures (see the next item).
- Copy `.private/gpt-generated/tests/fixtures/*.md` into `tests/fixtures/` and `.private/example-input/*.md` into `tests/fixtures/examples/`. They need separate folders because both contain a `ch-1-test.md`. *(My call:)* convert all fixtures to LF line endings and pin that with `.gitattributes`. The old fixtures are CRLF, and that makes 3 of the old 32 tests fail today, because the tests do string replacements that assume `\n`. The parser's CRLF handling is already covered by a test that builds its own CRLF input. Add a test that the four example files import with: `ch-1-test.md` 10, `ch-2-test.md` 10, `ch-3-test.md` 7, `chapter-1-questions-x-100.md` 83 questions, no errors.
- Add a test that the new `zod` schema accepts a state built by the old code's logic and rejects the invalid cases the old `storage.js` rejected.
- `bun run build` succeeds, `bun run check` (Biome) is clean.
- Manual pass in the browser: import the example files, take a quiz touching every format, reorder by mouse and by dnd-kit keyboard, finish, self-assess, retry missed, reload mid-quiz and resume, back button between routes.

## Left to the builder

- Exact component breakdown and file names beyond the above.
- How to translate the old CSS into Tailwind (theme tokens in `src/styles.css` via `@theme` are fine).
- Whether to remove the TanStack devtools from the scaffold.
