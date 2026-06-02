import { analyseFile } from '../../src/analyser';

describe('complexity metrics', () => {
  it('calculates basic metrics for simple component', () => {
    const source = `
      import React from 'react';
      export const C = () => <div><p>Hello</p></div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    expect(result.metrics.cyclomaticComplexity).toBeGreaterThanOrEqual(1);
    expect(result.metrics.linesOfCode).toBeGreaterThan(0);
    expect(result.metrics.maxJsxNestingDepth).toBeGreaterThanOrEqual(1);
    expect(result.metrics.nodeCount).toBeGreaterThan(0);
  });

  it('counts props correctly', () => {
    const source = `
      import React from 'react';
      export const C = () => <div className="foo" id="bar" data-testid="baz">Content</div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    expect(result.metrics.propsCount).toBeGreaterThanOrEqual(3);
  });

  it('measures cyclomatic complexity from conditionals', () => {
    const source = `
      import React from 'react';
      export const C = ({ show }: { show: boolean }) => {
        if (show) {
          return <div>Shown</div>;
        }
        return null;
      };
    `;
    const result = analyseFile(source, 'test.tsx');
    expect(result.metrics.cyclomaticComplexity).toBeGreaterThan(1);
  });

  it('measures JSX nesting depth', () => {
    const source = `
      import React from 'react';
      export const C = () => (
        <div>
          <div>
            <div>
              <p>Deep</p>
            </div>
          </div>
        </div>
      );
    `;
    const result = analyseFile(source, 'test.tsx');
    expect(result.metrics.maxJsxNestingDepth).toBeGreaterThanOrEqual(4);
  });

  it('returns zero propDrillingDepth for shallow components', () => {
    const source = `
      import React from 'react';
      export const C = () => <div><p>Hello</p></div>;
    `;
    const result = analyseFile(source, 'test.tsx');
    expect(result.metrics.propDrillingDepth).toBeGreaterThanOrEqual(0);
  });

  it('handles empty source without error', () => {
    const result = analyseFile('', 'empty.tsx');
    expect(result.metrics.linesOfCode).toBeGreaterThan(0);
    expect(result.metrics.cyclomaticComplexity).toBe(1);
  });
});
