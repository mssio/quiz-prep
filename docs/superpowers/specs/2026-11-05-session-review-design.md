# Past session review and light and dark mode: design

## Why

Quiz Prep shows the full answers only for a quiz's latest session, and starting a new session overwrites them. Score history keeps just the date, question count and score. The owner wants to go back through any past session and see everything: each question, what they answered, the correct answer and the explanation. The point is to learn from where they went wrong, long after the session ended.

The owner also wants light and dark mode. It's independent of session review, but ships with it. See "Light and dark mode".

## Goals

- Every finished session, including every "Retry missed" session, keeps its answers.
- Each row in a quiz's score history opens a read-only review of that session.
- Retries are grouped under the session they came from in the history list, and each keeps its own review.
- Export can include score history and saved answers, and import can restore them.
- Reset and delete erase saved answers too, and their warnings say so.
- The whole app works in light and dark mode.
- Every new or changed screen works on a phone.

## Non-goals

- **Mixed practice.** The owner has parked it for a future update.
- **AI features in the app.** No OpenRouter or other network calls. Explanations come only from the quiz file. `docs/question-conversion-instructions.md` and `docs/add-explanations-instructions.md` already cover how they get written.
- **A view across sessions**, such as "questions I keep getting wrong". The owner chose one session at a time.
- **A local database package.** See "Storage".
- **Sync between browsers or devices.** History stays in this browser, apart from export.
- **Merging an import** into existing quizzes. Import still replaces everything.
- **Recovering old sessions.** Answers that were never saved are gone.

## Anti-goals (failures even if the feature "works")

- An existing save fails to load after this ships. The owner would lose their quizzes and scores.
- Best, Average, Attempts or any recorded score changes.
- An existing export file stops importing.
- A review can be edited, or shows an answer the learner didn't give.
- Reset or delete leaves saved answers behind, or a warning understates what is lost.
- A damaged import file changes anything.
- Light mode noticeably changes from today's look.
- Dark mode has unreadable text, or a screen or state that was missed and stays bright.
- The page flashes the wrong theme on load.
- A new or changed screen needs sideways page scrolling on a phone, or has controls that can't be reached or tapped.

## The history list

The quiz page's score history stays one table. Sessions are newest first. Retries sit directly under the session they came from, indented, in the order they were taken, and are always visible. *(Order and always-visible are my call.)*

| Date | Questions | Score | |
| --- | --- | --- | --- |
| Nov 5, 1:32 PM | 20 of 40 | 85% | Review |
| ↳ Nov 5, 2:10 PM | 3 of 40 · Retry missed | 67% | Review |
| ↳ Nov 5, 2:25 PM | 1 of 40 · Retry missed | 100% | Review |
| Nov 3, 9:05 AM | 40 of 40 | 72.5% | Review |

- A retry of a retry groups under the original session, not under the retry before it.
- A row has a Review link only if its answers were saved.
- A retry whose original session isn't in the history shows as its own top-level row, sorted by its own date. This covers retries from before this feature and retries started after a score reset.
- Retries keep the existing "Retry missed" tag and bar colour.

## The past session page

A new route, `/quizzes/$quizId/sessions/$sessionId`. *(Route name is my call.)* An unknown session, or one with no saved answers, redirects to the quiz page.

- It shows a link back to the quiz, a heading with the session's date (saying "Retry" for a retry), and the score summary. *(Reusing `ResultHero` is my call.)*
- Every question is listed in the order the learner saw it, and **all are open when the page loads**. The owner chose this over folding correct answers. The learner can still collapse an item.
- Each question shows what the results screen shows: status, format, prompt, source, flag, your answer, correct or model answer, and explanation if there is one.
- Single-choice and multi-select questions also list **every option**, as the owner asked, so the learner can see what they passed over and explanations that mention a wrong option make sense. Each option is marked in words, not by colour alone, as "Your answer", "Correct", or both. Options appear in the quiz file's order, without letters, because the shuffled order isn't saved. *(File order and the markers are my call.)*
- The results screen gets the same option list, so the two screens match.
- It's read-only. It has no retry button, and short answers show their recorded assessment with no way to change it.
- A retry's page contains only the questions in that retry. The original session's page doesn't show retry answers.

