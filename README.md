# qualm-a11y

[![npm version](https://img.shields.io/npm/v/qualm-a11y.svg)](https://www.npmjs.com/package/qualm-a11y)
[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.20994931-blue)](https://doi.org/10.5281/zenodo.20994931)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/SomilKSharma/qualm/actions/workflows/qualm-ci.yml/badge.svg)](https://github.com/SomilKSharma/qualm/actions)

**Static AST-level accessibility linter for React/TypeScript.** Detects WCAG defects that are visible in component *source* — semantic structure, keyboard affordances, ARIA usage — without rendering, so it covers 100% of components including those a headless browser cannot mount.

qualm grew out of an empirical study of AI-assisted frontend development ([Sharma 2026](https://doi.org/10.5281/zenodo.20994931)), and uses the same render-independent AST approach. **It is a linter, not a causal instrument:** a qualm finding says *this code has an accessibility defect worth fixing*, never *an AI tool caused it*. See [Research background](#research-background) for why that distinction is load-bearing.

## Why not eslint-plugin-jsx-a11y?

Use both — they answer different questions. jsx-a11y has broader per-rule coverage and belongs in your editor. qualm adds four things it does not do:

| | qualm | eslint-plugin-jsx-a11y |
|---|---|---|
| **Regression detection** | `--diff-branch main` scores the *delta* and fails CI only on new defects | no |
| **SARIF output** | yes — GitHub Code Scanning, inline PR annotations | no |
| **Complexity metrics** | cyclomatic, cognitive, JSX nesting depth, prop drilling | no |
| **Per-file score** | ordinal severity-weighted score for ranking/triage | no |

The practical split: jsx-a11y to stop new violations at the keystroke, qualm in CI to stop a *branch* from regressing and to give reviewers a ranked list.

---

## Quick Start

```bash
# Run directly on a directory
npx qualm-a11y ./src

# Or install globally
npm install -g qualm-a11y
qualm-a11y ./src
```

---

## All CLI Flags

```
Usage: qualm [options] <paths...>

Arguments:
  paths                    Files or directories to analyse (.tsx, .ts, .jsx, .js)

Options:
  -f, --format <format>    Output format: terminal, json, sarif  (default: "terminal")
  -o, --output <file>      Write output to file instead of stdout
  --diff-branch <branch>   Compare against git branch to detect regressions
  --fail-on <level>        Exit 1 if violations of this level exist: error, warning  (default: "error")
  --research-mode          Output metrics in Sharma (2026) taxonomy format
  -V, --version            Output version number
  -h, --help               Display help
```

### Examples

```bash
# Analyse a single file
qualm-a11y src/components/Button.tsx

# Analyse entire src directory, JSON output
qualm-a11y src/ --format json --output results.json

# SARIF output for GitHub Code Scanning
qualm-a11y src/ --format sarif --output results.sarif

# Detect regressions vs main branch
qualm-a11y src/ --diff-branch main

# Fail CI on warnings too
qualm-a11y src/ --fail-on warning

# Research mode — Sharma (2026) taxonomy table
qualm-a11y src/ --research-mode
```

---

## Research background
<a name="research-background"></a>

This tool directly implements the measurement framework from:

**Sharma, S. (2026).** _Accessibility and Semantic Quality Regressions in AI-Assisted React Development: An Empirical Study._ Zenodo preprint, [10.5281/zenodo.20482307](https://doi.org/10.5281/zenodo.20482307).

That 74-repository study has since been superseded by a six-times-larger one:

**Sharma, S. (2026).** _No Detectable Accessibility Regression from AI Coding-Tool Adoption: A Bounded Null from 446 React/TypeScript Repositories under Staggered Difference-in-Differences._ Under review. Replication package: [10.5281/zenodo.20994931](https://doi.org/10.5281/zenodo.20994931).

**What the larger study found**: across 446 repositories and 13,702 repo-months, AI-tool adoption shows **no detectable effect** on source-level accessibility on any measured axis. Equivalence testing excludes effects larger than ±5% of baseline on the dense semantic-HTML and keyboard axes. No WCAG category shows an effect.

**What that means for qualm.** qualm is a *linter*, not a causal instrument, and the larger study is the reason the distinction matters:

- Violation categories are **not** weighted by estimated effect size. The earlier per-category coefficients were all statistically insignificant, and the larger study returns a null on every category. qualm weights by WCAG user impact instead (see `RESEARCH.md`).
- A qualm finding says *this code has an accessibility defect worth fixing*. It does **not** say *an AI tool caused it*. On present evidence there is no measured adoption effect to attribute anything to.
- The rules remain well-founded on their own terms: they detect real WCAG failures, independent of what caused them.

---

## Violation Categories

| Category                | β Weight  | Severity | Description                                                   | Example Violation                              |
| ----------------------- | --------- | -------- | ------------------------------------------------------------- | ---------------------------------------------- |
| `document_structure`    | **0.007** | error    | Interactive `<div>`/`<span>` without semantic element or role | `<div onClick={fn}>` → use `<button>`          |
| `landmark_structure`    | 0.004     | warning  | Generic container with landmark-suggesting class/id           | `<div className="navbar">` → use `<nav>`       |
| `heading_hierarchy`     | 0.003     | warning  | Skipped heading level                                         | `<h1>` → `<h3>` without `<h2>`                 |
| `interactive_semantics` | 0.003     | error    | Missing `alt` on image; icon button without label             | `<img src="...">` (no alt)                     |
| `aria_correctness`      | 0.002     | error    | Invalid boolean ARIA value                                    | `aria-expanded="yes"` → `"true"`               |
| `form_semantics`        | 0.002     | error    | Form control without associated label                         | `<input id="x">` with no `<label htmlFor="x">` |

---

## `--research-mode` Output

```
qualm-a11y Research Mode — Sharma (2026) Taxonomy

────────────────────────────────────────────────────────────────────────────────
Category                     | Violations   | β (paper)    | Weighted Score
────────────────────────────────────────────────────────────────────────────────
document_structure           | 3            | +0.007       | 0.0500
landmark_structure           | 2            | +0.004       | 0.0190
heading_hierarchy            | 0            | +0.003       | 0.0000
interactive_semantics        | 1            | +0.003       | 0.0143
aria_correctness             | 0            | +0.002       | 0.0000
form_semantics               | 1            | +0.002       | 0.0095
────────────────────────────────────────────────────────────────────────────────
Composite Regression Score   | 0.0928       | Baseline     | 0.9334
────────────────────────────────────────────────────────────────────────────────
Reference baseline (446-repo study, Table A1): treated-pre semantic score = 0.945, treated-post = 0.941
```

---

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
          fetch-depth: 0 # needed for --diff-branch

      - name: Run qualm
        run: npx qualm-a11y src/ --diff-branch main --fail-on error
```

For SARIF upload to GitHub Code Scanning:

```yaml
- name: Run qualm (SARIF)
  run: npx qualm-a11y src/ --format sarif --output qualm.sarif || true

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: qualm.sarif
```

---

## Contributing

qualm is explicitly designed for researcher extension. Each rule in `src/rules/` is a self-contained module — adding a new rule requires touching only three files:

1. `src/rules/your-rule.ts` — implement the `Rule` interface
2. `src/rules/index.ts` — add to `activeRules`
3. `src/types.ts` — add a severity weight to `CATEGORY_WEIGHTS` (2 = error, 1 = warning)

See [RESEARCH.md](RESEARCH.md) for the full extension guide, β coefficient derivation, and known limitations.

Researchers extending this tool are encouraged to:

- Add rules targeting violation types identified in replication studies
- Update β coefficients with your own DiD estimates
- Contribute fixtures from real AI-generated code samples

---

## Citation

If you use qualm in research, please cite the underlying empirical study:

```bibtex
@misc{sharma2026a11y,
  title     = {Accessibility and Semantic Quality Regressions in AI-Assisted React Development: An Empirical Study},
  author    = {Sharma, Somil},
  year      = {2026},
  month     = {May},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.20994931},
  note      = {Independent Researcher, Gurugram, India},
  url       = {https://doi.org/10.5281/zenodo.20994931}
}
```

---

## License

MIT © Somil Sharma
