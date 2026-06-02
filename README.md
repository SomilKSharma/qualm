# qualm

[![npm version](https://img.shields.io/npm/v/qualm.svg)](https://www.npmjs.com/package/qualm)
[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.20482307-blue)](https://doi.org/10.5281/zenodo.20482307)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/SomilKSharma/qualm/actions/workflows/qualm-ci.yml/badge.svg)](https://github.com/SomilKSharma/qualm/actions)

**Static AST-level quality analyser for LLM-generated React/TypeScript code.** Operationalises the empirical findings of [Sharma (2026)](https://doi.org/10.5281/zenodo.20482307) as a working static analyser.

> _AI coding tools do not produce an immediate, dramatic accessibility regression—but a slow accumulation effect, particularly in structural HTML semantics, warrants further investigation._
> — Sharma (2026), Abstract

qualm detects the violation patterns that the Sharma (2026) empirical study found most associated with AI-assisted code: generic containers substituted for semantic HTML, landmark elements rendered as divs, and structural HTML degradation that accumulates silently over months.

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
qualm src/components/Button.tsx

# Analyse entire src directory, JSON output
qualm src/ --format json --output results.json

# SARIF output for GitHub Code Scanning
qualm src/ --format sarif --output results.sarif

# Detect regressions vs main branch
qualm src/ --diff-branch main

# Fail CI on warnings too
qualm src/ --fail-on warning

# Research mode — Sharma (2026) taxonomy table
qualm src/ --research-mode
```

---

## Research Background

This tool directly implements the measurement framework from:

**Sharma, S. (2026).** _Accessibility and Semantic Quality Regressions in AI-Assisted React Development: An Empirical Study._ arXiv preprint.

**Study design**: Longitudinal difference-in-differences across 74 open-source React/TypeScript repositories (41 treated with AI tools, 33 matched controls), 2,374 repo-months.

**Key findings (Table 5 — DiD estimates by violation category):**

| Violation Category   | β (paper) | p-value | Interpretation                                   |
| -------------------- | --------- | ------- | ------------------------------------------------ |
| `document_structure` | +0.007    | 0.151   | Largest point estimate — dominant AI-gen failure |
| `aria_specific`      | +0.002    | 0.561   | Moderate ARIA degradation                        |
| `semantic_naming`    | −0.003    | 0.824   | AI may slightly improve naming visibility        |

**AST semantic score (Table A1):** Treated repos show treated-pre mean = 0.989, treated-post mean = 0.983, consistent with marginal but accumulating structural degradation (DiD β = +0.005, p = 0.075).

qualm's semantic score is computed using these β values as weights — `document_structure` violations deduct proportionally more than `aria_correctness` violations because the empirical evidence assigns them greater causal weight.

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
qualm Research Mode — Sharma (2026) Taxonomy

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
Paper baseline (Table A1): treated-pre AST score = 0.989, treated-post = 0.983
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
        run: npx qualm src/ --diff-branch main --fail-on error
```

For SARIF upload to GitHub Code Scanning:

```yaml
- name: Run qualm (SARIF)
  run: npx qualm src/ --format sarif --output qualm.sarif || true

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
3. `src/types.ts` — add β coefficient to `PAPER_BETA_COEFFICIENTS`

See [RESEARCH.md](RESEARCH.md) for the full extension guide, β coefficient derivation, and known limitations.

Researchers extending this tool are encouraged to:

- Add rules targeting violation types identified in replication studies
- Update β coefficients with your own DiD estimates
- Contribute fixtures from real AI-generated code samples

---

## Citation

If you use qualm in research, please cite the underlying empirical study:

```bibtex
@article{sharma2026qualm,
  title     = {Accessibility and Semantic Quality Regressions in AI-Assisted React Development: An Empirical Study},
  author    = {Sharma, Somil},
  year      = {2026},
  month     = {May},
  journal   = {arXiv preprint},
  note      = {Independent Researcher, Gurugram, India},
  url       = {https://doi.org/10.5281/zenodo.20482307}
}
```

---

## License

MIT © Somil Sharma
