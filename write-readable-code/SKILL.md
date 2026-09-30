---
name: write-readable-code
description: Enforces whitespace-forward, fully commented, hover-documented source code with cohesive files capped at 300 lines and clear responsibility-based folderization. Use whenever Codex creates, edits, refactors, migrates, or generates handwritten code in any language, including tests, scripts, components, services, and configuration formats that permit comments; also use when the user requests readable code, small files, documentation, comments, whitespace, or maintainable project structure.
---

# Write Readable Code

## Required outcome

Apply these rules to every handwritten code change.

Prioritize correctness, user requirements, repository rules, language grammar, and formatter constraints. Within those boundaries, treat this style as mandatory. Never silently relax a rule. Explain an unavoidable conflict before writing code, or during handoff when discovered by validation.

Do not edit generated, vendored, locked, or machine-owned files solely for styling. Apply the rules to their handwritten owners and adapters. Never insert comments into formats that forbid comments; use descriptive names and document the nearest commentable owner instead.

## Workflow

1. Read repository instructions and nearby code first.
2. Identify responsibilities, dependencies, and natural file boundaries.
3. Treat a module or feature as a folder, not one file.
4. Assign each planned file a working line budget.
5. Write file headers, function documentation, and step comments immediately.
6. Split responsibilities before any file reaches its budget.
7. Format and test using the repository's normal commands.
8. Inspect every changed file against the final checklist.
9. Run `scripts/check_readability.py` on new or substantially rewritten files.

Resolve the script path relative to this skill directory. Treat its checks as guardrails, not proof; manually verify documentation coverage and folder clarity.

## Comment every logical unit

Begin every handwritten source file with two or three short comment lines. Use the first line for the file's responsibility. Use the second line to justify why the file exists separately. Reserve an optional third line for an important boundary constraint. Place the header after a required shebang, license, encoding declaration, or language opener when syntax demands it.

Keep every physical comment line at ten words or fewer. This includes file headers, step comments, doc comments, tags, and continuation lines.

Cover code at three levels:

- Let the file header explain imports and top-level assembly.
- Document every declaration that owns behavior or shared data.
- Add one standalone comment immediately before every major step.
- Add at least one step comment inside every non-empty function body.
- Keep each major-step comment on exactly one line.

Use comments to explain intent, responsibility, sequencing, constraints, or non-obvious choices. Do not narrate punctuation or repeat the code. A logical block may share one comment; individual syntax lines do not each need comments.

## Document every function for editor hover

Use the language's recognized documentation syntax, such as JSDoc, Python docstrings, Rust doc comments, or XML documentation. Ensure VS Code's language tooling can display it on hover.

Document every function, method, constructor, hook, handler, callback, test, fixture factory, and local helper. Extract anonymous functions into named functions when their documentation cannot attach cleanly.

Include all of these elements:

- A short description.
- A distinct `Purpose` statement.
- Every input, using recognized parameter tags when available.
- The output, including explicit `None` or no-value output.
- Non-obvious side effects when present.

Never omit input documentation. When a function accepts no parameters, write `Inputs: None.` or the language's equally explicit hover-friendly form.

Describe meaning rather than repeating declared types. Keep blank lines between documentation sections for readable hover cards. Keep every documentation line within ten words.

Use this TypeScript shape:

```ts
/**
 * Builds account labels for shared presentation code.
 * Isolates fallback rules from interface components.
 */

/**
 * Builds a stable account label.
 *
 * Purpose: Centralize display-name fallback behavior.
 *
 * @param account Account fields used for labeling.
 * @returns Stable label for rendering.
 */
export function buildAccountLabel(account: Account): string {
  // Prefer the user-provided account name.
  if (account.name) return account.name;

  // Fall back to the stable account identifier.
  return account.id;
}
```

Adapt the syntax, not the information, for other languages.

## Keep files and folders navigable

Count physical lines, including comments and whitespace.

- Never create or fully rewrite a code file above 300 lines.
- Treat 300 lines as a hard ceiling, not a target.
- Budget new feature files around 180 lines before coding.
- Stop at 200 lines and default to splitting the responsibility.
- Aim for most feature files between 100 and 200 lines.
- Keep naturally cohesive smaller files; never pad files.

Count response-only code blocks too. Never return a code block presented as one file above 300 physical lines. Do not assume a requested "module" means one file; use a named folder containing cohesive files unless the user explicitly requires a single-file artifact.

Treat repeated major-step comments as extraction signals. When a function owns several independently named stages, move cohesive stages into documented helpers before the parent becomes difficult to scan.

For a pre-existing oversized file, avoid increasing its size. Extract the touched responsibility when that is safe and in scope. If a safe split requires a broader redesign, identify the conflict and request direction instead of silently worsening the file.

Split by responsibility, not arbitrary line ranges. Give each file one explainable job. Name files and folders for capabilities and roles, avoiding vague buckets such as `misc`, `helpers`, or oversized `utils` modules.

Keep strongly related files adjacent. Follow established architectural layers and colocate tests according to repository convention. Prefer a shallow, predictable folder tree whose names let a new teammate find behavior without searching globally.

## Validate before handoff

Run:

```bash
python3 <skill-directory>/scripts/check_readability.py <changed-file-or-directory> [...]
```

The checker reports:

- Files above 300 lines.
- Files above the 200-line split-review threshold.
- More than five consecutive line breaks.
- Under-spaced Python function and bootstrap boundaries.
- Standalone comment lines above ten words.
- File headers outside the required two-to-three lines.

For partially edited legacy files, run the checker when practical, then distinguish pre-existing findings from new ones. Never rewrite unrelated code only to silence the checker.

Complete this manual checklist:

- Every new logical unit has nearby intent documentation.
- Every function has description, purpose, inputs, and output.
- Every major function step has one short comment line.
- Every new file has a concise responsibility header.
- Every function boundary has at least three empty lines.
- Every top-level subject boundary has four empty lines.
- Relevant code remains adjacent.
- File and folder names reveal navigation paths.
- No created or rewritten file exceeds 300 lines.
- Every response-only file was physically line-counted.
- Formatting, tests, and repository checks pass.
