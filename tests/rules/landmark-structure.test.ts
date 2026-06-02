import { readFileSync } from 'fs';
import { join } from 'path';
import { analyseFile } from '../../src/analyser';

const fixturesDir = join(__dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('landmark-structure rule', () => {
  it('detects violations in violating fixture', () => {
    const source = readFixture('landmark-structure-violating.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'landmark-structure');
    expect(violations.length).toBeGreaterThanOrEqual(3);
    expect(violations.every(v => v.category === 'landmark_structure')).toBe(true);
    expect(violations.every(v => v.severity === 'warning')).toBe(true);
  });

  it('reports no violations for compliant fixture', () => {
    const source = readFixture('landmark-structure-compliant.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'landmark-structure');
    expect(violations.length).toBe(0);
  });

  it('compliant fixture has semantic score 1.0', () => {
    const result = analyseFile(readFixture('landmark-structure-compliant.tsx'), 'test.tsx');
    expect(result.semanticScore).toBe(1.0);
  });

  it('detects navbar pattern', () => {
    const source = `
      import React from 'react';
      export const C = () => <div className="navbar">Nav</div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'landmark-structure');
    expect(violations.length).toBe(1);
    expect(violations[0].fixSuggestion).toContain('<nav>');
  });

  it('detects footer by className', () => {
    const source = `
      import React from 'react';
      export const C = () => <div className="footer">Footer</div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'landmark-structure');
    expect(violations.length).toBe(1);
    expect(violations[0].fixSuggestion).toContain('<footer>');
  });

  it('does not flag div with landmark-named id (scroll anchor false-positive)', () => {
    const source = `
      import React from 'react';
      export const C = () => <div id="footer">Footer</div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'landmark-structure');
    expect(violations.length).toBe(0);
  });

  it('does not flag div with unrelated className', () => {
    const source = `
      import React from 'react';
      export const C = () => <div className="card-component">Content</div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'landmark-structure');
    expect(violations.length).toBe(0);
  });

  it('does not flag semantic elements', () => {
    const source = `
      import React from 'react';
      export const C = () => <nav className="navbar">Nav</nav>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'landmark-structure');
    expect(violations.length).toBe(0);
  });
});
