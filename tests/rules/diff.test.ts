import { diffFiles } from '../../src/diff';

const CLEAN_SOURCE = `
  import React from 'react';
  export const C = () => <div><p>Hello</p></div>;
`;

const VIOLATING_SOURCE = `
  import React from 'react';
  export const C = () => (
    <div>
      <div onClick={() => {}}>Click me</div>
      <img src="/logo.png" />
    </div>
  );
`;

describe('diffFiles', () => {
  it('returns correct shape', () => {
    const result = diffFiles(CLEAN_SOURCE, VIOLATING_SOURCE, 'test.tsx');
    expect(result).toHaveProperty('filePath', 'test.tsx');
    expect(result).toHaveProperty('before');
    expect(result).toHaveProperty('after');
    expect(result).toHaveProperty('deltaSemanticScore');
    expect(result).toHaveProperty('addedViolations');
    expect(result).toHaveProperty('removedViolations');
    expect(result).toHaveProperty('regressionDetected');
    expect(result).toHaveProperty('regressionCategories');
  });

  it('detects regression when violations are added', () => {
    const result = diffFiles(CLEAN_SOURCE, VIOLATING_SOURCE, 'test.tsx');
    expect(result.regressionDetected).toBe(true);
    expect(result.addedViolations.length).toBeGreaterThan(0);
  });

  it('detects no regression when going clean to clean', () => {
    const result = diffFiles(CLEAN_SOURCE, CLEAN_SOURCE, 'test.tsx');
    expect(result.addedViolations.length).toBe(0);
    expect(result.regressionDetected).toBe(false);
  });

  it('handles null beforeContent (new file)', () => {
    const result = diffFiles(null, VIOLATING_SOURCE, 'new.tsx');
    expect(result.before).toBeNull();
    expect(result.addedViolations.length).toBeGreaterThan(0);
    expect(result.regressionDetected).toBe(true);
    expect(result.deltaSemanticScore).toBe(0);
  });

  it('deltaSemanticScore is negative when regressions are introduced', () => {
    const result = diffFiles(CLEAN_SOURCE, VIOLATING_SOURCE, 'test.tsx');
    expect(result.deltaSemanticScore).toBeLessThan(0);
  });

  it('removedViolations are populated when code improves', () => {
    const result = diffFiles(VIOLATING_SOURCE, CLEAN_SOURCE, 'test.tsx');
    expect(result.removedViolations.length).toBeGreaterThan(0);
  });

  it('regression is false when violations are removed', () => {
    const result = diffFiles(VIOLATING_SOURCE, CLEAN_SOURCE, 'test.tsx');
    expect(result.regressionDetected).toBe(false);
  });

  it('regressionCategories includes document_structure for click-handler violations', () => {
    const result = diffFiles(CLEAN_SOURCE, VIOLATING_SOURCE, 'test.tsx');
    expect(result.regressionCategories).toContain('document_structure');
  });

  it('before/after counts match actual violations', () => {
    const result = diffFiles(CLEAN_SOURCE, VIOLATING_SOURCE, 'test.tsx');
    expect(result.before!.violationsCount).toBe(0);
    expect(result.after.violationsCount).toBeGreaterThan(0);
  });
});
