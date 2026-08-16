# RESEARCH.md — qualm Methodology

qualm borrows its *measurement approach* — render-independent AST analysis of
React/TypeScript component source — from the study below. It does not inherit
that study's causal findings, because the finding is a null.

> Sharma, S. (2026). *No Detectable Accessibility Regression from AI Coding-Tool
> Adoption: A Bounded Null from 446 React/TypeScript Repositories under Staggered
> Difference-in-Differences.* Under review, Empirical Software Engineering
> (EMSE-D-26-00691). Replication package:
> [10.5281/zenodo.20994931](https://doi.org/10.5281/zenodo.20994931).
>
> Supersedes a 74-repository preprint,
> [10.5281/zenodo.20482307](https://doi.org/10.5281/zenodo.20482307), whose
> per-category estimates did not replicate and are not used anywhere in qualm.

## What the study found, and what it means for this tool

Across 446 repositories and 13,702 repo-months, AI-tool adoption shows **no
detectable effect** on source-level accessibility on any measured axis.
Equivalence (TOST) testing positively excludes effects larger than **±5% of
baseline** on the dense semantic-HTML and keyboard axes (±10–30% on the sparse
violation-density axes). Benjamini–Hochberg correction across the axis family
returns **q = 0.658 on every axis** (Table 5).

Three consequences, all load-bearing:

1. **qualm detects defects; it does not attribute them.** Every rule flags a
   genuine WCAG failure. None of them establishes that an AI tool introduced it.
   No rule message may claim otherwise — there is a test enforcing this
   (`tests/rules/document-structure.test.ts`).
2. **Category weights are severity-based, not effect-size-based**
   (`CATEGORY_WEIGHTS` in `src/types.ts`). Ranking categories by estimated causal
   magnitude is not defensible on the current evidence, and earlier versions of
   this document that did so were wrong.
3. **The theory-driven motivation still stands.** Language models optimise for
   functional plausibility, not the semantic meaning of HTML elements, so
   non-semantic container substitution is the failure such tools would be
   *expected* to produce, and the one runtime checks are weakest at catching
   (§7.2). The study states this explicitly as a hypothesis for a better-powered
   per-commit follow-up, **not as a finding**. That is the correct reason to lint
   for it: the defect is worth catching whatever caused it.

---

## Rule-to-Taxonomy Mapping

The study's WCAG-category mapping (Table 2) defines three violation buckets.
qualm extends these to six rules, all detectable by static AST analysis with no
DOM runtime. **No column of estimated effect size appears here, because no
category shows a significant effect.**

| qualm Rule ID | Study category | Severity | Detection method |
|---|---|---|---|
| `document-structure` | `document_structure` | error | Interactive handler on generic container (`<div>`, `<span>`) without `role` |
| `landmark-structure` | `document_structure` | warning | Generic container with landmark-suggesting `className`/`id` |
| `aria-correctness` | `aria_specific` | error | Invalid string literal on boolean ARIA attribute |
| `interactive-semantics` | `semantic_naming` | error | Missing `alt` on `<img>`; icon-only button without `aria-label` |
| `heading-hierarchy` | `document_structure` | warning | Skipped heading level within component |
| `form-semantics` | `semantic_naming` | error | Form control without associated `<label>` or `aria-label` |

Severity follows WCAG user impact: an unreachable control or an unlabelled input
excludes a user outright (error); a degraded document outline makes navigation
harder but not impossible (warning).

---

## Semantic Score Operationalisation

`semanticScore` is an **ordinal heuristic for ranking files within a single qualm
version.** It is *not* the construct-validated AST semantic score of the study
(§3.6.1) and its values are not comparable to anything in that paper.

```
semanticScore = 1.0 − Σ_c [ (w_c / Σw) × count_c × 0.05 ]
```

- `w_c` = **severity weight** for category `c` (error = 2, warning = 1)
- `count_c` = violation count in category `c`
- `0.05` = per-violation deduction, a **presentation constant**, not an estimate
- Result clamped to [0.0, 1.0]

Two caveats follow directly from the formula:

1. Weights are normalised by `Σw`, so **adding or removing a rule shifts every
   score** — values are not comparable across qualm versions.
2. Nothing in the constant is calibrated against published baselines. Use
   `violations` for decisions; use the score only for sorting.

### For reference: what the study actually reports on its own semantic axis

These are the study's numbers, on the study's instrument. They are recorded here
so nobody re-derives a weighting from them — they describe a null.

| Quantity | Value |
|---|---|
| Treated PRE mean (Table A1) | 0.9454 (SD 0.077) |
| Treated POST mean (Table A1) | 0.9409 (SD 0.091) |
| Control PRE / POST (Table A1) | 0.9447 (0.076) / 0.9490 (0.068) |
| TWFE ATT, matched panel (Table 4) | −0.0043, SE 0.0040, p = 0.285 (wild-cluster p = 0.357) |
| BJS imputation ATT (Table 4) | −0.0031 (−0.5% of baseline) |
| CRE Tobit latent β (Table 6b) | −0.0099, p = 0.271 |
| CRE Tobit APE (Table 6b) | −0.0065, p = 0.266 (−0.68% of baseline) |
| Equivalence bound (Table 4b) | ±5% of baseline, both panels |
| BH-adjusted q (Table 5) | 0.658 |

Every estimate is small, negative, and far from significance; 24.2% of
matched-panel observations sit at the score ceiling of 1.0, which is why the
censoring-aware Tobit re-estimation exists.

---

## How `--diff-branch` Works — and What It Is Not

`--diff-branch` compares a file at a git ref against the working tree:

- **Before** = file content at the specified branch
- **After** = current working tree content
- **deltaSemanticScore** = after − before
- **regressionDetected** = `deltaSemanticScore < 0` OR new
  `document_structure` / `landmark_structure` violations appear

**This is a lint, not an estimator, and the difference is not cosmetic.** It
compares before against after with **no control group**. The study measured
exactly what that costs: on synthetic panels with *no treatment effect injected*,
a pooled before/after test rejects a true null **up to 100% of the time** once a
common secular trend is present, while the same data analysed with a
treated-versus-control contrast holds its nominal 5% error rate (§6.1). On the
real panel, a pooled tail test reading p = 0.003 reversed to p = 0.933 under a
repo-clustered DiD (§6.4).

So read the output as: *this diff introduces accessibility defects worth fixing*.
Do not read it as an effect size, a β, or evidence that any tool or author caused
a regression. It is a gate, and a useful one — the same way a type error is
useful without being a causal claim.

---

## Extending qualm with New Rules

1. Create `src/rules/your-rule.ts` implementing the `Rule` interface from `src/types.ts`
2. Export a single named constant: `export const yourRule: Rule = { ... }`
3. Add it to the `activeRules` array in `src/rules/index.ts`
4. Choose an existing `ViolationCategory` or extend the type in `src/types.ts`
5. Add a severity weight to `CATEGORY_WEIGHTS` in `src/types.ts` (2 = error, 1 = warning)
6. Write tests in `tests/rules/your-rule.test.ts`
7. Add fixture files in `tests/fixtures/` (one compliant, one violating)

**Rule messages must describe the defect, not its cause.** Do not assert that AI
tooling, or any particular author or tool, produced a violation.

Rule `create(context)` receives a `RuleContext` with:

- `context.report({ message, fixSuggestion, location, snippet? })` — emit a violation
- `context.getSourceCode(node)` — source text for a node
- `context.getLoc(node)` — `{ line, column, lineEnd, columnEnd }`

Listeners are keyed by AST node type. Use `simpleTraverse` visitor keys:

- `JSXOpeningElement` — fires on `<Tag` opening
- `JSXElement` — fires on the full `<Tag>...</Tag>` (gives access to children)
- `JSXAttribute` — fires on each attribute
- `Program:exit` — fires after full traversal (post-collection checks)

---

## Known Limitations

1. **Single-file scope.** Rules operate within one file. Cross-component prop
   drilling and component-tree accessibility errors (e.g. context-dependent ARIA
   relationships) are not detectable.
2. **No runtime DOM.** qualm is purely static. Violations that only manifest
   after rendering — computed colour contrast, live focus order, dynamic
   `aria-hidden` state — are out of scope, as no static method can see them
   (§7.1). The trade is deliberate: 60.4% of component-snapshot pairs in the
   study failed to render under a headless pipeline (§3.6.1), so a
   render-independent instrument buys 100% coverage at the cost of runtime-only
   checks.
3. **Headless UI libraries.** Components built on Radix, Ariakit, or Chakra wrap
   semantic elements and may score lower than their rendered HTML warrants —
   the same ambiguity the study records for ~15% of its validation sample
   (Appendix D).
4. **Form label matching is file-scoped.** `<label htmlFor="x">` and
   `<input id="x">` must appear in the same file, or you get a false positive.
5. **Construct validity of the underlying metric — multi-rater.** The study's AST
   semantic score was validated against four React/TypeScript engineers on 53
   stratified components: Krippendorff's α = 0.870 (95% CI [0.776, 0.923]), and
   α = 0.880 (95% CI [0.787, 0.934]) recomputed on the three raters who are not
   the metric's designer. Per-rater Spearman ρ against the automated score is
   0.670–0.751 (pooled ρ = 0.733). Note this validates *the study's* instrument;
   qualm's `semanticScore` is a different, unvalidated heuristic (above).
6. **Category effect sizes did not replicate.** The 74-repo per-category
   estimates were never significant (p = 0.15–0.82), three of six weights were
   interpolated rather than measured, and the 446-repo follow-up returns a null
   on every WCAG category. They are not used as weights. Treat any per-category
   ranking as unevidenced.

---

## Citation

Cite the current study:

```bibtex
@misc{sharma2026boundednull,
  title     = {No Detectable Accessibility Regression from AI Coding-Tool
               Adoption: A Bounded Null from 446 React/TypeScript Repositories
               under Staggered Difference-in-Differences},
  author    = {Sharma, Somil},
  year      = {2026},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.20994931},
  note      = {Under review, Empirical Software Engineering. Independent
               Researcher, Gurugram, India},
  url       = {https://doi.org/10.5281/zenodo.20994931}
}
```
