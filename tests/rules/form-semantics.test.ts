import { readFileSync } from 'fs';
import { join } from 'path';
import { analyseFile } from '../../src/analyser';

const fixturesDir = join(__dirname, '../fixtures');

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('form-semantics rule', () => {
  it('detects violations in violating fixture', () => {
    const source = readFixture('form-semantics-violating.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'form-semantics');
    expect(violations.length).toBeGreaterThanOrEqual(3);
    expect(violations.every(v => v.category === 'form_semantics')).toBe(true);
    expect(violations.every(v => v.severity === 'error')).toBe(true);
  });

  it('reports no violations for compliant fixture', () => {
    const source = readFixture('form-semantics-compliant.tsx');
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'form-semantics');
    expect(violations.length).toBe(0);
  });

  it('compliant fixture has semantic score 1.0', () => {
    const result = analyseFile(readFixture('form-semantics-compliant.tsx'), 'test.tsx');
    expect(result.semanticScore).toBe(1.0);
  });

  it('flags input without id or aria-label', () => {
    const source = `
      import React from 'react';
      export const C = () => <input type="text" placeholder="Name" />;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'form-semantics');
    expect(violations.length).toBe(1);
  });

  it('flags input with id but no matching label', () => {
    const source = `
      import React from 'react';
      export const C = () => <input type="text" id="name" />;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'form-semantics');
    expect(violations.length).toBe(1);
    expect(violations[0].message).toContain('name');
  });

  it('does not flag input with aria-label', () => {
    const source = `
      import React from 'react';
      export const C = () => <input type="text" aria-label="Name" />;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'form-semantics');
    expect(violations.length).toBe(0);
  });

  it('does not flag input with matching htmlFor label', () => {
    const source = `
      import React from 'react';
      export const C = () => (
        <div>
          <label htmlFor="email">Email</label>
          <input type="email" id="email" />
        </div>
      );
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'form-semantics');
    expect(violations.length).toBe(0);
  });

  it('flags select without label', () => {
    const source = `
      import React from 'react';
      export const C = () => <select><option>A</option></select>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'form-semantics');
    expect(violations.length).toBe(1);
  });

  it('flags textarea without label', () => {
    const source = `
      import React from 'react';
      export const C = () => <textarea placeholder="Message" />;
    `;
    const result = analyseFile(source, 'test.tsx');
    const violations = result.violations.filter(v => v.ruleId === 'form-semantics');
    expect(violations.length).toBe(1);
  });
});
