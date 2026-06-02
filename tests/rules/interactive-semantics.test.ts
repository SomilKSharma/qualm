import { readFileSync } from 'fs';
import { join } from 'path';
import { analyseFile } from '../../src/analyser';

const fixturesDir = join(__dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('interactive-semantics rule', () => {
  it('detects missing alt on img in violating fixture', () => {
    const source = readFixture('interactive-semantics-violating.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'interactive-semantics');
    const imgViolations = violations.filter(v => v.message.includes('alt'));
    expect(imgViolations.length).toBeGreaterThanOrEqual(2);
  });

  it('detects icon-only button in violating fixture', () => {
    const source = readFixture('interactive-semantics-violating.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'interactive-semantics');
    const btnViolations = violations.filter(v => v.message.includes('aria-label'));
    expect(btnViolations.length).toBeGreaterThanOrEqual(1);
  });

  it('reports no violations for compliant fixture', () => {
    const source = readFixture('interactive-semantics-compliant.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'interactive-semantics');
    expect(violations.length).toBe(0);
  });

  it('compliant fixture has semantic score 1.0', () => {
    const result = analyseFile(readFixture('interactive-semantics-compliant.tsx'), 'test.tsx');
    expect(result.semanticScore).toBe(1.0);
  });

  it('flags img without alt', () => {
    const source = `
      import React from 'react';
      export const C = () => <img src="/photo.jpg" />;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'interactive-semantics');
    expect(violations.length).toBe(1);
    expect(violations[0].severity).toBe('error');
  });

  it('does not flag img with empty alt', () => {
    const source = `
      import React from 'react';
      export const C = () => <img src="/photo.jpg" alt="" />;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'interactive-semantics');
    expect(violations.length).toBe(0);
  });

  it('does not flag button with text content', () => {
    const source = `
      import React from 'react';
      export const C = () => <button>Click me</button>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'interactive-semantics');
    expect(violations.length).toBe(0);
  });

  it('does not flag empty button (no children)', () => {
    const source = `
      import React from 'react';
      export const C = () => <button />;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'interactive-semantics');
    // Empty self-closing button has no children — rule does not fire
    expect(violations.length).toBe(0);
  });
});
