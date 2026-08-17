# Contributing to qualm

## Setup

```bash
npm install
npm test
npm run build
npm run lint
```

Node 18 or later. CI runs the suite on 18, 20 and 22.

## The two rules that govern every change

**1. Precision over recall.** The failure modes are not symmetric. A missed
defect costs one defect. A false positive costs the tool its credibility, and a
linter that cries wolf on idiomatic React gets removed from CI, after which it
catches nothing at all.

So when a file cannot answer a question, the rule says nothing. An element
spreading `{...props}` may be labelled by its consumer; an expression value
(`aria-expanded={isOpen}`) is unknowable before it runs. Both are silence, not
a guess. Release 2.1.0 exists because the previous rules guessed: they produced
172 findings on a 1,497-file codebase and every one was wrong.

**2. qualm reports defects; it does not attribute them.** No rule may claim
that an AI tool, a particular author, or any other agent introduced a defect —
not in a message, not in a fix suggestion, not in the docs. A test enforces
this, and [METHODOLOGY.md](METHODOLOGY.md) explains why it is load-bearing.

## Adding a rule

1. `src/rules/your-rule.ts` — implement the `Rule` interface from `src/types.ts`
2. Export one named constant: `export const yourRule: Rule = { ... }`
3. Register it in `activeRules` in `src/rules/index.ts`
4. Pick an existing `ViolationCategory`, or extend the type in `src/types.ts`
5. Add a severity weight to `CATEGORY_WEIGHTS` (2 = error, 1 = warning)
6. Tests in `tests/rules/your-rule.test.ts`
7. Fixtures in `tests/fixtures/` — one compliant, one violating

Helpers for the common checks live in `src/rules/utils.ts` —
`hasSpreadAttribute`, `getStringAttributeValue`, `getElementName`. Use them
rather than re-deriving attribute access, so the precision rule above is applied
consistently.

Listeners are keyed by AST node type, using `simpleTraverse` visitor keys:

- `JSXOpeningElement` — fires on `<Tag`
- `JSXElement` — the full `<Tag>...</Tag>`, so you get children
- `JSXAttribute` — per attribute
- `Program:exit` — after traversal, for post-collection checks

## Every new rule needs false-positive tests

A detection test proves the rule fires. It does not prove the rule is usable.
Add cases to `tests/rules/false-positives.test.ts` covering the patterns real
codebases are full of: utility class names, forwarded props, dynamic values,
and content nested deeper than direct children.

Before proposing a rule, run it across a large real codebase and read every
finding. If any is spurious, narrow the rule rather than shipping it.

## Reporting a false positive

That is the most valuable bug report this project can receive. Open an issue
with the smallest snippet that reproduces it — see the false-positive issue
template.

## Pull requests

- `npm test` and `npm run lint` pass
- New behaviour has tests; end-to-end CLI behaviour goes in `tests/cli.test.ts`
- User-facing changes have a `CHANGELOG.md` entry under Unreleased
- Commit messages explain why, not just what
