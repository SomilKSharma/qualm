# RESEARCH.md — qualm Methodology

qualm operationalises the empirical findings of:

> Sharma, S. (2026). *Accessibility and Semantic Quality Regressions in AI-Assisted React Development: An Empirical Study.* arXiv preprint.

---

## Rule-to-Taxonomy Mapping

The paper defines three primary violation categories (Table 2, Table 5). qualm extends these to six rules, all of which are detectable via static AST analysis without a DOM runtime.

| qualm Rule ID         | Paper Category      | Paper β (Table 5) | Detection Method |
|-----------------------|---------------------|--------------------|------------------|
| `document-structure`  | `document_structure`| **+0.007** (dominant) | Interactive handler on generic container (`<div>`, `<span>`) without `role` |
| `landmark-structure`  | `document_structure`| **+0.007** (shared)   | Generic container with landmark-suggesting `className`/`id` |
| `aria-correctness`    | `aria_specific`     | +0.002             | Invalid string literal on boolean ARIA attribute |
| `interactive-semantics` | `semantic_naming` | −0.003             | Missing `alt` on `<img>`; icon-only button without `aria-label` |
| `heading-hierarchy`   | `document_structure`| —                  | Skipped heading level within component |
| `form-semantics`      | `semantic_naming`   | —                  | Form control without associated `<label>` or `aria-label` |

The paper's `semantic_naming` category has β = −0.003 (Table 5), indicating that AI adoption may slightly *improve* naming violations — possibly because AI tools generate boilerplate `aria-label` attributes. This is reflected in the lower β weight assigned to `interactive_semantics` and `form_semantics` in qualm's semantic score.

---

## Semantic Score Operationalisation

The paper reports AST-based semantic score as a key outcome variable (Section 3.6.2):

- **Treated PRE mean**: 0.989 (SD 0.022) — Table A1
- **Treated POST mean**: 0.983 (SD 0.027) — Table A1
- **DiD estimate**: β = +0.005, p = 0.075 (marginal significance)
- **Tobit-corrected**: β = +0.005, p = 0.092

qualm computes a file-level semantic score in [0, 1] using:

```
semanticScore = 1.0 - Σ_c [ (β_c / Σβ) × count_c × 0.05 ]
```

Where:
- `β_c` = paper β coefficient for category `c` (from Table 5)
- `count_c` = violation count in category `c`
- `0.05` = per-violation deduction constant, calibrated against paper baselines
- Result is clamped to [0.0, 1.0]

This formula weights violations by their empirically estimated contribution to semantic HTML degradation — `document_structure` violations (β = 0.007) deduct proportionally more than `aria_correctness` violations (β = 0.002).

---

## How `--diff-branch` Simulates the DiD Estimator

The paper uses a two-way fixed effects DiD design (Section 3.2):

```
y_{it} = α_i + γ_t + β·(Treated_i × Post_{it}) + X_{it}δ + ε_{it}
```

qualm's `--diff-branch` command simulates the "before/after" component of this estimator at the single-file level:

- **Before** = file content at the specified git branch (Pre-treatment)
- **After** = current working tree content (Post-treatment)
- **deltaSemanticScore** = after.semanticScore − before.semanticScore (analogous to β)
- **regressionDetected** = true when deltaSemanticScore < 0 OR new `document_structure`/`landmark_structure` violations appear

This is a per-file approximation — not a panel estimate — but it provides the same directional signal: has this code change *introduced* accessibility debt?

---

## β Coefficients and Semantic Score Weights

From Table 5 of the paper (DiD estimates by violation category):

| Category              | β (paper) | Normalised weight | 
|-----------------------|-----------|-------------------|
| `document_structure`  | +0.007    | 0.333             |
| `landmark_structure`  | +0.004    | 0.190             |
| `heading_hierarchy`   | +0.003    | 0.143             |
| `interactive_semantics` | +0.003  | 0.143             |
| `aria_correctness`    | +0.002    | 0.095             |
| `form_semantics`      | +0.002    | 0.095             |
| **Sum**               | **0.021** | **1.000**         |

The three categories without a direct paper estimate (`landmark_structure`, `heading_hierarchy`, `form_semantics`) use conservative values set between the two confirmed paper values (0.002–0.007). Researchers should update these with their own empirical estimates as replication data becomes available.

---

## Extending qualm with New Rules

1. Create `src/rules/your-rule.ts` implementing the `Rule` interface from `src/types.ts`
2. Export a single named constant: `export const yourRule: Rule = { ... }`
3. Add it to `activeRules` array in `src/rules/index.ts`
4. Choose an existing `ViolationCategory` or extend the type in `src/types.ts`
5. Add corresponding β to `PAPER_BETA_COEFFICIENTS` in `src/types.ts`
6. Write tests in `tests/rules/your-rule.test.ts`
7. Add fixture files in `tests/fixtures/`

Rule `create(context)` receives a `RuleContext` with:
- `context.report({ message, fixSuggestion, location, snippet? })` — emit a violation
- `context.getSourceCode(node)` — get source text for a node
- `context.getLoc(node)` — get `{ line, column, lineEnd, columnEnd }` for a node

Listeners are keyed by AST node type. Use `simpleTraverse` visitor keys:
- `JSXOpeningElement` — fires on `<Tag` opening
- `JSXElement` — fires on the full `<Tag>...</Tag>` (gives access to children)
- `JSXAttribute` — fires on each attribute
- `Program:exit` — fires after full traversal (use for post-collection checks)

---

## Known Limitations

1. **Single-file scope**: Rules operate within one file at a time. Cross-component prop drilling and component-tree accessibility errors (e.g. context-dependent ARIA relationships) are not detectable.

2. **No runtime DOM**: qualm is purely static. Runtime violations that only manifest after rendering (e.g. dynamic `aria-hidden` state, focus management) are outside scope. The paper (Section 3.6.1) notes 60.4% of component-snapshot pairs failed to render — qualm's static approach avoids this limitation entirely.

3. **JavaScript only**: qualm analyses JSX/TSX as written. Components using headless UI libraries (Radix, Ariakit, Chakra UI) that wrap semantic elements may score lower than their actual HTML output warrants — exactly the ambiguity noted in the paper's Appendix D.

4. **Form label matching is file-scoped**: `<label htmlFor="x">` and `<input id="x">` must appear in the same file for the association to be detected. Split across files → false positive.

5. **Single-rater construct validity**: The paper's AST score has Spearman ρ = 0.751 with expert ratings (Appendix D, N=53, single rater). qualm's semantic score inherits this validity ceiling and the single-rater limitation.

6. **β coefficients not replicated yet**: The paper's Table 5 estimates are from 74 repos across 2,374 repo-months. qualm uses these as calibration weights but they should be treated as priors pending independent replication.

---

## Citation

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
