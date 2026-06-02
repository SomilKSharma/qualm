import { readFileSync } from 'fs';
import { join } from 'path';
import { analyseFile } from '../../src/analyser';

const fixturesDir = join(__dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('heading-hierarchy rule', () => {
  it('detects violations in violating fixture', () => {
    const source = readFixture('heading-hierarchy-violating.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'heading-hierarchy');
    expect(violations.length).toBeGreaterThanOrEqual(2);
    expect(violations.every(v => v.category === 'heading_hierarchy')).toBe(true);
    expect(violations.every(v => v.severity === 'warning')).toBe(true);
  });

  it('reports no violations for compliant fixture', () => {
    const source = readFixture('heading-hierarchy-compliant.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'heading-hierarchy');
    expect(violations.length).toBe(0);
  });

  it('compliant fixture has semantic score 1.0', () => {
    const result = analyseFile(readFixture('heading-hierarchy-compliant.tsx'), 'test.tsx');
    expect(result.semanticScore).toBe(1.0);
  });

  it('violation message mentions skipped heading levels', () => {
    const source = readFixture('heading-hierarchy-violating.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'heading-hierarchy');
    expect(violations[0].message).toMatch(/h1.*h3|skipped/i);
  });

  it('does not flag single heading', () => {
    const source = `
      import React from 'react';
      export const C = () => <h1>Title</h1>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'heading-hierarchy');
    expect(violations.length).toBe(0);
  });

  it('does not flag h1 → h2 → h3', () => {
    const source = `
      import React from 'react';
      export const C = () => (
        <div>
          <h1>Title</h1>
          <h2>Section</h2>
          <h3>Subsection</h3>
        </div>
      );
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'heading-hierarchy');
    expect(violations.length).toBe(0);
  });

  it('flags h1 → h3 skip', () => {
    const source = `
      import React from 'react';
      export const C = () => (
        <div>
          <h1>Title</h1>
          <h3>Skip</h3>
        </div>
      );
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'heading-hierarchy');
    expect(violations.length).toBe(1);
    expect(violations[0].fixSuggestion).toContain('h2');
  });
});
