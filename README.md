# Quiz Prep

Quiz Prep is a study app for practising quizzes written in Markdown. It runs entirely in your browser: you add Markdown files, each file becomes a quiz, and you take sessions of any size, with shuffled questions and choices. Everything is saved in this browser's local storage, and nothing is uploaded anywhere.

It includes score history for each quiz, review flags, a results review, self-assessment for short answers, "Retry missed" sessions, and export and import of quiz sets.

## Question format

Each question starts with `## Q<number>`, followed by `- **Format:**`, `- **Question:**` and `- **Answer:**` fields. An optional `- **Explanation:**` appears in the results. A file can have a level-one `#` title and a `- **Course:**` line. Question numbers must be unique within a file but can repeat across files.

| Format | Fields and answer |
| --- | --- |
| single-choice | Options use `  - A. Text`; the answer is one option letter |
| multi-select | Same options; the answer is comma-separated letters, at least two |
| true-false | The answer is `True` or `False` |
| fill-in-blank | Answers are numbered lines, one per blank; a prompt without blank markers is also supported |
| short-answer | The answer is model text, which the learner assesses after submitting |
| matching | Numbered Left items, lettered Right options; the answer looks like `1-B, 2-A` |
| ordering | Numbered Items; the answer lists each original item's target position, such as `2, 3, 1` |

Use the literal `unknown` for a missing answer key. Such questions are not scored. A file with errors is rejected as a whole, with question-specific messages, and the other files you added are still kept. Question text is shown as plain text, including fenced code, and is never run as HTML or JavaScript.

To have an AI chat convert existing questions into this format, see [docs/question-conversion-instructions.md](docs/question-conversion-instructions.md).

## Math

Question prompts, options, matching and ordering items, explanations, and correct or model answers on the results screen can contain LaTeX, shown with KaTeX. What you type into blanks and short answers stays plain text.

| Syntax | Result |
| --- | --- |
| `$...$` or `\(...\)` | Inline math |
| `$$...$$` or `\[...\]` | Display math, on its own line |
| `\$` | A literal dollar sign |

An opening `$` must be followed by a non-space, and a closing `$` must be preceded by a non-space and not followed by a digit. So dollar amounts such as `$62,400` and `$5 and $10` stay plain text. Math is not detected inside fenced code blocks or inline backtick spans. Plain words such as "mu" are not converted: write `$\mu$` for the symbol. Broken LaTeX shows as its source text instead of rejecting the file.

## Grading and storage

Each fully correct question is worth one point. Multiple selections, blanks, matches and ordering are all-or-nothing. Blank comparisons ignore case and extra spaces. Short answers with content need your own assessment after you submit. A finished attempt is added to the quiz's score history once, when it is submitted and has no assessments waiting. "Retry missed" attempts are tagged and do not count towards Best, Average or Attempts.

Progress is stored under `quiz-prep:v1` in this browser's local storage. It does not sync to other browsers or devices, and clearing site data removes it. If saving fails, a warning is shown and the session keeps working in memory.

## Export and import

- **Export** downloads `quiz-prep-export.json`, a JSON file with every quiz's name, filename, title, course, and questions with their answer keys. It has no score history and no unfinished sessions. Export is disabled when there are no quizzes.
- **Import** takes an export file and **replaces everything**: all quizzes, score history and unfinished sessions. Quiz names come from the file. The file is fully checked first; if it isn't a Quiz Prep export, or is damaged, a message is shown and nothing changes. A valid file asks for confirmation, saying what will be lost. Imported quizzes start with no scores.

## Commands

```bash
bun install
bun run dev        # development server on port 3000
bun run test       # unit tests
bun run typecheck  # TypeScript
bun run check      # Biome lint and format check
bun run build      # production build
```

## Hosting

The build is a static site, so any static host works. Because quiz pages have their own paths (for example `/quizzes/<id>`), configure the host to serve `index.html` for every path, so reloading or opening a deep link works.

Use HTTPS or `localhost` where you can. On plain http, for example a LAN address, the app still works: `crypto.randomUUID` is unavailable there, so quiz ids come from a fallback built on `crypto.getRandomValues`.
