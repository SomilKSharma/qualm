# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] — 2026-08-17

Audited against a 1,497-file production React codebase before recommending the
tool to anyone. It produced 172 findings, and every one was a false positive.
The same codebase now produces none, while all six rules still fire on genuine
defects.

### Fixed

- **`--diff-branch` never worked.** `git show <ref>:<path>` was given an
  absolute path, which git rejects. Every baseline lookup failed, so every file
  read as newly added and the gate fired on defects that were already in the
  baseline — the opposite of "fails the build only on new defects". Paths are
  now repository-relative.
- **Unresolvable refs failed silently.** A typo in a CI config read as "every
  file is new". The ref is now verified up front and exits `2` with guidance.
- **Shell injection via `--diff-branch`.** The branch name was interpolated into
  an `execSync` string. Replaced with `execFileSync` and an argument array.
- **`aria-correctness` rejected valid JSX.** `<span aria-hidden />` is shorthand
  for `{true}`, which React serialises correctly. It also now accepts the
  tristate values of `aria-checked`/`aria-pressed` and the token values of
  `aria-invalid`, and ignores dynamic expressions instead of guessing.
- **`landmark-structure` matched substrings.** `text-sidebar-foreground`,
  `@container/main` and `[--header-height:0]` all fired. Matching is
  whole-token, and an explicit `role` is now respected.
- **`form-semantics` and `interactive-semantics` judged forwarded props.** An
  element spreading `{...props}` may be labelled by its consumer; both stay
  silent. Hidden and submit inputs are exempt.
- **Button naming ignored nested text.** `<button><span>{label}</span></button>`
  was reported as icon-only; the accessible name is now sought across the whole
  subtree.
- **`document-structure` treated focus events as interaction.** A `div` with
  `onBlur` observes focus, it is not a control.
- **Diff mode clobbered `--output`.** One file's result was written per
  iteration, so only the last survived, and stdout received concatenated
  objects that no JSON parser accepts. One document per run now.
- **SARIF was unusable by Code Scanning.** It reported a hardcoded version
  `1.0.0` and absolute artifact URIs, leaving annotations unattached to files.
- **The GitHub Action could not run.** It declared `main: dist/cli.js` while
  `dist/` is gitignored, and the CLI reads argv rather than `INPUT_*`.
  Rewritten as a composite action.
- Large piped output could be truncated, because the process exited before
  stdout flushed.

### Added

- **Suppression directives.** `qualm-disable-next-line` and
  `qualm-disable-file`, each accepting an optional list of rule IDs.
- **`--ignore <globs...>`**, plus default exclusions for build output,
  coverage, `.next`, `.turbo`, `storybook-static` and `*.d.ts`.
- Validation of `--format` and `--fail-on`; both previously accepted anything
  and silently did something else.
- Documented exit codes: `0` clean, `1` findings, `2` usage or environment error.

### Changed

- Tests: 72 → 123, including end-to-end tests that launch the binary. Nothing
  in the previous suite ever executed the CLI, which is how four consecutive
  releases shipped unable to start.
- CI runs on `master` (it was configured for `main` and had never run), across
  Node 18, 20 and 22, and the CLI smoke test now fails the build instead of
  being swallowed by `|| true`.
- `npm run lint` works; `eslint` and `@typescript-eslint/eslint-plugin` were
  never dependencies.
- `cli.ts` is included in coverage.

## [2.0.1] — 2026-08-16

### Fixed

- **The published package could not start on any machine.** `chalk@^5` is
  ESM-only while the build emits CommonJS, so the compiled `require("chalk")`
  threw `ERR_REQUIRE_ESM` on every invocation. Pinned to `chalk@^4.1.2`.
- **`typescript` was a devDependency only.** `ts-api-utils` declares it as a
  peer, so installs resolved TypeScript 7, which no longer exposes the legacy
  compiler API; `typescript-estree` crashed on an undefined `SyntaxKind`. Moved
  to `dependencies`.

## [2.0.0] — 2026-08-16

### Changed

- Recast as a standalone linter, separate from the measurement pipeline in
  [react-a11y-analysis](https://github.com/SomilKSharma/react-a11y-analysis).

## [1.1.0]

### Changed

- Category weights are severity-based rather than estimated-effect-size based.
  The earlier weights were not distinguishable from zero and half were
  interpolated rather than measured.

[2.1.0]: https://github.com/SomilKSharma/qualm/releases/tag/v2.1.0
[2.0.1]: https://github.com/SomilKSharma/qualm/releases/tag/v2.0.1
[2.0.0]: https://github.com/SomilKSharma/qualm/releases/tag/v2.0.0
[1.1.0]: https://github.com/SomilKSharma/qualm/releases/tag/v1.1.0
