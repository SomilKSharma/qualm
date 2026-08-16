# METHODOLOGY

How qualm decides what counts as a defect, what its numbers do and do not mean, and
how to add a rule.

## The one rule about rules

**qualm reports defects. It does not attribute them.**

Every rule flags a genuine WCAG failure. No rule may claim that an AI tool, a
particular author, or any other agent introduced it — not in a message, not in a fix
suggestion, not in the docs. There is a test enforcing this in
`tests/rules/document-structure.test.ts`, and it should stay there.

This is not squeamishness. The measurement work that produced qualm's approach
([react-a11y-analysis](https://github.com/SomilKSharma/react-a11y-analysis)) looked
for exactly such an effect across 446 React/TypeScript repositories and found none —
tightly enough bounded to exclude effects larger than ±5% of baseline on the dense
axes. There is no measured effect to attribute anything to. A defect is worth fixing
regardless of what produced it, which is the only claim a linter needs.

## Why static analysis

qualm reads the TypeScript AST. It never renders.

That rules out an entire class of check — computed colour contrast, live focus order,
dynamically toggled `aria-hidden` — and buys one thing in exchange: it works on every
component. In the corpus the analysis pipeline measured, a headless-browser pipeline
failed to mount **60.4%** of component snapshots. Runtime checking is strictly better
on the components it can reach, and reaches roughly two in five.

Use both. Runtime tooling for what only exists at runtime; qualm for the structural
defects that are visible in source and that a browser-based check silently skips when
the component won't mount.

## Rules

Six rules, all decidable from a single file's AST with no DOM.

| Rule ID | Severity | Detects |
|---|---|---|
| `document-structure` | error | Interactive handler on a generic container (`<div>`, `<span>`) with no `role` |
| `interactive-semantics` | error | Missing `alt` on `<img>`; icon-only button with no `aria-label` |
| `aria-correctness` | error | Invalid string literal on a boolean ARIA attribute |
| `form-semantics` | error | Form control with no associated `<label>` or `aria-label` |
| `landmark-structure` | warning | Generic container with a landmark-suggesting `className`/`id` |
| `heading-hierarchy` | warning | Skipped heading level within a component |

Severity follows WCAG user impact, and the split is the obvious one: an unreachable
control or an unlabelled input excludes a user outright (**error**); a degraded
document outline makes navigation harder but not impossible (**warning**).

There is deliberately no column of estimated effect size here. Weighting categories by
measured impact magnitude was tried and abandoned — see `CATEGORY_WEIGHTS` in
`src/types.ts` for why.

## What `semanticScore` is

An **ordinal heuristic for ranking files within a single qualm version.** Nothing more.

```
semanticScore = 1.0 − Σ_c [ (w_c / Σw) × count_c × 0.05 ]
```

- `w_c` — severity weight for category `c` (error = 2, warning = 1)
- `count_c` — violation count in that category
- `0.05` — a per-violation deduction; a presentation constant, not a calibrated value
- clamped to [0.0, 1.0]

Two consequences fall straight out of the formula:

1. Weights are normalised by `Σw`, so **adding or removing a rule shifts every score.**
   Scores are not comparable across qualm versions.
2. Nothing in the constant is calibrated against anything.

**Use `violations` for decisions. Use the score only for sorting.** If you need a
number that means something in itself, count violations by severity.

## What `--diff-branch` is, and what it isn't

`--diff-branch` compares a file at a git ref against the working tree:

- **before** — file content at the named branch
- **after** — current working tree content
- **deltaSemanticScore** — after − before
- **regressionDetected** — `deltaSemanticScore < 0`, or new
  `document_structure` / `landmark_structure` violations appear

**It is a gate, not an estimator, and the difference is not cosmetic.** It compares
before against after with no control group, which is the exact shape of comparison
that manufactures false signal on real codebases. The analysis pipeline measured the
cost precisely: on synthetic panels with *no effect injected at all*, a pooled
before/after test rejects a true null **up to 100% of the time** once a common secular
trend is present, while the same data analysed with a treated-versus-control contrast
holds its nominal 5% rate. On real data, a pooled tail test reading p = 0.003 reversed
to p = 0.933 under a properly clustered contrast.

So read the output as: *this diff introduces accessibility defects worth fixing.* Not
as an effect size, and not as evidence that anything in particular caused a
regression. A type error is useful without being a causal claim, and so is this.

## Adding a rule

1. `src/rules/your-rule.ts` — implement the `Rule` interface from `src/types.ts`
2. Export one named constant: `export const yourRule: Rule = { ... }`
3. Add it to `activeRules` in `src/rules/index.ts`
4. Pick an existing `ViolationCategory`, or extend the type in `src/types.ts`
5. Add a severity weight to `CATEGORY_WEIGHTS` in `src/types.ts` (2 = error, 1 = warning)
6. Tests in `tests/rules/your-rule.test.ts`
7. Fixtures in `tests/fixtures/` — one compliant, one violating

Rule `create(context)` receives a `RuleContext`:

- `context.report({ message, fixSuggestion, location, snippet? })` — emit a violation
- `context.getSourceCode(node)` — source text for a node
- `context.getLoc(node)` — `{ line, column, lineEnd, columnEnd }`

Listeners are keyed by AST node type, using `simpleTraverse` visitor keys:

- `JSXOpeningElement` — fires on `<Tag`
- `JSXElement` — fires on the full `<Tag>...</Tag>`, so you get children
- `JSXAttribute` — fires per attribute
- `Program:exit` — after full traversal, for post-collection checks

And the constraint from the top of this file: **messages describe the defect, not its
cause.**

## Known limitations

1. **Single-file scope.** Rules see one file. Cross-component prop drilling and
   context-dependent ARIA relationships are not detectable.
2. **No runtime DOM.** Colour contrast, live focus order, and dynamic `aria-hidden`
   state are out of scope, by construction.
3. **Silence on anything undecidable.** An element that forwards props
   (`<input {...props} />`) may be labelled by its consumer; an expression value
   (`aria-expanded={isOpen}`) is unknowable before it runs. Rules report nothing
   in those cases, which under-reports on purpose. Precision is prioritised over
   recall because the failure modes are not symmetric: a missed defect costs one
   defect, while a false positive costs the tool its credibility and gets it
   removed from CI entirely.
4. **Headless UI libraries.** Components built on Radix, Ariakit, or Chakra wrap
   semantic elements qualm cannot follow through, and may score worse than their
   rendered output deserves. Roughly 15% of a hand-scored validation sample hit this
   ambiguity.
5. **Class-name heuristics match whole tokens only.** `landmark-structure` fires
   on `className="sidebar"` but not on `text-sidebar-foreground`,
   `@container/main`, or `[--header-height:0]`. Substring matching against
   utility CSS produced a false positive every time it fired, measured across a
   1,497-file codebase. The conservative rule misses `site-header`, and that is
   the intended trade.
6. **Form label matching is file-scoped.** `<label htmlFor="x">` and `<input id="x">`
   must live in the same file or you get a false positive.
7. **`semanticScore` is unvalidated.** The score described above is qualm's own
   heuristic. It is not a validated instrument and should not be treated as one.
8. **Per-category impact ranking is unevidenced.** Don't reintroduce effect-size
   weights without measurement to back them, and note that the measurement that
   exists found nothing to weight by.

Where a rule is wrong anyway, `qualm-disable-next-line` and `qualm-disable-file`
exist so a single false positive does not force a project to drop the tool. Their
presence is not a licence to relax the constraint above: a rule that needs
suppressing often is a rule that should be narrowed instead.

## Where this came from

The render-independent AST approach comes from
[react-a11y-analysis](https://github.com/SomilKSharma/react-a11y-analysis), a
measurement pipeline that applied it to 446 repositories over 13,702 repo-months.
qualm inherits the technique and none of the conclusions — deliberately, since the
conclusion there was a null.
