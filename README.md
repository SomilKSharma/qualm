# qualm

[![npm version](https://img.shields.io/npm/v/qualm-a11y.svg)](https://www.npmjs.com/package/qualm-a11y)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/SomilKSharma/qualm/actions/workflows/qualm-ci.yml/badge.svg)](https://github.com/SomilKSharma/qualm/actions)

**Static accessibility linter for React/TypeScript that catches regressions in CI.**

qualm reads the TypeScript AST and finds WCAG defects that are visible in component
*source* — semantic structure, keyboard affordances, ARIA usage. It never renders, so
it covers 100% of your components, including the ones a headless browser cannot mount.
Point it at a branch and it fails the build only on *new* defects.

```bash
npx qualm-a11y ./src --diff-branch main
```

## Why another a11y linter?

Use qualm *and* `eslint-plugin-jsx-a11y` — they answer different questions. jsx-a11y
has broader per-rule coverage and belongs in your editor, catching violations at the
keystroke. qualm adds four things it doesn't do:

| | qualm | eslint-plugin-jsx-a11y |
|---|---|---|
| **Regression gating** | `--diff-branch main` scores the *delta* and fails CI only on new defects | no |
| **SARIF output** | yes — GitHub Code Scanning, inline PR annotations | no |
| **Complexity metrics** | cyclomatic, cognitive, JSX nesting depth, prop drilling | no |
| **Per-file score** | severity-weighted score for ranking and triage | no |

The practical split: jsx-a11y stops new violations as you type; qualm stops a *branch*
from regressing and hands reviewers a ranked list.

Against runtime checkers like axe-core, the trade is explicit — qualm can't see
computed contrast or live focus order, and axe can't see a component that fails to
mount. In the corpus behind this tool, a headless pipeline failed to render 60.4% of
component snapshots.

## Install

```bash
npx qualm-a11y ./src          # no install
npm install -g qualm-a11y     # or globally
```

Node 18+.

## Usage

```
Usage: qualm [options] <paths...>

Arguments:
  paths                    Files or directories to analyse (.tsx, .ts, .jsx, .js)

Options:
  -f, --format <format>    Output format: terminal, json, sarif  (default: "terminal")
  -o, --output <file>      Write output to file instead of stdout
  --diff-branch <branch>   Compare against a git branch to detect regressions
  --fail-on <level>        Exit 1 if violations of this level exist: error, warning  (default: "error")
  --ignore <globs...>      Additional glob patterns to exclude
  --report                 Print a WCAG category breakdown across all analysed files
  -V, --version            Output version number
  -h, --help               Display help
```

`node_modules`, `dist`, `build`, `out`, `coverage`, `.next`, `.turbo`,
`storybook-static`, and `*.d.ts` are excluded by default.

Exit codes: `0` clean, `1` violations found (or a regression, with
`--diff-branch`), `2` a usage or environment error.

```bash
# One file
qualm-a11y src/components/Button.tsx

# Whole tree, JSON out
qualm-a11y src/ --format json --output results.json

# SARIF for GitHub Code Scanning
qualm-a11y src/ --format sarif --output results.sarif

# Fail only on defects this branch introduced
qualm-a11y src/ --diff-branch main

# Be stricter
qualm-a11y src/ --fail-on warning

# Exclude generated or vendored code
qualm-a11y src/ --ignore '**/*.stories.tsx' '**/generated/**'

# Category breakdown across the codebase
qualm-a11y src/ --report
```

## Rules

| Category | Severity | Detects | Example |
|---|---|---|---|
| `document_structure` | error | Interactive `<div>`/`<span>` with no semantic element or role | `<div onClick={fn}>` → use `<button>` |
| `interactive_semantics` | error | Missing `alt` on image; icon button with no label | `<img src="...">` with no `alt` |
| `aria_correctness` | error | Invalid boolean ARIA value | `aria-expanded="yes"` → `"true"` |
| `form_semantics` | error | Form control with no associated label | `<input id="x">` with no `<label htmlFor="x">` |
| `landmark_structure` | warning | Generic container with a landmark-suggesting class/id | `<div className="navbar">` → use `<nav>` |
| `heading_hierarchy` | warning | Skipped heading level | `<h1>` → `<h3>` with no `<h2>` |

Severity is WCAG user impact: an unreachable control or unlabelled input excludes a
user outright (error); a degraded outline makes navigation harder but not impossible
(warning).

**qualm reports defects; it does not attribute them.** A finding says *this code has an
accessibility defect worth fixing* — never who or what wrote it. There's a test
enforcing that, and [METHODOLOGY.md](METHODOLOGY.md) explains why it's load-bearing.

## Suppressing a finding

Rules are deliberately conservative, but no static rule is right every time.

```tsx
{/* qualm-disable-next-line */}
<div onClick={open}>Custom control</div>

{/* qualm-disable-next-line landmark-structure */}
<div className="sidebar">…</div>
```

```ts
// qualm-disable-file
// qualm-disable-file interactive-semantics
```

A bare directive silences every rule on that line; naming one or more rules
(comma- or space-separated) silences only those. `qualm-disable-file` applies to
the whole file.

## False positives

Rules stay quiet when a file cannot answer the question. An element that
forwards props (`<input {...props} />`) may receive its label from the consumer,
an expression value (`aria-expanded={isOpen}`) is unknowable statically, and a
button's accessible name may come from anywhere in its subtree. In each case
qualm says nothing rather than guessing.

The cost is real: qualm misses defects a renderer would catch. That trade is
deliberate — a linter that cries wolf on idiomatic React gets muted, and a muted
linter catches nothing at all. Running the current rules across a 1,497-file
production component library produces zero findings; the previous release
produced 172, every one of them a false positive.

## `--report` output

```
qualm — WCAG category breakdown

────────────────────────────────────────────────────────────────────────────────
Category                     | Violations   | Severity     | Weighted Score
────────────────────────────────────────────────────────────────────────────────
document_structure           | 3            | error        | 0.0500
landmark_structure           | 2            | warning      | 0.0190
heading_hierarchy            | 0            | warning      | 0.0000
interactive_semantics        | 1            | error        | 0.0143
aria_correctness             | 0            | error        | 0.0000
form_semantics               | 1            | error        | 0.0095
────────────────────────────────────────────────────────────────────────────────
Composite Regression Score   | 0.0928       | Baseline     | 0.9334
────────────────────────────────────────────────────────────────────────────────
```

The score is an **ordinal heuristic for ranking files within one qualm version** — it
shifts whenever a rule is added or removed. Use violation counts for decisions and the
score only for sorting. Full derivation in [METHODOLOGY.md](METHODOLOGY.md).

## GitHub Action

```yaml
# .github/workflows/qualm.yml
name: qualm accessibility check

on: [pull_request]

jobs:
  qualm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # needed for --diff-branch to resolve the base ref

      - uses: SomilKSharma/qualm@v2
        with:
          target-path: src/
          diff-branch: ${{ github.event.pull_request.base.ref }}
          fail-on: error
```

Or call the CLI directly, without the action:

```yaml
      - run: npx qualm-a11y src/ --diff-branch "$BASE_REF" --fail-on error
        env:
          BASE_REF: ${{ github.event.pull_request.base.ref }}
```

With SARIF upload to Code Scanning:

```yaml
- name: Run qualm (SARIF)
  run: npx qualm-a11y src/ --format sarif --output qualm.sarif || true

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: qualm.sarif
```

## Contributing

Each rule in `src/rules/` is a self-contained module. Adding one touches three files:

1. `src/rules/your-rule.ts` — implement the `Rule` interface
2. `src/rules/index.ts` — add it to `activeRules`
3. `src/types.ts` — add a severity weight to `CATEGORY_WEIGHTS` (2 = error, 1 = warning)

Plus tests and a compliant/violating fixture pair. The full extension guide, the AST
visitor keys, and the known limitations are in [METHODOLOGY.md](METHODOLOGY.md).

```bash
npm install
npm test
npm run build
```

## Related

[**react-a11y-analysis**](https://github.com/SomilKSharma/react-a11y-analysis) — the
measurement pipeline this tool's render-independent AST approach comes from, applied
to 446 React/TypeScript repositories over 13,702 repo-months. It has the dataset, the
analyzer, and the findings that shaped qualm's design decisions — including why
category weights are severity-based rather than impact-ranked.

## License

MIT © Somil Sharma
