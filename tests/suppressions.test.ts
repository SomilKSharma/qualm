import { analyseFile } from '../src/analyser';

/**
 * Suppression is an adoption requirement, not a nicety. A maintainer who hits
 * one false positive with no way to silence it declines the whole tool.
 */
describe('qualm-disable directives', () => {
  it('suppresses every rule on the next line', () => {
    const source = `
      export const C = () => (
        <div>
          {/* qualm-disable-next-line */}
          <img src="/a.png" />
        </div>
      );
    `;
    expect(analyseFile(source, 'test.tsx').violations).toHaveLength(0);
  });

  it('suppresses only the named rule', () => {
    const source = `
      export const C = () => (
        <div>
          {/* qualm-disable-next-line landmark-structure */}
          <div className="sidebar">x</div>
        </div>
      );
    `;
    expect(analyseFile(source, 'test.tsx').violations).toHaveLength(0);
  });

  it('does not suppress a different rule', () => {
    const source = `
      export const C = () => (
        <div>
          {/* qualm-disable-next-line document-structure */}
          <img src="/a.png" />
        </div>
      );
    `;
    const violations = analyseFile(source, 'test.tsx').violations;
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('interactive-semantics');
  });

  it('accepts several rule names in one directive', () => {
    const source = `
      export const C = () => (
        <div>
          {/* qualm-disable-next-line interactive-semantics, document-structure */}
          <img src="/a.png" />
        </div>
      );
    `;
    expect(analyseFile(source, 'test.tsx').violations).toHaveLength(0);
  });

  it('suppresses the whole file', () => {
    const source = `
      // qualm-disable-file
      export const C = () => (
        <div>
          <img src="/a.png" />
          <input type="text" />
          <div className="sidebar">x</div>
        </div>
      );
    `;
    expect(analyseFile(source, 'test.tsx').violations).toHaveLength(0);
  });

  it('suppresses one rule across the whole file', () => {
    const source = `
      // qualm-disable-file interactive-semantics
      export const C = () => (
        <div>
          <img src="/a.png" />
          <div className="sidebar">x</div>
        </div>
      );
    `;
    const violations = analyseFile(source, 'test.tsx').violations;
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('landmark-structure');
  });

  it('leaves unrelated lines alone', () => {
    const source = `
      export const C = () => (
        <div>
          {/* qualm-disable-next-line */}
          <img src="/a.png" />
          <img src="/b.png" />
        </div>
      );
    `;
    const violations = analyseFile(source, 'test.tsx').violations;
    expect(violations).toHaveLength(1);
    expect(violations[0].location.line).toBe(6);
  });

  it('a line comment directive works outside JSX', () => {
    const source = `
      export const C = () => {
        // qualm-disable-next-line
        const el = <img src="/a.png" />;
        return el;
      };
    `;
    expect(analyseFile(source, 'test.tsx').violations).toHaveLength(0);
  });
});
