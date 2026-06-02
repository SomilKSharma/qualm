import { analyseFile } from '../../src/analyser';
import { QualmParserError } from '../../src/types';

describe('analyser', () => {
  it('returns a FileAnalysisResult with correct shape', () => {
    const source = `
      import React from 'react';
      export const C = () => <div>Hello</div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    expect(result).toHaveProperty('filePath', 'test.tsx');
    expect(result).toHaveProperty('violations');
    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('semanticScore');
    expect(Array.isArray(result.violations)).toBe(true);
  });

  it('semantic score is clamped to [0, 1]', () => {
    const source = `
      import React from 'react';
      export const C = () => (
        <div>
          <div onClick={() => {}} />
          <div onClick={() => {}} />
          <div onClick={() => {}} />
          <div onClick={() => {}} />
          <div onClick={() => {}} />
          <div onClick={() => {}} />
          <div onClick={() => {}} />
          <div onClick={() => {}} />
          <div onClick={() => {}} />
          <div onClick={() => {}} />
        </div>
      );
    `;
    const result = analyseFile(source, 'test.tsx');
    expect(result.semanticScore).toBeGreaterThanOrEqual(0);
    expect(result.semanticScore).toBeLessThanOrEqual(1);
  });

  it('throws QualmParserError for invalid syntax', () => {
    expect(() => analyseFile('const x = {{{ invalid', 'bad.tsx')).toThrow(QualmParserError);
  });

  it('violation has all required fields', () => {
    const source = `
      import React from 'react';
      export const C = () => <div onClick={() => {}}>Click</div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    const v = result.violations[0];
    expect(v).toHaveProperty('ruleId');
    expect(v).toHaveProperty('category');
    expect(v).toHaveProperty('severity');
    expect(v).toHaveProperty('message');
    expect(v).toHaveProperty('fixSuggestion');
    expect(v).toHaveProperty('location');
    expect(v.location).toHaveProperty('line');
    expect(v.location).toHaveProperty('column');
  });

  it('accumulates violations from multiple rules', () => {
    const source = `
      import React from 'react';
      export const C = () => (
        <div>
          <div onClick={() => {}}>Click</div>
          <img src="/foo.jpg" />
          <button aria-expanded="yes">Toggle</button>
        </div>
      );
    `;
    const result = analyseFile(source, 'test.tsx');
    const categories = new Set(result.violations.map(v => v.category));
    expect(categories.size).toBeGreaterThanOrEqual(2);
  });

  it('handles TSX with type annotations', () => {
    const source = `
      import React from 'react';
      interface Props { name: string; }
      export const C: React.FC<Props> = ({ name }) => <p>{name}</p>;
    `;
    expect(() => analyseFile(source, 'test.tsx')).not.toThrow();
  });

  it('handles files with no JSX', () => {
    const source = `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;
    const result = analyseFile(source, 'utils.ts');
    expect(result.violations).toEqual([]);
    expect(result.semanticScore).toBe(1.0);
  });
});
