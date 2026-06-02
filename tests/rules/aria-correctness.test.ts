import { readFileSync } from 'fs';
import { join } from 'path';
import { analyseFile } from '../../src/analyser';

const fixturesDir = join(__dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('aria-correctness rule', () => {
  it('detects violations in violating fixture', () => {
    const source = readFixture('aria-correctness-violating.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'aria-correctness');
    expect(violations.length).toBeGreaterThanOrEqual(3);
    expect(violations.every(v => v.category === 'aria_correctness')).toBe(true);
    expect(violations.every(v => v.severity === 'error')).toBe(true);
  });

  it('reports no violations for compliant fixture', () => {
    const source = readFixture('aria-correctness-compliant.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'aria-correctness');
    expect(violations.length).toBe(0);
  });

  it('compliant fixture has semantic score 1.0', () => {
    const result = analyseFile(readFixture('aria-correctness-compliant.tsx'), 'test.tsx');
    expect(result.semanticScore).toBe(1.0);
  });

  it('flags aria-expanded with value "yes"', () => {
    const source = `
      import React from 'react';
      export const C = () => <button aria-expanded="yes">Open</button>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'aria-correctness');
    expect(violations.length).toBe(1);
    expect(violations[0].message).toContain('"yes"');
  });

  it('flags aria-hidden with value "1"', () => {
    const source = `
      import React from 'react';
      export const C = () => <div aria-hidden="1">Hidden</div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'aria-correctness');
    expect(violations.length).toBe(1);
  });

  it('does not flag non-boolean ARIA attrs', () => {
    const source = `
      import React from 'react';
      export const C = () => <div aria-label="Section">Content</div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'aria-correctness');
    expect(violations.length).toBe(0);
  });

  it('does not flag expression values for boolean ARIA attrs', () => {
    const source = `
      import React from 'react';
      export const C = ({ open }: { open: boolean }) => (
        <button aria-expanded={open}>Toggle</button>
      );
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'aria-correctness');
    expect(violations.length).toBe(0);
  });

  it('accepts "true" and "false" string literals', () => {
    const source = `
      import React from 'react';
      export const C = () => (
        <div>
          <button aria-expanded="true">A</button>
          <button aria-expanded="false">B</button>
        </div>
      );
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'aria-correctness');
    expect(violations.length).toBe(0);
  });
});
