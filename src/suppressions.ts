import { TSESTree } from '@typescript-eslint/utils';
import { Violation } from './types';

/**
 * Suppression directives, in the shape linters have taught people to expect:
 *
 *   {\/* qualm-disable-next-line *\/}                  — all rules, next line
 *   {\/* qualm-disable-next-line landmark-structure *\/} — one rule, next line
 *   \/\/ qualm-disable-file                             — all rules, whole file
 *
 * Without these a maintainer has no way to accept a pull request that carries
 * one false positive, which in practice means they decline the whole tool.
 */
export interface Suppressions {
  /** Whole file is suppressed (optionally only for the listed rules). */
  file: { all: boolean; ruleIds: Set<string> };
  /** line number -> rules suppressed on that line ('*' means every rule). */
  byLine: Map<number, Set<string>>;
}

const NEXT_LINE = /qualm-disable-next-line(.*)$/;
const WHOLE_FILE = /qualm-disable-file(.*)$/;

function parseRuleList(raw: string): Set<string> {
  return new Set(
    raw
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(Boolean)
  );
}

export function collectSuppressions(
  comments: TSESTree.Comment[] | undefined
): Suppressions {
  const suppressions: Suppressions = {
    file: { all: false, ruleIds: new Set() },
    byLine: new Map(),
  };

  if (!comments) return suppressions;

  for (const comment of comments) {
    const text = comment.value.trim();

    const fileMatch = WHOLE_FILE.exec(text);
    if (fileMatch) {
      const rules = parseRuleList(fileMatch[1] ?? '');
      if (rules.size === 0) {
        suppressions.file.all = true;
      } else {
        for (const r of rules) suppressions.file.ruleIds.add(r);
      }
      continue;
    }

    const lineMatch = NEXT_LINE.exec(text);
    if (lineMatch) {
      // The directive applies to the line after the comment ends, so a
      // multi-line block comment still targets the code beneath it.
      const target = comment.loc.end.line + 1;
      const rules = parseRuleList(lineMatch[1] ?? '');
      const existing = suppressions.byLine.get(target) ?? new Set<string>();
      if (rules.size === 0) {
        existing.add('*');
      } else {
        for (const r of rules) existing.add(r);
      }
      suppressions.byLine.set(target, existing);
    }
  }

  return suppressions;
}

export function isSuppressed(
  violation: Violation,
  suppressions: Suppressions
): boolean {
  if (suppressions.file.all) return true;
  if (suppressions.file.ruleIds.has(violation.ruleId)) return true;

  const onLine = suppressions.byLine.get(violation.location.line);
  if (!onLine) return false;

  return onLine.has('*') || onLine.has(violation.ruleId);
}
