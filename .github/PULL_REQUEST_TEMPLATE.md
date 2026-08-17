## What this changes

<!-- One or two sentences. Why, not just what. -->

## Checklist

- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] New behaviour has tests
- [ ] `CHANGELOG.md` updated for user-facing changes

## If this adds or changes a rule

- [ ] Detection tests (it fires on the defect)
- [ ] False-positive tests in `tests/rules/false-positives.test.ts` covering
      utility class names, forwarded props, dynamic expressions, and nested content
- [ ] Run across a large real codebase; every finding read by hand

Rules stay silent when a single file cannot answer the question. A false
positive costs more than a missed defect, because it gets the tool removed from
CI entirely.

## If this changes messages

- [ ] Messages describe the defect, never who or what wrote it