## What gets saved

Each history entry gains two fields. *(Exact names and shape are the builder's.)*

- **Saved answers:** the order questions were shown in, responses, assessments and flags. `null` if not saved.
- **Retry link:** the id of the original session, `null` if it isn't a linked retry.

Questions themselves aren't copied. They're read from the quiz, because a quiz's questions never change after upload. The display order of options isn't saved, because the review lists them in file order.

The active attempt also needs the retry link, so it can reach the history entry. `retryMissed` sets it to the source attempt's own link, or the source attempt's id if it has none. That is what makes a retry of a retry point at the original.

Saved answers are written when the history entry is. The existing logic that updates an entry when a self-assessment changes must update the saved answers too. An attempt that is never finalized gets no entry, as today.

**Unscored sessions are the one exception to "every finished session".** A session where every question has an `unknown` answer has no percentage, so `historyEntryFor` records no entry, and that stays as it is. Such a session has no mistakes to review, and giving it a row would mean a nullable score across stats, the history table and import. *(My call.)*

**Existing data.** Both new fields must default when absent, so saves from before this feature load unchanged under the same `quiz-prep:v1` key and envelope `version: 1`. No migration step may be able to fail the load.

**Latest session backfill.** *(My call.)* A quiz's saved attempt is the one past session whose answers still exist. If it's finalized and has a matching history entry with no saved answers, copy its answers onto that entry, once, when the state loads. All older entries stay without a Review link. If that attempt is an old retry, it stays a top-level row, because nothing records where it came from.

## Storage

Stay on `localStorage`, decided after discussing a local database with the owner. IndexedDB's only gain would be space, and sessions are small: about 4–8 KB for 40 questions (an estimate), against a limit of about 5 MB. It's no safer, because clearing site data erases it too. Reconsider if the "could not be saved" warning appears or the saved data passes about 3 MB. The existing warning covers a full store, so no new handling is needed.

## Export and import

**Export.** When any quiz has history, Export opens a dialog with a checkbox, "Include score history", ticked by default. Its label or nearby copy should make clear this covers saved answers. With no history anywhere, Export downloads straight away as it does today. *(Ticked default and skipping the dialog are my call.)*

**Import.** The existing "Replace everything?" dialog shows the same checkbox, ticked by default, only when the file contains history. If unticked, or if the file has none, quizzes come in with no scores, as today. Import still replaces everything. The warning says so.

**File format.**

- History goes per quiz, as an optional field. Unfinished sessions and the latest attempt stay out of the file.
- Imported quizzes get new ids, and a question's id contains its quiz's id. The file must therefore refer to questions by question number, or the import must otherwise remap them. Saved answers must still work after import, including the retry links.
- Every existing export file must still import. Whether the format version changes is the builder's call.
- The whole file is validated before anything changes, including history. Saved answers that refer to a question the quiz doesn't have make the file damaged, with the existing message.
- Restored entries keep their dates and scores, and count towards stats exactly as they did.

## Reset and delete

The owner wants these to delete everything, with a warning. All three actions already confirm. Update the copy:

| Action | Copy |
| --- | --- |
| Reset scores | This clears the score history and saved answers for "NAME", including your latest results. This can't be undone. |
| Delete quiz | This removes "NAME", its score history, saved answers and any unfinished session. This can't be undone. |
| Reset everything | This removes every quiz, all score history and saved answers, and every unfinished session in this browser. This can't be undone. |
| Sidebar note | Deletes all quizzes, score history and saved answers in this browser. |

**Behaviour change for Reset scores.** Today it clears history but leaves the latest results reachable through "View results". To honour "delete everything", it must also clear a submitted attempt, including one still waiting for self-assessment. An unfinished session stays, because it isn't history, and its results are recorded normally when finished. *(Keeping the unfinished session is my call.)*

The import warning in `src/lib/import-copy.ts` should also mention saved answers.

## Light and dark mode

**The choice.** The learner picks **System**, **Light** or **Dark**. System is the default and follows the device, including if the device changes while the app is open. *(Offering System, and making it the default, is my call.)*

**The control.** A small labelled dropdown in the top bar, on every page. It must fit at phone width, and be usable by keyboard and screen reader. *(Placement and control type are my call.)*

**Saving the choice.** It's a device preference, not quiz data, so it has its own `localStorage` key, `quiz-prep:theme`. Export doesn't include it, import doesn't change it, and Reset everything keeps it. If storage is blocked, the app follows the device and the control still works until the page closes. *(My call.)*

**No flash.** The theme must be applied before the first paint, so a small inline script in `index.html` sets it. Open tabs follow a change made in another tab.

**How colours change.** The app has 109 hard-coded colour values across 23 files, plus `bg-white` and similar classes, so a theme can't simply be switched on. Every colour moves to a named token in `src/styles.css`. Light values are today's colours, and shades too close to tell apart may merge into one token. Dark mode overrides the same tokens under `:root[data-theme="dark"]`, so components don't need `dark:` classes.

**Look of dark mode.** A dark navy, in keeping with the brand, not pure black. The top bar stays navy in both modes, and the gold accent stays. *(My call.)*

**Everything is covered:** all screens including the new session page, dialogs and their backdrop, form fields, scrollbars and other native controls (through `color-scheme`), status badges, score bars, drag states on ordering questions, focus rings, KaTeX math, and the browser's `theme-color`.

**Readability.** In both modes, normal text has a contrast ratio of at least 4.5:1 against its background, checked by a test.

## Phone support

Every new or changed screen must work at **360px wide with no sideways page scroll**, in both themes. That covers the score history table, the past session page, the top bar with its theme control, and the export and import dialogs.

- **Score history table:** if four columns don't fit, the "Retry missed" tag moves under the question count, and Review stays reachable on every row. Retry rows keep a visible indent. *(Fallback is my call.)*
- **Past session page:** long answers, math, code and matching text wrap or scroll inside their own box, never the page.
- **Top bar:** the logo and theme control stay visible. The tagline already hides on small screens.
- **Tap targets:** new controls, including Review links and the checkbox, are at least 44px tall, matching the app's existing buttons. *(My call.)*

The app has no browser tests, so unit tests can't prove this. Each affected task checks it in a real browser at 360px, and the owner does one final check on a real phone.

## Unchanged

- Best, Average, Attempts and "Total attempts" still ignore retries.
- Self-assessment and the "Retry missed questions" button. The results screen changes only by gaining the option list.
- The Markdown format and the parser.
- `README.md` needs its "Grading and storage" and "Export and import" sections updated, because both describe behaviour this changes.

## Testing

Pure logic gets unit tests in the style of `tests/`. At minimum:

- A save from before this feature loads, with stats unchanged and no Review links beyond the backfilled one.
- Saved answers are written on finalize, and follow a later self-assessment change.
- Retry links, including a retry of a retry.
- Grouping and order, including a retry with no original in the history.
- Export and import round trip with history, then review still shows the right answers under new ids.
- Export without history, old files, and damaged history.
- Reset scores clears history, saved answers and a submitted attempt, but keeps an unfinished session.
- The past session page is read-only, opens everything, and redirects for an unknown session.
- The theme choice saves and loads, survives blocked storage, and resolves correctly for System.
- No raw colour values remain in components, and every text and background pair meets the contrast target in both modes.

## Left to the builder

Names, file layout, token names, exact dark colour values within the rules above, how the dialog gains a checkbox, the shape of the export data, and whether `ReviewItem` takes a read-only prop or is split. Follow the existing structure: pure logic in `src/lib/`, zod schemas as the source of types, components small and single-purpose.
